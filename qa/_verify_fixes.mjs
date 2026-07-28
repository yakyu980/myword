/* אימות שני התיקונים של 2026-07-27 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'MyWord-v2.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForSelector('#editor'); await page.waitForTimeout(800);
const say = (n, v, d = '') => console.log(`${v ? '✅' : '❌'} ${n}${d ? '  [' + d + ']' : ''}`);

/* ── 1. Ctrl+A + העתקה ── */
console.log('\n══ תיקון 1 — העתקה נקייה ══');
await page.evaluate(() => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML =
    Array.from({ length: 90 }, (_, i) => `<p>שורה ${i + 1}</p>`).join('') +
    '<table><tr><th>א</th><th>ב</th></tr>' + '<tr><td>נתון</td><td>ערך</td></tr>'.repeat(40) + '</table>';
  window.updatePagination && window.updatePagination();
});
await page.waitForTimeout(1800);
const cp = await page.evaluate(() => {
  const ed = document.getElementById('editor');
  const domPushed = [...ed.children].filter(c => c.style && parseFloat(c.style.marginTop) > 0).length;
  const domSpacers = ed.querySelectorAll('tr._pgspacer').length;
  ed.focus({ preventScroll: true });
  document.execCommand('selectAll');
  const dt = new DataTransfer();
  const ev = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: dt });
  ed.dispatchEvent(ev);
  const html = dt.getData('text/html'), text = dt.getData('text/plain');
  return {
    domPushed, domSpacers, handled: ev.defaultPrevented,
    htmlLen: html.length,
    spacers: (html.match(/_pgspacer/g) || []).length,
    margins: (html.match(/margin-top:\s*[1-9]/g) || []).length,
    pushedAttr: (html.match(/data-pushed/g) || []).length,
    hasContent: /שורה 1</.test(html) && /נתון/.test(html),
    textLen: text.length,
  };
});
console.log(JSON.stringify(cp));
say('המסמך החי אכן מכיל ארטיפקטים (התנאי לבדיקה)', cp.domPushed > 0 && cp.domSpacers > 0, `${cp.domPushed} דחיפות · ${cp.domSpacers} שורות-ריווח`);
say('המטפל תפס את ההעתקה', cp.handled, '');
say('אין margin-top בהעתקה', cp.margins === 0, String(cp.margins));
say('אין _pgspacer בהעתקה', cp.spacers === 0, String(cp.spacers));
say('אין data-pushed בהעתקה', cp.pushedAttr === 0, String(cp.pushedAttr));
say('התוכן עצמו הועתק במלואו', cp.hasContent, `${cp.htmlLen} תווים HTML · ${cp.textLen} טקסט`);

/* ── בחירה חלקית עדיין עובדת ── */
const partial = await page.evaluate(() => {
  const ps = [...document.querySelectorAll('#editor > p')];
  const r = document.createRange(); r.setStart(ps[2], 0); r.setEnd(ps[5], 0);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  const dt = new DataTransfer();
  const ev = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: dt });
  document.getElementById('editor').dispatchEvent(ev);
  return { html: dt.getData('text/html').slice(0, 90), len: dt.getData('text/html').length };
});
say('בחירה חלקית מעתיקה רק את הנבחר', /שורה 3/.test(partial.html) && !/שורה 1</.test(partial.html), partial.html);

/* ── גזירה ── */
const cut = await page.evaluate(() => {
  const ed = document.getElementById('editor');
  ed.innerHTML = '<p id="a">אחת</p><p id="b">שתיים</p><p id="c">שלוש</p>';
  const r = document.createRange(); r.selectNodeContents(document.getElementById('b'));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  const dt = new DataTransfer();
  const ev = new ClipboardEvent('cut', { bubbles: true, cancelable: true, clipboardData: dt });
  ed.dispatchEvent(ev);
  return { clip: dt.getData('text/plain'), left: document.getElementById('b')?.textContent ?? '(נמחק)' };
});
say('גזירה מעתיקה ומוחקת', /שתיים/.test(cut.clip) && cut.left === '', JSON.stringify(cut));

/* ── 2. סימון אפור ── */
console.log('\n══ תיקון 2 — סימון אפור ══');
const gray = await page.evaluate(async () => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML = '<p id="g">טקסט</p>';
  window.insertFreeShape && window.insertFreeShape('rect');
  await new Promise(r => setTimeout(r, 600));
  const o = document.querySelector('.free-obj');
  window._selectObj && window._selectObj(o);
  await new Promise(r => setTimeout(r, 500));
  const pick = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : '(אין)'; };
  /* ::selection לא נגיש ל-getComputedStyle — קוראים מגיליון-הסגנון */
  let selRule = null;
  for (const sh of document.styleSheets) {
    try { for (const r of sh.cssRules) {
      if (r.selectorText && /#editor ::selection/.test(r.selectorText)) selRule = r.style.background || r.style.backgroundColor;
    } } catch (e) {}
  }
  return {
    selectionBg: selRule,
    objOutline: pick('.free-obj.selected', 'outlineColor'),
    resizeBorder: pick('.resize-handle', 'borderColor'),
    rotateBorder: pick('.rotate-handle', 'borderColor'),
    moveBg: pick('.free-move-handle', 'backgroundColor'),
  };
});
console.log(JSON.stringify(gray));
const isGray = (c) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); if (!m) return false;
  const [r, g, b] = [+m[1], +m[2], +m[3]]; return Math.max(r, g, b) - Math.min(r, g, b) < 30; };
say('הדגשת טקסט אפורה', /107,\s*114,\s*128/.test(gray.selectionBg || ''), gray.selectionBg);
say('מסגרת אובייקט נבחר אפורה', isGray(gray.objOutline), gray.objOutline);
say('ידיות שינוי-גודל אפורות', isGray(gray.resizeBorder), gray.resizeBorder);
say('ידית סיבוב אפורה', isGray(gray.rotateBorder), gray.rotateBorder);
say('ידית גרירה אפורה', isGray(gray.moveBg), gray.moveBg);

/* ── בחירת תאי-טבלה לא נפגעה ── */
const tblSel = await page.evaluate(() => {
  let found = false;
  for (const sh of document.styleSheets) {
    try { for (const r of sh.cssRules) {
      if (r.selectorText && /tbl-block-sel/.test(r.selectorText) && /selection/.test(r.selectorText)) found = true;
    } } catch (e) {}
  }
  return found;
});
say('כלל בחירת-תאי-טבלה עדיין קיים', tblSel, '');

console.log('\nשגיאות: ' + errs.length);
errs.slice(0, 6).forEach(e => console.log('  ⚠ ' + e.slice(0, 150)));
await browser.close();
