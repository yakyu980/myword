// lib/summer-db.mjs — שכבת Supabase של סאמר (המתקנת).
// אותו דפוס כמו lib/supabase.mjs: אם אין SUPABASE_URL/SUPABASE_KEY — no-op בשקט,
// כך שסאמר תמיד רצה גם בלי ענן (נופלת חזרה לקריאת reports/<runId>.json מקומי).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.join(__dirname, '..', 'reports');

let client = null;
let enabled = false;

export function isEnabled() { return enabled; }

export async function initSupabase({ silent = false } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    if (!silent) console.log('ℹ️  Supabase לא מוגדר — סאמר עובדת מקומית מול reports/.');
    return { enabled: false };
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url, key, { auth: { persistSession: false } });
    enabled = true;
    if (!silent) console.log('☁️  סאמר מחוברת ל-Supabase:', url.replace(/^https?:\/\//, '').split('.')[0]);
    return { enabled: true };
  } catch (e) {
    if (!silent) console.log('⚠️  @supabase/supabase-js לא מותקן — סאמר עובדת מקומית.', e.message);
    return { enabled: false };
  }
}

// ---- קריאת הדוח המקומי האחרון (גיבוי כשאין ענן) ----
export function latestReport() {
  if (!fs.existsSync(REPORTS)) return null;
  const files = fs.readdirSync(REPORTS).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) return null;
  const file = path.join(REPORTS, files[files.length - 1]);
  try { return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch { return null; }
}

// ---- באגים פתוחים: Supabase קודם, אחרת מהדוח המקומי ----
export async function listOpenBugs() {
  if (enabled) {
    const { data, error } = await client
      .from('qa_bugs')
      .select('id,fingerprint,scenario,severity,rule,title,detail,element_info,word_compare,status,last_seen')
      .neq('status', 'fixed')
      .neq('status', 'wontfix')
      .order('last_seen', { ascending: false });
    if (error) { console.log('⚠️  listOpenBugs:', error.message); return []; }
    return data || [];
  }
  const rep = latestReport();
  if (!rep) return [];
  // מהדוח המקומי אין שדה status — מחזירים את כל הבאגים מהריצה האחרונה
  return (rep.data.bugs || []).map((b) => ({
    id: null,
    fingerprint: b.fingerprint,
    scenario: b.scenario,
    severity: b.severity,
    rule: b.rule,
    title: b.title,
    detail: b.detail,
    element_info: b.elementInfo,
    word_compare: b.wordCompare,
    status: 'open',
    last_seen: rep.data.runId,
  }));
}

// ---- שיחה סאמר ↔ מרקוס ----
export async function postChat({ fingerprint = null, runId = null, sender, kind = 'note', message }) {
  if (!enabled) return null;
  const { data, error } = await client.from('summer_marcus_chat').insert({
    bug_fingerprint: fingerprint, run_id: runId, sender, kind, message,
  }).select('id').single();
  if (error) { console.log('⚠️  postChat:', error.message); return null; }
  return data?.id;
}

export async function chatThread(fingerprint) {
  if (!enabled) return [];
  const { data, error } = await client.from('summer_marcus_chat')
    .select('sender,kind,message,created_at')
    .eq('bug_fingerprint', fingerprint)
    .order('created_at', { ascending: true });
  if (error) { console.log('⚠️  chatThread:', error.message); return []; }
  return data || [];
}

// ---- תיעוד תיקון (upsert לפי fingerprint) ----
export async function recordFix(fix) {
  if (!enabled) return null;
  const { data: existing } = await client.from('summer_fixes')
    .select('id').eq('fingerprint', fix.fingerprint).limit(1).maybeSingle();
  const payload = {
    fingerprint: fix.fingerprint,
    bug_id: fix.bugId || null,
    scenario: fix.scenario || null,
    severity: fix.severity || null,
    what_broke: fix.whatBroke || null,
    root_cause: fix.rootCause || null,
    fix_summary: fix.fixSummary || null,
    code_location: fix.codeLocation || null,
    verified_by_marcus: !!fix.verifiedByMarcus,
    marcus_run_id: fix.marcusRunId || null,
    status: fix.status || 'applied',
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    await client.from('summer_fixes').update(payload).eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await client.from('summer_fixes').insert(payload).select('id').single();
  if (error) { console.log('⚠️  recordFix:', error.message); return null; }
  return data?.id;
}

// ---- סימון באג כמתוקן ב-qa_bugs ----
export async function markBugFixed(fingerprint, marcusRunId = null) {
  if (!enabled) return false;
  const { error } = await client.from('qa_bugs')
    .update({ status: 'fixed', last_seen: new Date().toISOString() })
    .eq('fingerprint', fingerprint);
  if (error) { console.log('⚠️  markBugFixed:', error.message); return false; }
  await recordFix({ fingerprint, marcusRunId, verifiedByMarcus: true, status: 'verified' });
  return true;
}

// ---- רישום לקח (upsert לפי fingerprint כדי לא לכפל) ----
export async function recordLesson(lesson) {
  if (!enabled) return null;
  const { data: existing } = await client.from('summer_lessons')
    .select('id').eq('fingerprint', lesson.fingerprint).limit(1).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await client.from('summer_lessons').insert({
    fingerprint: lesson.fingerprint,
    category: lesson.category || null,
    lesson: lesson.lesson,
    future_rule: lesson.futureRule || null,
    source_bug: lesson.sourceBug || null,
    applied_to_agent_md: !!lesson.appliedToAgentMd,
  }).select('id').single();
  if (error) { console.log('⚠️  recordLesson:', error.message); return null; }
  return data?.id;
}
