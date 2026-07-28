#!/usr/bin/env node
// ============================================================
// סאמר תיקונים · CLI דק למתקנת של MyWord v2
// סאמר (הסוכן) מריצה את הפקודות האלה מ-Bash כדי למשוך באגים,
// לתעד שיחה עם מרקוס, לרשום תיקונים/לקחים, ולסמן באג כמתוקן.
//
//   node summer.mjs --bugs
//       רשימת הבאגים הפתוחים (Supabase, אחרת מהדוח המקומי האחרון)
//   node summer.mjs --chat --from summer --kind question --fp <fp> --msg "..."
//       רישום הודעה בדיאלוג סאמר↔מרקוס
//   node summer.mjs --thread --fp <fp>
//       הצגת כל השיחה על באג מסוים
//   node summer.mjs --fix --fp <fp> --scenario <s> --severity high \
//        --root "..." --summary "..." --where "paginateBlocks()" [--status applied]
//       תיעוד תיקון
//   node summer.mjs --lesson --fp <slug> --cat ux --msg "..." --rule "..." [--source <bugFp>]
//       רישום לקח כללי
//   node summer.mjs --mark-fixed <fp> [--run <marcusRunId>]
//       סימון באג כמתוקן ב-qa_bugs + תיעוד תיקון מאומת
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sdb from './lib/summer-db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// טען מפתחות: קודם הקובץ של סאמר (.env.summer), ואז .env של מרקוס כגיבוי.
// ערך שכבר נטען (מהקובץ הקודם) לא נדרס — לכן ל-.env.summer יש קדימות.
(function loadEnv() {
  for (const name of ['.env.summer', '.env']) {
    const envPath = path.join(__dirname, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      const val = m && m[2].replace(/^["']|["']$/g, '');
      if (m && val && !process.env[m[1]]) process.env[m[1]] = val;
    }
  }
})();

const args = process.argv.slice(2);
function flag(name) { return args.includes('--' + name); }
function val(name, def = null) {
  const i = args.indexOf('--' + name);
  if (i === -1) return def;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : def;
}

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

(async () => {
  await sdb.initSupabase({ silent: flag('bugs') ? false : true });

  // --- רשימת באגים פתוחים ---
  if (flag('bugs')) {
    const bugs = await sdb.listOpenBugs();
    if (!bugs.length) { console.log('✅ אין באגים פתוחים.'); process.exitCode = 0; return; }
    bugs.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
    console.log(`\n📋 ${bugs.length} באגים פתוחים (לפי חומרה):\n`);
    for (const b of bugs) {
      const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[b.severity] || '⚪';
      console.log(`${icon} [${b.severity}] ${b.fingerprint}`);
      console.log(`   תרחיש: ${b.scenario}  ·  חוק: ${b.rule || '—'}`);
      console.log(`   ${b.title}`);
      if (b.detail) console.log(`   📍 ${b.detail}`);
      if (b.word_compare) console.log(`   💡 Word: ${b.word_compare}`);
      console.log('');
    }
    process.exitCode = 0; return;
  }

  // --- רישום הודעה בשיחה ---
  if (flag('chat')) {
    const id = await sdb.postChat({
      fingerprint: val('fp'), runId: val('run'),
      sender: val('from', 'summer'), kind: val('kind', 'note'), message: val('msg', ''),
    });
    console.log(id ? `💬 נרשם (${id}).` : 'ℹ️  לא נרשם (אין Supabase).');
    process.exitCode = 0; return;
  }

  // --- הצגת שיחה על באג ---
  if (flag('thread')) {
    const thread = await sdb.chatThread(val('fp'));
    if (!thread.length) { console.log('ℹ️  אין שיחה (או אין Supabase).'); process.exitCode = 0; return; }
    for (const m of thread) {
      const who = m.sender === 'marcus' ? '🕵️  מרקוס' : '🛠️  סאמר';
      console.log(`${who} [${m.kind}]: ${m.message}`);
    }
    process.exitCode = 0; return;
  }

  // --- תיעוד תיקון ---
  if (flag('fix')) {
    const id = await sdb.recordFix({
      fingerprint: val('fp'), scenario: val('scenario'), severity: val('severity'),
      whatBroke: val('broke'), rootCause: val('root'), fixSummary: val('summary'),
      codeLocation: val('where'), status: val('status', 'applied'),
    });
    console.log(id ? `📝 תיקון תועד (${id}).` : 'ℹ️  לא תועד (אין Supabase).');
    process.exitCode = 0; return;
  }

  // --- רישום לקח ---
  if (flag('lesson')) {
    const id = await sdb.recordLesson({
      fingerprint: val('fp'), category: val('cat'), lesson: val('msg', ''),
      futureRule: val('rule'), sourceBug: val('source'),
    });
    console.log(id ? `🎓 לקח נרשם (${id}).` : 'ℹ️  לא נרשם (אין Supabase).');
    process.exitCode = 0; return;
  }

  // --- סימון באג כמתוקן ---
  if (flag('mark-fixed')) {
    const fp = val('mark-fixed') || val('fp');
    if (!fp) { console.log('✗ חסר fingerprint.'); process.exitCode = 1; return; }
    const ok = await sdb.markBugFixed(fp, val('run'));
    console.log(ok ? `✅ ${fp} סומן כמתוקן ב-qa_bugs.` : 'ℹ️  לא עודכן (אין Supabase).');
    process.exitCode = 0; return;
  }

  console.log('שימוש: node summer.mjs --bugs | --chat | --thread | --fix | --lesson | --mark-fixed <fp>');
  process.exitCode = 0; return;
})();
