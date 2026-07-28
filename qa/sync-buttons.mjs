#!/usr/bin/env node
// sync-buttons.mjs — מסנכרן את docs/BUTTONS-SPEC.md מול הכפתורים האמיתיים ב-MyWord-v2.html.
//
//   node sync-buttons.mjs            כותב/מעדכן את ה-MD (מזריק סטאבים לכפתורים חדשים)
//   node sync-buttons.mjs --check    לא כותב; יוצא בקוד ≠0 אם יש כפתור לא-מתועד (לאכיפה)
//
// "כל כפתור חדש מתועד אוטומטית": ה-hook ב-.claude/settings.json מריץ את הסקריפט הזה
// בכל שמירה של MyWord-v2.html, וכך סטאב נוצר מיד.

import fs from 'node:fs';
import path from 'node:path';
import { extractButtons, parseSpec, HTML_PATH, SPEC_PATH } from './lib/spec.mjs';
import { knowledgeFor } from './lib/button-knowledge.mjs';
import { isExcluded, excludeReason } from './lib/test-exclude.mjs';

const check = process.argv.includes('--check');

if (!fs.existsSync(HTML_PATH)) { console.error('❌ לא נמצא MyWord-v2.html'); process.exit(2); }
const html = fs.readFileSync(HTML_PATH, 'utf8');
const buttons = extractButtons(html);

const specExists = fs.existsSync(SPEC_PATH);
const md = specExists ? fs.readFileSync(SPEC_PATH, 'utf8') : '';
const documented = parseSpec(md);
const docIds = new Set(documented.map((d) => d.id));
const codeIds = new Set(buttons.map((b) => b.id));

const newOnes = buttons.filter((b) => !docIds.has(b.id));
const stale = documented.filter((d) => !codeIds.has(d.id));

// ─── מצב בדיקה (לא כותב) ─────────────────────────────────────────────────────
if (check) {
  if (newOnes.length === 0 && stale.length === 0) {
    console.log(`✅ מפרט הכפתורים מסונכרן (${buttons.length} כפתורים, ${documented.length} מתועדים).`);
    process.exit(0);
  }
  if (newOnes.length) {
    console.log(`⚠️  ${newOnes.length} כפתורים לא מתועדים ב-BUTTONS-SPEC.md:`);
    newOnes.forEach((b) => console.log(`   · ${b.id}  (${b.label || b.title || b.region})`));
  }
  if (stale.length) {
    console.log(`⚠️  ${stale.length} ערכים במפרט שכבר לא קיימים בקוד:`);
    stale.forEach((d) => console.log(`   · ${d.id}`));
  }
  console.log('→ הרץ `node sync-buttons.mjs` (בלי --check) כדי לעדכן.');
  process.exit(1);
}

// ─── יצירת סטאב לכפתור ───────────────────────────────────────────────────────
function cleanEffect(eff) {
  if (!eff) return undefined;
  const e = { ...eff };
  // regex אינו שורד JSON → נשמר כמחרוזת source, ומשוחזר ב-assert.
  if (e.expectHtml instanceof RegExp) e.expectHtml = e.expectHtml.source;
  return e;
}

function payload(b) {
  const k = knowledgeFor(b);
  return JSON.stringify({
    id: b.id, selector: b.selector, suite: b.suite, icon: b.icon || undefined,
    needsIcon: b.needsIcon, complexity: b.complexity,
    hasDomId: b.hasDomId, dataCmd: b.dataCmd || undefined,
    effect: k && k.effect ? cleanEffect(k.effect) : undefined,
  });
}

const HEB_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

function stub(b) {
  const iconShow = b.icon ? '`' + b.icon + '`' : '⚠️ (אין אייקון)';
  const loc = regionLabel(b.region);
  const k = knowledgeFor(b);
  const excluded = isExcluded(b);
  const excludeLine = excluded ? [`- **בדיקות:** 🚫 מוחרג (${excludeReason(b)}) — מתועד אך לא נבדק.`] : [];
  const expected = k && k.expected && k.expected.length
    ? k.expected.map((line, i) => `  ${HEB_LETTERS[i] || (i + 1)}. ${line}`).join('\n')
    : '  א. TODO';
  return [
    `### \`${b.id}\` — ${b.label || b.title || '(ללא תווית)'}`,
    `- **מיקום:** ${loc}${b.selector ? '  ·  סלקטור `' + b.selector + '`' : '  ·  *(ללא id ב-DOM)*'}`,
    `- **אייקון:** ${iconShow}  ·  **מורכבות:** ${b.complexity}${b.needsIcon ? '  ·  חייב אייקון' : ''}`,
    ...excludeLine,
    `- **כותרת (title):** ${b.title || '—'}`,
    `- **מה עושה:** ${k ? k.does : 'TODO'}`,
    `- **תוצאה צפויה:**`,
    expected,
    `- **גבולות:** ${k && k.limits ? k.limits : 'TODO'}`,
    `- **איך Word:** ${k && k.word ? k.word : 'TODO'}`,
    `- **Edge:** ${k && k.edge ? k.edge : 'TODO'}`,
    `<!-- marcus: ${payload(b)} -->`,
    '',
  ].join('\n');
}

function regionLabel(r) {
  return ({
    'ribbon:home': 'סרגל הבית', 'ribbon:insert': 'סרגל ההוספה', 'ribbon:file': 'סרגל הקובץ',
    'סרגל-צף': 'הסרגל הצף (#ctxBar)', 'שורת-סטטוס': 'שורת הסטטוס (זום)',
    'תפריט-ימני': 'תפריט קליק-ימני', 'אזור-עמודים': 'אזור העמודים', 'dialog/other': 'דיאלוג / אחר',
  })[r] || r;
}

// ─── יצירה ראשונה: שלד מלא מקובץ לפי אזור ────────────────────────────────────
function buildFreshSpec() {
  const groups = new Map();
  for (const b of buttons) {
    const k = regionLabel(b.region);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  const head = [
    '# 🔘 BUTTONS-SPEC — מפרט הכפתורים של MyWord v2',
    '',
    '> מקור-האמת לכל כפתור: מה הוא עושה, מה הפלט הצפוי (א/ב/ג), הגבולות, ואיך Word פותר.',
    '> **מתעדכן אוטומטית** — `node qa/sync-buttons.mjs` (וגם hook על שמירת `MyWord-v2.html`)',
    '> מזריק סטאב לכל כפתור חדש. מרקוס קורא קובץ זה כדי לבדוק כל כפתור (`--suite buttons`).',
    '>',
    '> **אל תמחק** את שורות `<!-- marcus: {…} -->` — הן ה-payload שמרקוס מפענח.',
    '',
    `סה"כ כפתורים: **${buttons.length}**`,
    '',
    '---',
    '',
  ].join('\n');

  let body = '';
  for (const [group, items] of groups) {
    body += `## ${group}\n\n`;
    for (const b of items) body += stub(b) + '\n';
    body += '---\n\n';
  }
  return head + body;
}

// ─── עדכון קובץ קיים: הוספת סטאבים בסוף + סימון STALE ─────────────────────────
function appendStubs(existing) {
  let result = existing;

  if (stale.length) {
    for (const d of stale) {
      // מסמן בלוק ישן כ-STALE (לפני הכותרת שלו) אם עוד לא מסומן
      const re = new RegExp(`(### \`${d.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\`)`);
      if (re.test(result) && !new RegExp(`STALE.*${d.id}`).test(result)) {
        result = result.replace(re, `> ⚠️ STALE — הכפתור \`${d.id}\` לא קיים יותר בקוד.\n$1`);
      }
    }
  }

  if (newOnes.length) {
    const marker = '\n## 🆕 כפתורים חדשים (TODO — מולאו אוטומטית)\n\n';
    let block = result.includes(marker.trim()) ? '' : marker;
    for (const b of newOnes) block += stub(b) + '\n';
    result = result.replace(/\s*$/, '\n') + block;
  }
  return result;
}

const outMd = specExists ? appendStubs(md) : buildFreshSpec();

if (outMd === md) {
  console.log(`✅ אין שינוי — ${buttons.length} כפתורים, הכול מסונכרן.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(SPEC_PATH), { recursive: true });
fs.writeFileSync(SPEC_PATH, outMd, 'utf8');
console.log(specExists
  ? `📝 עודכן BUTTONS-SPEC.md — נוספו ${newOnes.length} סטאבים${stale.length ? `, סומנו ${stale.length} STALE` : ''}.`
  : `📝 נוצר BUTTONS-SPEC.md עם ${buttons.length} כפתורים.`);
