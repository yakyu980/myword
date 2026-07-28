/* אימות חי של הרשימה שדווחה — האם הבאגים חזרו בקובץ הנוכחי? */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'MyWord-v2.html');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAOklEQVR4nO3QMQEAAAgDoC251a3gLkiQVj+qgQ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4NEC0GgAAT8xkPMAAAAASUVORK5CYII=';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForSelector('#editor'); await page.waitForTimeout(800);
const say = (n, v, d = '') => console.log(`${v ? '✅' : '❌'} ${n}${d ? '  [' + d + ']' : ''}`);

console.log('\n══ סביבה ══');
console.log(JSON.stringify(await page.evaluate(() => ({
  w: innerWidth,
  hover: matchMedia('(hover: hover)').matches,
  coarse: matchMedia('(pointer: coarse)').matches,
  mobBar: (() => { const m = document.getElementById('mobBar'); return m ? getComputedStyle(m).display : '(אין)'; })(),
}))));

/* ── א. Ctrl+A ── */
console.log('\n══ א. בחר-הכל — האם נגררים רווחי-עמוד? ══');
await page.evaluate(() => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML =
    Array.from({ length: 90 }, (_, i) => `<p>שורה ${i + 1}</p>`).join('') +
    '<table><tr><th>א</th><th>ב</th></tr>' + '<tr><td>נתון</td><td>ערך</td></tr>'.repeat(40) + '</table>';
  window.updatePagination && window.updatePagination();
});
await page.waitForTimeout(1600);
/* נמדד על **הלוח** ולא על ה-DOM: הדחיפות ושורות-הריווח חייבות להישאר בעורך
   כדי שהעמודים ייראו נכון — מה שאסור הוא שהן ייצאו החוצה בהעתקה. */
const selAll = await page.evaluate(() => {
  const ed = document.getElementById('editor'); ed.focus({ preventScroll: true });
  document.execCommand('selectAll');
  const dt = new DataTransfer();
  const ev = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: dt });
  ed.dispatchEvent(ev);
  const html = dt.getData('text/html');
  return {
    handled: ev.defaultPrevented,
    spacerRows: (html.match(/_pgspacer/g) || []).length,
    overlays: (html.match(/page-break-label|page-number/g) || []).length,
    marginTops: (html.match(/margin-top:\s*[1-9]/g) || []).length,
    hasContent: /שורה 1</.test(html) && /נתון/.test(html),
    len: html.length,
  };
});
console.log(JSON.stringify(selAll));
say('אין שורות-ריווח (_pgspacer) בהעתקה', selAll.spacerRows === 0, String(selAll.spacerRows));
say('אין שכבות-על של עימוד בהעתקה', selAll.overlays === 0, String(selAll.overlays));
say('אין דחיפות margin-top בהעתקה', selAll.marginTops === 0, `${selAll.marginTops} דחיפות`);
say('התוכן עצמו הועתק במלואו', selAll.hasContent, `${selAll.len} תווים`);

/* ── ב. טבלה ── */
console.log('\n══ ב. טבלה — ידית הזזה + מחיקה ══');
await page.evaluate(() => {
  document.getElementById('editor').innerHTML =
    '<p>לפני</p><table id="T"><tr><td>א</td><td>ב</td></tr><tr><td>ג</td><td>ד</td></tr></table><p>אחרי</p>';
  window.updatePagination && window.updatePagination();
});
await page.waitForTimeout(700);
const t = await page.evaluate(() => { const r = document.getElementById('T').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 10 }; });
await page.mouse.move(t.x, t.y); await page.waitForTimeout(600);
const handles = await page.evaluate(() => {
  const h = document.querySelector('.tbl-move-handle');
  return { move: !!h, disp: h ? getComputedStyle(h).display : '(אין)', resize: !!document.querySelector('.tbl-resize-handle') };
});
say('ידית הזזה מופיעה בריחוף', handles.move && handles.disp !== 'none', JSON.stringify(handles));
const moved = await page.evaluate(() => {
  const h = document.querySelector('.tbl-move-handle'); if (!h) return { err: 'אין ידית' };
  const ord = () => [...document.getElementById('editor').children].map(c => c.tagName).join(',');
  const before = ord(); h.focus();
  h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  return { before, after: ord(), changed: before !== ord() };
});
say('הטבלה זזה (ArrowDown על הידית)', moved.changed === true, JSON.stringify(moved));
const afterDel = await page.evaluate(async () => {
  document.getElementById('T')?.remove();
  await new Promise(r => setTimeout(r, 800));
  const all = [...document.querySelectorAll('.tbl-move-handle,.tbl-resize-handle')];
  return { total: all.length, visible: all.filter(h => getComputedStyle(h).display !== 'none').length };
});
say('אחרי מחיקת טבלה אין סמני-גרירה גלויים', afterDel.visible === 0, JSON.stringify(afterDel));

/* ── ג. קליק ימני בתא ── */
console.log('\n══ ג. קליק-ימני בתא — יישור אנכי ══');
await page.evaluate(() => { document.getElementById('editor').innerHTML = '<table><tr><td id="C">תא</td></tr></table>'; });
await page.waitForTimeout(500);
const rc = await page.evaluate(() => {
  const c = document.getElementById('C'); const r = c.getBoundingClientRect();
  const sel = getSelection(); const rg = document.createRange();
  rg.selectNodeContents(c); rg.collapse(true); sel.removeAllRanges(); sel.addRange(rg);
  c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 5, clientY: r.top + 5 }));
  const m = document.getElementById('rcMenu');
  return m ? [...m.querySelectorAll('[role="menuitem"],button')].map(b => b.textContent.trim()).filter(Boolean) : '(לא נפתח)';
});
console.log('פריטי התפריט:', JSON.stringify(rc));
say('יש יישור אנכי בתפריט', /למעלה|אמצע|למטה|אנכי/.test(Array.isArray(rc) ? rc.join(' ') : ''), '');

/* ── ד. סרגל צף ── */
console.log('\n══ ד. סרגל צף לתמונה ולצורה ══');
for (const kind of ['תמונה', 'צורה']) {
  const r = await page.evaluate(async ({ k, png }) => {
    document.querySelectorAll('.free-obj').forEach(o => o.remove());
    document.getElementById('editor').innerHTML = '<p>טקסט</p>';
    if (k === 'תמונה') await window._buildImageObjFromSrc(png); else window.insertFreeShape('rect');
    await new Promise(z => setTimeout(z, 600));
    const o = document.querySelector('.free-obj');
    window._selectObj && window._selectObj(o);
    await new Promise(z => setTimeout(z, 600));
    const c = document.getElementById('ctxBar');
    const rect = c ? c.getBoundingClientRect() : null;
    const mb = document.getElementById('mobBar');
    return {
      display: c ? getComputedStyle(c).display : '(אין)',
      btns: c ? c.querySelectorAll('button').length : 0,
      onScreen: rect ? (rect.width > 0 && rect.top >= 0 && rect.top < innerHeight) : false,
      mobBar: mb ? getComputedStyle(mb).display : '(אין)',
    };
  }, { k: kind, png: PNG });
  say(`סרגל צף ל${kind}`, r.display === 'flex' && r.btns > 0 && r.onScreen, JSON.stringify(r));
}

/* ── ה. צורה מול פס-הפער ── */
console.log('\n══ ה. צורה — מרווח מפס-הפער ══');
const sg = await page.evaluate(async () => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML = '<p>x</p>'.repeat(200);
  window.updatePagination && window.updatePagination();
  await new Promise(r => setTimeout(r, 1000));
  window.insertFreeShape('rect');
  await new Promise(r => setTimeout(r, 500));
  const o = document.querySelector('.free-obj');
  const ppc = (() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;width:1cm;height:1cm;visibility:hidden';
    document.getElementById('editor').appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; })();
  const pageH = 29.7 * ppc, cycle = 31.2 * ppc;
  o.style.top = (pageH - 20) + 'px';
  window._clamp && window._clamp(o);
  const top = o.offsetTop, bot = top + o.offsetHeight;
  return { top: Math.round(top), bot: Math.round(bot), gapStart: Math.round(pageH), gapEnd: Math.round(cycle),
    inGap: bot > pageH + 2 && top < cycle - 2, marginCm: +(((pageH - bot) / ppc).toFixed(2)) };
});
console.log(JSON.stringify(sg));
say('צורה לא נשארת בפס-הפער', !sg.inGap, `מרווח=${sg.marginCm}cm`);

/* ── ו. תמונה בתחתית המסמך ── */
console.log('\n══ ו. תמונה — גרירה לתחתית מוסיפה עמוד ══');
const img = await page.evaluate(async (png) => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML = '<p>y</p>'.repeat(120);
  window.updatePagination && window.updatePagination();
  await new Promise(r => setTimeout(r, 900));
  await window._buildImageObjFromSrc(png);
  await new Promise(r => setTimeout(r, 500));
  const o = document.querySelector('.free-obj');
  const page0 = (document.querySelector('.page')||document.getElementById('editor')).offsetHeight;
  const rect = o.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  o.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, pageX: cx + scrollX, pageY: cy + scrollY }));
  let last = o.offsetTop; const tops = [];
  for (let i = 1; i <= 60; i++) {
    window._onGlobalMove && window._onGlobalMove({ pageX: cx + scrollX, pageY: cy + scrollY + i * 120,
      clientX: cx, clientY: cy + i * 120, preventDefault() {}, altKey: false, shiftKey: false });
    tops.push(o.offsetTop);
  }
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
  const page1 = (document.querySelector('.page')||document.getElementById('editor')).offsetHeight;
  const stuckAt = tops[tops.length - 1] === tops[tops.length - 10];
  return { page0, page1, grew: page1 > page0, first: tops[0], last: tops[tops.length - 1], stuckAt };
});
console.log(JSON.stringify(img));
say('התמונה ממשיכה לזוז לתחתית המסמך', !img.stuckAt, `top ${img.first} → ${img.last}`);
say('המסמך גדל אוטומטית בגרירה', img.grew, `גובה ${img.page0} → ${img.page1}`);

console.log('\nשגיאות: ' + errs.length);
errs.slice(0, 5).forEach(e => console.log('  ⚠ ' + e.slice(0, 140)));
await browser.close();
