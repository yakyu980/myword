// lib/supabase.mjs — שכבת לוגינג ל-Supabase.
// אם אין מפתחות (SUPABASE_URL / SUPABASE_KEY) — עובד במצב no-op בשקט,
// כך שמרקוס תמיד רץ גם בלי חיבור ענן.

import fs from 'node:fs';
import path from 'node:path';

let client = null;
let enabled = false;

export function initSupabase({ silent = false } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    if (!silent) console.log('ℹ️  Supabase לא מוגדר (אין SUPABASE_URL/SUPABASE_KEY) — רץ מקומית בלבד.');
    return { enabled: false };
  }
  // import דינמי כדי שלא לקרוס אם החבילה לא הותקנה
  return import('@supabase/supabase-js')
    .then(({ createClient }) => {
      client = createClient(url, key, { auth: { persistSession: false } });
      enabled = true;
      console.log('☁️  מחובר ל-Supabase:', url.replace(/^https?:\/\//, '').split('.')[0]);
      return { enabled: true };
    })
    .catch((e) => {
      console.log('⚠️  @supabase/supabase-js לא מותקן — דלג על לוגינג ענן.', e.message);
      return { enabled: false };
    });
}

export async function createRun(meta) {
  if (!enabled) return null;
  const { data, error } = await client
    .from('qa_runs')
    .insert({
      app_version: meta.appVersion,
      px_per_cm: meta.pxPerCm,
      meta: meta.extra || {},
    })
    .select('id')
    .single();
  if (error) { console.log('⚠️  createRun:', error.message); return null; }
  return data.id;
}

export async function finishRun(runId, stats) {
  if (!enabled || !runId) return;
  const { error } = await client
    .from('qa_runs')
    .update({
      finished_at: new Date().toISOString(),
      total_tests: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      console_errors: stats.consoleErrors,
      summary: stats.summary,
    })
    .eq('id', runId);
  if (error) console.log('⚠️  finishRun:', error.message);
}

export async function upsertBug(runId, bug) {
  if (!enabled) return;
  // upsert לפי fingerprint — אם הבאג כבר נראה, מעדכן last_seen (מרקוס "זוכר")
  const { data: existing } = await client
    .from('qa_bugs')
    .select('id,status')
    .eq('fingerprint', bug.fingerprint)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await client.from('qa_bugs')
      .update({ last_seen: new Date().toISOString(), run_id: runId, detail: bug.detail, element_info: bug.elementInfo })
      .eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await client.from('qa_bugs').insert({
    run_id: runId,
    fingerprint: bug.fingerprint,
    scenario: bug.scenario,
    severity: bug.severity,
    rule: bug.rule,
    title: bug.title,
    detail: bug.detail,
    element_info: bug.elementInfo,
    word_compare: bug.wordCompare,
  }).select('id').single();
  if (error) { console.log('⚠️  upsertBug:', error.message); return null; }
  return data?.id;
}

export async function uploadScreenshot(runId, scenario, localPath, passed) {
  if (!enabled) return;
  let storagePath = null, publicUrl = null;
  try {
    const buf = fs.readFileSync(localPath);
    storagePath = `${runId}/${path.basename(localPath)}`;
    const up = await client.storage.from('qa-screenshots')
      .upload(storagePath, buf, { contentType: 'image/png', upsert: true });
    if (!up.error) {
      publicUrl = client.storage.from('qa-screenshots').getPublicUrl(storagePath).data.publicUrl;
    }
  } catch (e) { /* bucket אולי לא קיים — לא קריטי */ }

  await client.from('qa_screenshots').insert({
    run_id: runId, scenario,
    local_path: localPath, storage_path: storagePath, public_url: publicUrl,
    passed,
  });
}
