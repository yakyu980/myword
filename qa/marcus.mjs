#!/usr/bin/env node
// ============================================================
// מרקוס וורד · סוכן QA אוטומטי ל-MyWord v2
// פותח את הקובץ בדפדפן אמיתי, מריץ תרחישי עומס, מצלם מסך,
// מאתר הפרות של חוקי הדף, ומדווח (קונסול + JSON + Supabase).
//
//   node marcus.mjs                          ריצה מלאה (headless)
//   node marcus.mjs --headed                 עם דפדפן גלוי (Edge)
//   node marcus.mjs --no-supabase            בלי לוגינג ענן
//   node marcus.mjs --only heavy-text,bold   תרחישים נבחרים
//   node marcus.mjs --suite home-ribbon      חבילה שלמה
//   חבילות: page-rules | home-ribbon | insert | zoom | keyboard | paste | storage
// ============================================================

import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { probeFn } from './lib/probe.mjs';
import { scenarios, HELPERS_SRC, bySuite, SUITES } from './lib/scenarios.mjs';
import { WORD_WISDOM, classify, classifyIssue } from './lib/knowledge.mjs';
import { buildFuzzRounds, FUZZ_APPLY } from './lib/fuzz.mjs';
import * as db from './lib/supabase.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'MyWord-v2.html');

// ---- ארגומנטים ----
const args = process.argv.slice(2);
const headed = args.includes('--headed');
const noSupabase = args.includes('--no-supabase');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1] || '')
      .split(',').map((s) => s.trim()).filter(Boolean)
  : null;

const suiteArg = args.find((a) => a.startsWith('--suite'));
const suiteFilter = suiteArg
  ? (suiteArg.includes('=') ? suiteArg.split('=')[1] : args[args.indexOf(suiteArg) + 1] || '')
  : null;

// ---- fuzz: שילובים רנדומליים (דגל נפרד) ----
const fuzzArg = args.find((a) => a.startsWith('--fuzz'));
const fuzzMode = !!fuzzArg;
const fuzzCount = fuzzArg && fuzzArg.includes('=') ? parseInt(fuzzArg.split('=')[1]) || 40 : 40;
const seedArg = args.find((a) => a.startsWith('--seed'));
const seed = seedArg
  ? parseInt(seedArg.includes('=') ? seedArg.split('=')[1] : args[args.indexOf(seedArg) + 1]) || Date.now()
  : (Date.now() >>> 0);

// טען .env ידנית (בלי תלות חיצונית)
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const SHOTS = path.join(__dirname, 'screenshots', RUN_ID);
const REPORTS = path.join(__dirname, 'reports');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(REPORTS, { recursive: true });

function appVersion() {
  const buf = fs.readFileSync(HTML);
  return crypto.createHash('md5').update(buf).digest('hex').slice(0, 10);
}

async function settle(page) {
  await page.evaluate(() => window.updatePagination && window.updatePagination());
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(120);
}

(async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  🕵️  מרקוס וורד — QA ל-MyWord v2              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('📄 קובץ:', HTML);
  console.log('🔖 גרסה:', appVersion());

  if (!fs.existsSync(HTML)) { console.error('❌ לא נמצא MyWord-v2.html'); process.exit(1); }

  // ---- אכיפת סנכרון מפרט הכפתורים ----
  try {
    const { loadButtonsFromHtml, loadSpecFromDisk } = await import('./lib/spec.mjs');
    const docIds = new Set(loadSpecFromDisk().map((d) => d.id));
    const undocumented = loadButtonsFromHtml().filter((b) => !docIds.has(b.id));
    if (undocumented.length) {
      console.log(`\n⚠️  ${undocumented.length} כפתורים לא מתועדים ב-BUTTONS-SPEC.md — הרץ \`node sync-buttons.mjs\`:`);
      undocumented.slice(0, 8).forEach((b) => console.log(`   · ${b.id} (${b.label || b.region})`));
    } else {
      console.log('✅ מפרט הכפתורים מסונכרן.');
    }
  } catch (e) { console.log('ℹ️  דילוג על בדיקת מפרט:', e.message); }

  if (!noSupabase) await db.initSupabase();

  // headed: משתמש ב-Edge המותקן עם האטה לצפייה; headless: Playwright chromium-headless-shell
  const browser = headed
    ? await chromium.launch({ headless: false, channel: 'msedge', slowMo: 400,
        args: ['--start-maximized', '--window-position=0,0'] })
    : await chromium.launch({ headless: true });
  const page = headed
    ? await browser.newPage()
    : await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
  await page.waitForSelector('#editor', { timeout: 15000 });
  await page.waitForTimeout(400); // אתחול האפליקציה

  const list = fuzzMode
    ? buildFuzzRounds(seed, fuzzCount)
    : only
      ? scenarios.filter((s) => only.includes(s.id))
      : suiteFilter
        ? bySuite(suiteFilter)
        : scenarios;
  if (fuzzMode) console.log(`🎲 מצב fuzz — ${fuzzCount} שילובים אקראיים · seed=${seed} (שחזור: --seed=${seed})`);
  const results = [];
  const allBugs = [];

  for (const sc of list) {
    process.stdout.write(`\n▶ ${sc.name}  [${sc.id}] … `);
    await page.evaluate(HELPERS_SRC);
    if (sc._fuzz) await page.evaluate(FUZZ_APPLY, sc._fuzz);
    else await page.evaluate(sc.setup);
    await settle(page);

    if (headed) await page.waitForTimeout(2500); // תן לצופה לראות את התוצאה
    const probe = await page.evaluate(probeFn, { tolCm: 0.12 });

    // צילום מסך של המסמך המלא
    const shot = path.join(SHOTS, `${sc.id}.png`);
    try {
      const el = await page.$('#editor');
      await el.screenshot({ path: shot });
    } catch { await page.screenshot({ path: shot }); }

    // הסקת באגים מהממצאים
    const bugs = [];
    for (const f of (probe.findings || [])) {
      const cls = classify(f);
      const wis = WORD_WISDOM[cls] || {};
      const tag = f.tag || f.objType || f.kind;
      bugs.push({
        fingerprint: `${sc.id}:${cls}:${tag}`.slice(0, 120),
        scenario: sc.id,
        severity: wis.severity || 'medium',
        rule: sc.rule,
        title: wis.title || cls,
        detail: `עמוד ${f.page} · ${f.topCm}–${f.bottomCm}cm · ${JSON.stringify(f.issues)}`,
        elementInfo: f,
        wordCompare: wis.word || null,
      });
    }
    for (const im of (probe.oversizeImgs || [])) {
      const wis = WORD_WISDOM['oversize-img'];
      bugs.push({
        fingerprint: `${sc.id}:oversize-img`,
        scenario: sc.id, severity: wis.severity, rule: sc.rule,
        title: wis.title, detail: `גובה ${im.heightCm}cm > 24.7cm`,
        elementInfo: im, wordCompare: wis.word,
      });
    }

    // ---- בדיקת assert (suite buttons): קיום/נראות/אייקון/אפקט ----
    if (typeof sc.assert === 'function') {
      let issues = [];
      try { issues = await page.evaluate(sc.assert, sc.assertArg) || []; }
      catch (e) { issues = [{ type: 'button-click-error', msg: `assert קרס: ${e.message}`, id: sc.id }]; }
      for (const iss of issues) {
        const cls = classifyIssue(iss);
        const wis = WORD_WISDOM[cls] || {};
        bugs.push({
          fingerprint: `${sc.id}:${iss.type}:${iss.id || ''}`.slice(0, 120),
          scenario: sc.id, severity: wis.severity || 'medium', rule: sc.rule,
          title: iss.msg || wis.title || cls,
          detail: iss.msg || '', elementInfo: iss, wordCompare: wis.word || null,
        });
      }
    }

    const expFail = sc.expectPages && probe.totalPages !== sc.expectPages;
    const passed = bugs.length === 0 && !expFail;
    if (expFail)
      bugs.push({ fingerprint: `${sc.id}:page-count`, scenario: sc.id, severity: 'medium',
        rule: sc.rule, title: `מספר עמודים צפוי ${sc.expectPages}, התקבל ${probe.totalPages}`,
        detail: '', elementInfo: { totalPages: probe.totalPages }, wordCompare: null });

    if (headed) await page.waitForTimeout(1500); // עצור לפני התרחיש הבא
    results.push({ id: sc.id, name: sc.name, passed, pages: probe.totalPages,
      findings: probe.findings?.length || 0, shot, bugs });
    allBugs.push(...bugs);
    console.log(passed ? `✅ עבר (${probe.totalPages} עמ')` : `❌ ${bugs.length} ממצאים (${probe.totalPages} עמ')`);
  }

  // אזהרת console נחשבת לבאג גלובלי
  if (consoleErrors.length) {
    console.log(`\n⚠️  ${consoleErrors.length} שגיאות console:`);
    consoleErrors.slice(0, 5).forEach((e) => console.log('   ·', e.slice(0, 120)));
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  // ---- דוח קונסול ----
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log(`│  סיכום: ${passed}/${results.length} עברו · ${allBugs.length} ממצאים · ${consoleErrors.length} שגיאות console`);
  console.log('└──────────────────────────────────────────────┘');
  // קיבוץ לפי fingerprint — שורה אחת לכל סוג ממצא (במקום עשרות כפילויות)
  const grouped = new Map();
  for (const b of allBugs) {
    const g = grouped.get(b.fingerprint) || { ...b, count: 0, pages: new Set() };
    g.count++;
    const m = (b.detail || '').match(/עמוד (\d+)/);
    if (m) g.pages.add(+m[1]);
    grouped.set(b.fingerprint, g);
  }
  for (const b of grouped.values()) {
    const icon = b.severity === 'high' ? '🔴' : b.severity === 'critical' ? '🟣' : b.severity === 'low' ? '🟢' : '🟡';
    const where = b.pages.size ? ` · עמודים: ${[...b.pages].sort((a, c) => a - c).join(', ')}` : '';
    console.log(`${icon} [${b.scenario}] ${b.title} (×${b.count}${where})`);
    if (b.wordCompare) console.log(`    💡 Word: ${b.wordCompare.slice(0, 170)}…`);
  }

  // ---- דוח JSON ----
  const reportPath = path.join(REPORTS, `${RUN_ID}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(
    { runId: RUN_ID, appVersion: appVersion(), pxPerCm: null, passed, failed,
      fuzz: fuzzMode ? { seed, count: fuzzCount } : null,
      consoleErrors, results, bugs: allBugs }, null, 2), 'utf8');
  console.log('\n📝 דוח JSON:', reportPath);
  console.log('🖼️  צילומי מסך:', SHOTS);

  // ---- Supabase ----
  const runId = noSupabase ? null : await db.createRun({ appVersion: appVersion(), extra: { onlyArg: only } });
  if (runId) {
    for (const b of allBugs) await db.upsertBug(runId, b);
    for (const r of results) await db.uploadScreenshot(runId, r.id, r.shot, r.passed);
    await db.finishRun(runId, { total: results.length, passed, failed,
      consoleErrors: consoleErrors.length,
      summary: `${passed}/${results.length} עברו, ${allBugs.length} ממצאים` });
    console.log('☁️  הועלה ל-Supabase · run', runId);
  }

  await browser.close();
  process.exit(failed > 0 || consoleErrors.length > 0 ? 1 : 0);
})().catch((e) => { console.error('💥 מרקוס קרס:', e); process.exit(2); });
