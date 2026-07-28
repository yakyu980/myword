// lib/spec.mjs — מקור-האמת של הכפתורים.
// שתי יכולות:
//   1. extractButtons(html)  — מחלץ כל <button> מ-MyWord-v2.html (גם בתוך מחרוזות JS).
//   2. parseSpec(md)         — מפענח את docs/BUTTONS-SPEC.md חזרה למבנה JS (לפי בלוקי <!-- marcus: {…} -->).
// שני הצדדים מדברים אותה שפה → sync-buttons.mjs ומרקוס משתמשים בשניהם.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HTML_PATH = path.resolve(__dirname, '..', '..', 'MyWord-v2.html');
export const SPEC_PATH = path.resolve(__dirname, '..', '..', 'docs', 'BUTTONS-SPEC.md');

// ─── עוזרים ─────────────────────────────────────────────────────────────────
function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))
        || attrs.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, 'i'));
  return m ? m[1] : '';
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// מנקה רעש של מחרוזות-JS מתוך title/label (קונקטנציות '+...+', ${...})
function cleanText(s) {
  return (s || '')
    .replace(/'\s*\+[^+]*\+\s*'/g, '…')
    .replace(/\$\{[^}]*\}/g, '…')
    .replace(/\\'/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── חילוץ כפתורים מה-HTML ───────────────────────────────────────────────────
// מחזיר מערך אובייקטים יציבים (סדר לפי הופעה בקובץ).
export function extractButtons(html) {
  // מפת אזורים: ribbon לפי data-ribbon, ועוד מיכלים ידועים, לפי אינדקס תו.
  const regions = [];
  // סרגל הבית הוא <header ... data-ribbon="home"> — לא <section>. תופסים כל תג.
  const ribbonRe = /<[a-z]+[^>]*\bdata-ribbon\s*=\s*"([^"]+)"/gi;
  let rm;
  while ((rm = ribbonRe.exec(html))) regions.push({ at: rm.index, name: 'ribbon:' + rm[1] });
  const named = [
    ['ctxBar', 'סרגל-צף'], ['statusBar', 'שורת-סטטוס'], ['rcMenu', 'תפריט-ימני'],
    ['pageStack', 'אזור-עמודים'],
  ];
  for (const [id, label] of named) {
    const i = html.indexOf(`id="${id}"`);
    if (i >= 0) regions.push({ at: i, name: label });
  }
  regions.sort((a, b) => a.at - b.at);
  const regionAt = (idx) => {
    let r = 'dialog/other';
    for (const reg of regions) { if (reg.at <= idx) r = reg.name; else break; }
    return r;
  };

  const out = [];
  const seen = new Set();
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let m, order = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const inner = m[2];
    const idxLine = html.slice(0, m.index).split('\n').length;

    let id = attr(attrs, 'id');
    const cls = attr(attrs, 'class');
    const title = cleanText(attr(attrs, 'title'));
    const aria = cleanText(attr(attrs, 'aria-label'));
    const dataCmd = attr(attrs, 'data-cmd');
    const onclick = cleanText(attr(attrs, 'onclick'));

    // אייקון + תווית
    const icSpan = inner.match(/<span[^>]*class="[^"]*\bic\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const lbSpan = inner.match(/<span[^>]*class="[^"]*\blb\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const innerText = stripTags(inner);
    const icon = icSpan ? stripTags(icSpan[1]) : (lbSpan ? '' : innerText);
    const label = lbSpan ? cleanText(stripTags(lbSpan[1])) : (title || aria || cleanText(innerText));

    // id יציב לכפתורים חסרי-id (נגזר מתוכן, דטרמיניסטי)
    if (!id) {
      const basis = (onclick || title || aria || innerText || cls) + '|' + (dataCmd || '');
      id = 'noid_' + crypto.createHash('md5').update(basis).digest('hex').slice(0, 8);
    }
    if (seen.has(id)) continue; // כפתורים כפולים (נוצרים פעמיים בקוד) — פעם אחת
    seen.add(id);

    const isRibbonBig = /\bribbon-big\b/.test(cls);
    const isCaret = /\bribbon-caret\b/.test(cls);
    const region = regionAt(m.index);
    const needsIcon = isRibbonBig || isCaret || (!label && !!icon) || /\bcolor-btn\b/.test(cls);

    out.push({
      id,
      selector: attr(attrs, 'id') ? '#' + attr(attrs, 'id') : null,
      hasDomId: !!attr(attrs, 'id'),
      cls, title, aria, dataCmd, onclick,
      icon, label,
      region, line: idxLine, order: order++,
      needsIcon,
      complexity: guessComplexity({ id, cls, dataCmd, region, onclick }),
      suite: /^zoom/i.test(id) ? 'zoom' : guessSuite(region),
    });
  }
  return out;
}

function guessSuite(region) {
  if (region === 'ribbon:home') return 'home-ribbon';
  if (region === 'ribbon:insert') return 'insert';
  if (region === 'ribbon:file') return 'file';
  if (region === 'סרגל-צף') return 'ctxbar';
  if (region === 'שורת-סטטוס') return 'zoom';
  return 'dialog';
}

// מורכבות 1–3: 1=טריוויאלי (toggle/סגור), 2=רגיל, 3=לוגיקה מורכבת.
function guessComplexity({ id, cls, dataCmd, region, onclick }) {
  const complex = /shape|table|img|image|draw|calc|symbol|emoji|header|footer|date|time|link|comment|bookmark|font|size|color|line|spacing|case/i;
  const trivial = /close|cancel|cls|ביטול|סגור|✕/i;
  const s = (id + ' ' + cls + ' ' + onclick).toLowerCase();
  if (trivial.test(s)) return 1;
  if (complex.test(s)) return 3;
  if (dataCmd) return 2; // execCommand פשוט
  if (region.startsWith('dialog')) return 2;
  return 2;
}

// ─── פענוח BUTTONS-SPEC.md → מבנה JS ─────────────────────────────────────────
export function parseSpec(md) {
  const out = [];
  const re = /<!--\s*marcus:\s*(\{[\s\S]*?\})\s*-->/g;
  let m;
  while ((m = re.exec(md))) {
    try { out.push(JSON.parse(m[1])); } catch { /* בלוק פגום — דלג */ }
  }
  return out;
}

// קריאה נוחה מהדיסק (עם נפילה רכה אם הקובץ עדיין לא קיים)
export function loadSpecFromDisk() {
  if (!fs.existsSync(SPEC_PATH)) return [];
  return parseSpec(fs.readFileSync(SPEC_PATH, 'utf8'));
}
export function loadButtonsFromHtml() {
  return extractButtons(fs.readFileSync(HTML_PATH, 'utf8'));
}
