/* מטריצת קיצורי-מקלדת × מצבי-עבודה — בדיקה בלבד, לא נוגע במוצר.
   מוודא ש-§13 בחוקה מתקיים בכל הקשר: עורך רגיל, תא-טבלה, תיבת-טקסט,
   אובייקט-נבחר, מצב-מיקוד, ערכת-לילה, וסרגל-צף פתוח. */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'MyWord-v2.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForSelector('#editor');
await page.waitForTimeout(600);

const results = [];
const rec = (mode, key, ok, detail) => results.push({ mode, key, ok, detail });

/* ---- הכנת מצב ---- */
async function reset() {
  await page.evaluate(() => {
    document.querySelectorAll('.mw-panel,#rcMenu,#_calc').forEach(p => p.remove());
    document.body.classList.remove('focus-mode', 'hide-status');
    document.body.removeAttribute('data-theme');
    document.querySelectorAll('.free-obj').forEach(o => o.remove());
    const ed = document.getElementById('editor');
    ed.innerHTML = '<p id="pA">שלום עולם בדיקה</p>';
    window.updatePagination && window.updatePagination();
  });
  await page.waitForTimeout(400);
  /* טעינת-מסמך אסינכרונית עלולה לדרוס — מוודאים ומחזירים אם צריך */
  await page.evaluate(() => {
    const ed = document.getElementById('editor');
    if (!document.getElementById('pA')) ed.innerHTML = '<p id="pA">שלום עולם בדיקה</p>';
  });
  await page.waitForTimeout(120);
}

async function selectWord(sel = '#pA') {
  await page.evaluate((s) => {
    const ed0 = document.getElementById('editor');
    if (!document.querySelector(s)) ed0.innerHTML = '<p id="pA">שלום עולם בדיקה</p>';
    const p = document.querySelector(s);
    const ed = document.getElementById('editor');
    ed.focus({ preventScroll: true });
    const r = document.createRange();
    r.selectNodeContents(p);
    const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r);
  }, sel);
  await page.waitForTimeout(80);
}

async function press(combo) { await page.keyboard.press(combo); await page.waitForTimeout(180); }

/* ============ מצב 1: עורך רגיל ============ */
async function testCore(modeName, prep) {
  await reset();
  if (prep) await prep();
  await selectWord();

  await press('Control+b');
  let ok = await page.evaluate(() => /<(b|strong)|font-weight/i.test(document.querySelector('#pA')?.innerHTML || ''));
  rec(modeName, 'Ctrl+B מודגש', ok, ok ? '' : 'לא הוחל bold');
  await press('Control+z');

  await selectWord();
  await press('Control+i');
  ok = await page.evaluate(() => /<(i|em)|font-style:\s*italic/i.test(document.querySelector('#pA')?.innerHTML || ''));
  rec(modeName, 'Ctrl+I נטוי', ok, ok ? '' : 'לא הוחל italic');
  await press('Control+z');

  await selectWord();
  await press('Control+u');
  ok = await page.evaluate(() => /<u|text-decoration[^"]*underline/i.test(document.querySelector('#pA')?.innerHTML || ''));
  rec(modeName, 'Ctrl+U קו-תחתון', ok, ok ? '' : 'לא הוחל underline');
  await press('Control+z');

  /* יישורים */
  for (const [combo, expect, label] of [
    ['Control+e', 'center', 'Ctrl+E מרכוז'],
    ['Control+r', 'right', 'Ctrl+R יישור ימין'],
    ['Control+l', 'left', 'Ctrl+L יישור שמאל'],
    ['Control+j', 'justify', 'Ctrl+J דו-צדדי'],
  ]) {
    await selectWord();
    await press(combo);
    const got = await page.evaluate(() => {
      const p = document.querySelector('#pA') || document.querySelector('#editor p');
      return p ? getComputedStyle(p).textAlign : '(אין פסקה)';
    });
    rec(modeName, label, got === expect, `textAlign=${got}`);
  }

  /* גודל גופן */
  await reset(); if (prep) await prep();
  await selectWord();
  const before = await page.evaluate(() => window.readCurrentFontSizePt ? readCurrentFontSizePt() : null);
  await press('Control+BracketRight');
  const after = await page.evaluate(() => {
    const sp = document.querySelector('#pA span[style*="font-size"]');
    return sp ? parseFloat(sp.style.fontSize) : null;
  });
  rec(modeName, 'Ctrl+] הגדל גופן', after !== null && before !== null && after > before, `${before}pt → ${after}pt`);

  /* F9 המרת פריסה */
  await reset(); if (prep) await prep();
  await page.evaluate(() => { document.getElementById('editor').innerHTML = '<p id="pA">akuo</p>'; });
  await selectWord();
  await press('F9');
  const f9 = await page.evaluate(() => document.querySelector('#pA')?.textContent || '');
  rec(modeName, 'F9 תקן-שפה', /[֐-׿]/.test(f9), `תוצאה="${f9}"`);

  /* Ctrl+S — שמירה */
  await reset(); if (prep) await prep();
  await page.evaluate(() => { document.getElementById('saveState').textContent = '__before__'; });
  await press('Control+s');
  const saved = await page.evaluate(() => document.getElementById('saveState')?.textContent || '');
  rec(modeName, 'Ctrl+S שמירה', saved !== '__before__', `saveState="${saved}"`);

  /* Ctrl+F — חיפוש */
  await reset(); if (prep) await prep();
  await page.evaluate(() => document.getElementById('editor').focus({ preventScroll: true }));
  await press('Control+f');
  const findOpen = await page.evaluate(() => {
    const el = document.querySelector('#findBar,#_findBar,.find-bar,[id*="find" i]');
    return !!(el && getComputedStyle(el).display !== 'none');
  });
  rec(modeName, 'Ctrl+F חיפוש', findOpen, findOpen ? '' : 'סרגל חיפוש לא נפתח');
  await press('Escape');

  /* Ctrl+Z / Ctrl+Y */
  await reset(); if (prep) await prep();
  await selectWord();
  await press('Control+b');
  const boldOn = await page.evaluate(() => /<(b|strong)|font-weight/i.test(document.querySelector('#pA')?.innerHTML || ''));
  await press('Control+z');
  const undone = await page.evaluate(() => !/<(b|strong)|font-weight/i.test(document.querySelector('#pA')?.innerHTML || ''));
  rec(modeName, 'Ctrl+Z בטל', boldOn && undone, `bold=${boldOn} undo=${undone}`);
  await press('Control+y');
  const redone = await page.evaluate(() => /<(b|strong)|font-weight/i.test(document.querySelector('#editor')?.innerHTML || ''));
  rec(modeName, 'Ctrl+Y חזור', redone, redone ? '' : 'redo לא החזיר');
}

/* ============ הרצה בכל המצבים ============ */
await testCore('עורך רגיל', null);

await testCore('מצב מיקוד', async () => {
  await page.evaluate(() => window.toggleFocusMode && window.toggleFocusMode());
  await page.waitForTimeout(150);
});

await testCore('ערכת לילה-קרח', async () => {
  await page.evaluate(() => { const b = document.getElementById('vwNight'); if (b) b.click(); });
  await page.waitForTimeout(200);
});

/* ---- תיבת-טקסט: קיצורי עיצוב חייבים לעבוד בתוך .tb-content ---- */
await reset();
await page.evaluate(() => window.insertFreeTextbox && window.insertFreeTextbox());
await page.waitForTimeout(300);
const tbOk = await page.evaluate(() => !!document.querySelector('.free-textbox .tb-content'));
if (tbOk) {
  await page.evaluate(() => {
    const c = document.querySelector('.free-textbox .tb-content');
    c.innerHTML = '<p id="tbP">טקסט בתיבה</p>';
    c.focus();
    const r = document.createRange(); r.selectNodeContents(document.getElementById('tbP'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await press('Control+b');
  const tbBold = await page.evaluate(() => /<(b|strong)|font-weight/i.test(document.querySelector('#tbP')?.innerHTML || ''));
  rec('תיבת-טקסט', 'Ctrl+B בתוך התיבה', tbBold, tbBold ? '' : 'לא הוחל');
  await press('Control+e');
  const tbAlign = await page.evaluate(() => { const p = document.querySelector('#tbP'); return p ? getComputedStyle(p).textAlign : '?'; });
  rec('תיבת-טקסט', 'Ctrl+E מרכוז בתיבה', tbAlign === 'center', `textAlign=${tbAlign}`);
} else {
  rec('תיבת-טקסט', 'יצירת תיבה', false, 'insertFreeTextbox לא יצר תיבה');
}

/* ---- תא טבלה: Tab מנווט, קיצורי עיצוב עובדים ---- */
await reset();
await page.evaluate(() => {
  const ed = document.getElementById('editor');
  ed.innerHTML = '<table id="tT"><tr><td id="c1">א</td><td id="c2">ב</td></tr><tr><td id="c3">ג</td><td id="c4">ד</td></tr></table>';
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  const c = document.getElementById('c1');
  document.getElementById('editor').focus({ preventScroll: true });
  const r = document.createRange(); r.selectNodeContents(c);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
});
await press('Control+b');
const cellBold = await page.evaluate(() => /<(b|strong)|font-weight/i.test(document.getElementById('c1')?.innerHTML || ''));
rec('תא טבלה', 'Ctrl+B בתא', cellBold, cellBold ? '' : 'לא הוחל');
await page.evaluate(() => {
  const c = document.getElementById('c1');
  const r = document.createRange(); r.selectNodeContents(c); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
});
await press('Tab');
const tabMoved = await page.evaluate(() => {
  const s = getSelection();
  const n = s.anchorNode;
  const td = n && (n.nodeType === 1 ? n : n.parentElement)?.closest('td');
  return td ? td.id : '(אין)';
});
rec('תא טבלה', 'Tab לתא הבא', tabMoved === 'c2', `סמן בתא ${tabMoved}`);

/* ---- אובייקט נבחר: Delete מוחק, חצים מזיזים ---- */
await reset();
await page.evaluate(() => window.insertFreeShape && window.insertFreeShape('rect'));
await page.waitForTimeout(300);
const shapeExists = await page.evaluate(() => !!document.querySelector('.free-obj'));
if (shapeExists) {
  const t0 = await page.evaluate(() => {
    const o = document.querySelector('.free-obj');
    window._selectObj && window._selectObj(o);
    return o.offsetTop;
  });
  await page.waitForTimeout(150);
  await press('ArrowDown');
  const t1 = await page.evaluate(() => document.querySelector('.free-obj')?.offsetTop);
  rec('אובייקט נבחר', 'חץ-מטה מזיז אובייקט', t1 > t0, `top ${t0} → ${t1}`);
  await press('Delete');
  const gone = await page.evaluate(() => !document.querySelector('.free-obj'));
  rec('אובייקט נבחר', 'Delete מוחק אובייקט', gone, gone ? '' : 'האובייקט נשאר');
} else {
  rec('אובייקט נבחר', 'יצירת צורה', false, 'insertFreeShape לא יצר');
}

/* ---- Escape סוגר פאנל בכל מצב ---- */
await reset();
await page.evaluate(() => window.openColorWheel && window.openColorWheel({ anchor: document.getElementById('colorBtn'), color: '#ff0000' }));
await page.waitForTimeout(250);
const panelOpen = await page.evaluate(() => !!document.querySelector('.color-wheel,.mw-panel'));
await press('Escape');
const panelClosed = await page.evaluate(() => !document.querySelector('.color-wheel,.mw-panel'));
rec('פאנל פתוח', 'Escape סוגר', panelOpen && panelClosed, `נפתח=${panelOpen} נסגר=${panelClosed}`);

/* ---- דוח ---- */
const fail = results.filter(r => !r.ok);
console.log('\n════════ מטריצת קיצורי מקלדת ════════');
let cur = '';
for (const r of results) {
  if (r.mode !== cur) { cur = r.mode; console.log(`\n── ${cur} ──`); }
  console.log(`${r.ok ? '✅' : '❌'} ${r.key}${r.detail ? '   [' + r.detail + ']' : ''}`);
}
console.log(`\nסה"כ: ${results.length - fail.length}/${results.length} עברו`);
console.log(`שגיאות console: ${errs.length}`);
if (errs.length) errs.slice(0, 10).forEach(e => console.log('  ⚠ ' + e));
await browser.close();
process.exit(fail.length ? 1 : 0);
