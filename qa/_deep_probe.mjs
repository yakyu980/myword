/* בדיקות-עומק חוצות-מערכות — זרימות שלמות כמו משתמש אמיתי.
   בדיקה בלבד; לא נוגע בקוד המוצר. */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'MyWord-v2.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForSelector('#editor'); await page.waitForTimeout(700);

const R = [];
const ok = (area, name, pass, detail = '') => { R.push({ area, name, pass, detail }); };

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAOklEQVR4nO3QMQEAAAgDoC251a3gLkiQVj+qgQ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4NEC0GgAAT8xkPMAAAAASUVORK5CYII=';

/* ════════ 1. round-trip מלא: מסמך עשיר → שמירה → טעינה ════════ */
await page.evaluate(async (png) => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  const ed = document.getElementById('editor');
  ed.innerHTML = '<h1 id="h1">כותרת ראשית</h1>' +
    '<p id="p1">פסקה ראשונה עם <b>מודגש</b> ו<i>נטוי</i>.</p>' +
    '<table id="tbl"><tr><th>עמודה א</th><th>עמודה ב</th></tr><tr><td>1</td><td>2</td></tr></table>' +
    '<ul><li>פריט</li><li>פריט שני</li></ul>' +
    '<p id="p2" style="text-align:center">ממורכז</p>';
  await window._buildImageObjFromSrc?.(png);
  window.insertFreeShape?.('ellipse');
  window.insertFreeTextbox?.();
  /* כותרת/תחתית רצות — דרך הדיאלוג האמיתי (#_hfHeader/#_hfFooter + "שמור") */
  window.openHeaderFooterDialog && window.openHeaderFooterDialog();
  await new Promise(r => setTimeout(r, 400));
  const hdr = document.getElementById('_hfHeader'), ftr = document.getElementById('_hfFooter');
  if (hdr) { hdr.value = 'כותרת רצה — עמוד {עמוד}/{סהכ}'; hdr.dispatchEvent(new Event('input', { bubbles: true })); }
  if (ftr) { ftr.value = 'תחתית רצה'; ftr.dispatchEvent(new Event('input', { bubbles: true })); }
  const okBtn = [...document.querySelectorAll('button')].find(b => /שמור/.test(b.textContent) && b.offsetParent);
  if (okBtn) okBtn.click();
  await new Promise(r => setTimeout(r, 400));
}, PNG);
await page.waitForTimeout(900);

/* מבטלים בחירה ומציבים במפורש — אחרת ה-.selected מוסיף ידיות שמשנות את
   הגובה הנמדד, והמיקום האוטומטי אינו דטרמיניסטי בין ריצות. */
await page.evaluate(() => {
  const objs = [...document.querySelectorAll('.free-obj')];
  objs.forEach((o, i) => { o.classList.remove('selected'); o.style.left = (60 + i * 40) + 'px'; o.style.top = (200 + i * 90) + 'px'; });
});
await page.waitForTimeout(400);

const before = await page.evaluate(() => {
  const objs = [...document.querySelectorAll('.free-obj')].map(o => ({
    cls: o.className, left: o.offsetLeft, top: o.offsetTop, w: o.offsetWidth, h: o.offsetHeight,
    z: o.style.zIndex, mode: o.dataset.imgMode || '', rot: o.dataset.rotation || '',
  }));
  return {
    objs, count: objs.length,
    html: document.getElementById('editor').innerHTML.length,
    hasTable: !!document.getElementById('tbl'),
    p2align: getComputedStyle(document.getElementById('p2')).textAlign,
    boldExists: /<b>|<strong>/i.test(document.getElementById('p1').innerHTML),
  };
});

await page.evaluate(() => window.saveDoc && window.saveDoc());
await page.waitForTimeout(900);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#editor');
await page.waitForTimeout(1500);

const after = await page.evaluate(() => {
  const objs = [...document.querySelectorAll('.free-obj')].map(o => ({
    cls: o.className, left: o.offsetLeft, top: o.offsetTop, w: o.offsetWidth, h: o.offsetHeight,
    z: o.style.zIndex, mode: o.dataset.imgMode || '', rot: o.dataset.rotation || '',
  }));
  const p2 = document.getElementById('p2');
  const p1 = document.getElementById('p1');
  return {
    objs, count: objs.length,
    hasTable: !!document.getElementById('tbl'),
    hasH1: !!document.getElementById('h1'),
    hasList: !!document.querySelector('#editor ul li'),
    p2align: p2 ? getComputedStyle(p2).textAlign : '(אין)',
    boldExists: p1 ? /<b>|<strong>/i.test(p1.innerHTML) : false,
    header: !!document.querySelector('.doc-header'),
    footer: !!document.querySelector('.doc-footer'),
    imgSrcOk: [...document.querySelectorAll('.free-obj img')].every(i => (i.src || '').length > 40),
  };
});

ok('round-trip', 'מספר אובייקטים חופשיים נשמר', before.count === after.count, `${before.count} → ${after.count}`);
ok('round-trip', 'טבלה שרדה', after.hasTable, '');
ok('round-trip', 'כותרת H1 שרדה', after.hasH1, '');
ok('round-trip', 'רשימה שרדה', after.hasList, '');
ok('round-trip', 'עיצוב תו (מודגש) שרד', after.boldExists, '');
ok('round-trip', 'יישור פסקה שרד', after.p2align === 'center', `textAlign=${after.p2align}`);
ok('round-trip', 'כותרת/תחתית רצות שוחזרו', after.header && after.footer, `header=${after.header} footer=${after.footer}`);
ok('round-trip', 'מקור התמונה שוחזר (base64)', after.imgSrcOk, '');
{
  const posOk = before.objs.every((b, i) => {
    const a = after.objs[i]; if (!a) return false;
    return Math.abs(a.left - b.left) <= 2 && Math.abs(a.top - b.top) <= 2 &&
           Math.abs(a.w - b.w) <= 2 && Math.abs(a.h - b.h) <= 2;
  });
  ok('round-trip', 'מיקום+גודל של כל אובייקט זהה (±2px)', posOk,
     posOk ? '' : JSON.stringify({ before: before.objs, after: after.objs }).slice(0, 300));
}

/* ════════ 2. חוקי-דף: אין תוכן בפס-הפער אחרי עריכה חוזרת ════════ */
await page.evaluate(() => {
  const ed = document.getElementById('editor');
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  ed.innerHTML = Array.from({ length: 120 }, (_, i) => `<p>שורה מספר ${i + 1} — טקסט מילוי לבדיקת עימוד רציף.</p>`).join('');
  window.updatePagination && window.updatePagination();
});
await page.waitForTimeout(900);
const gapCheck = await page.evaluate(() => {
  const cm = parseFloat(getComputedStyle(document.documentElement).fontSize) && null;
  const pxPerCm = (() => { const d = document.createElement('div'); d.style.cssText='position:absolute;width:1cm;height:1cm;visibility:hidden';
    document.getElementById('editor').appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; })();
  const pageH = 29.7 * pxPerCm, cycle = 31.2 * pxPerCm;
  const ed = document.getElementById('editor');
  const edTop = ed.getBoundingClientRect().top;
  let violations = 0, worst = null;
  [...ed.children].forEach(el => {
    if (el.classList?.contains('free-obj')) return;
    const r = el.getBoundingClientRect();
    if (!r.height) return;
    const top = r.top - edTop, bot = r.bottom - edTop;
    for (let p = 0; p < 12; p++) {
      const gs = pageH + p * cycle, ge = cycle + p * cycle;
      if (bot > gs + 1 && top < ge - 1) { violations++; if (!worst) worst = { tag: el.tagName, top: Math.round(top), bot: Math.round(bot), gs: Math.round(gs), ge: Math.round(ge) }; }
    }
  });
  return { violations, worst, pages: document.querySelectorAll('.page-number').length };
});
ok('חוקי-דף', 'אין תוכן בפס-הפער (120 פסקאות)', gapCheck.violations === 0,
   gapCheck.violations ? JSON.stringify(gapCheck.worst) : `${gapCheck.pages} עמודים`);

/* עריכה באמצע המסמך — האם העימוד מתקן את עצמו */
await page.evaluate(() => {
  const ps = [...document.querySelectorAll('#editor > p')];
  const mid = ps[Math.floor(ps.length / 2)];
  mid.innerHTML = 'שורה שהתארכה מאוד. '.repeat(60);
  window.updatePagination && window.updatePagination();
});
await page.waitForTimeout(900);
const gapAfterEdit = await page.evaluate(() => {
  const pxPerCm = (() => { const d = document.createElement('div'); d.style.cssText='position:absolute;width:1cm;height:1cm;visibility:hidden';
    document.getElementById('editor').appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w; })();
  const pageH = 29.7 * pxPerCm, cycle = 31.2 * pxPerCm;
  const ed = document.getElementById('editor'); const edTop = ed.getBoundingClientRect().top;
  let v = 0;
  [...ed.children].forEach(el => {
    if (el.classList?.contains('free-obj')) return;
    const r = el.getBoundingClientRect(); if (!r.height) return;
    const top = r.top - edTop, bot = r.bottom - edTop;
    for (let p = 0; p < 14; p++) { const gs = pageH + p * cycle, ge = cycle + p * cycle;
      if (bot > gs + 1 && top < ge - 1) v++; }
  });
  return v;
});
ok('חוקי-דף', 'עימוד מתקן את עצמו אחרי עריכה באמצע', gapAfterEdit === 0, `הפרות=${gapAfterEdit}`);

/* ════════ 3. undo/redo עמוק עם אובייקטים ════════ */
await page.evaluate(async (png) => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML = '<p id="u1">בסיס</p>';
  await window._buildImageObjFromSrc?.(png);
  window.insertFreeShape?.('rect');
}, PNG);
await page.waitForTimeout(700);
const objsBeforeUndo = await page.evaluate(() => document.querySelectorAll('.free-obj').length);
for (let i = 0; i < 12; i++) {
  await page.evaluate((n) => {
    const ed = document.getElementById('editor');
    ed.focus({ preventScroll: true });
    const p = document.createElement('p'); p.textContent = 'עריכה ' + n;
    ed.appendChild(p);
    window._historyRecord && window._historyRecord();
  }, i);
  await page.waitForTimeout(90);
}
/* 10 ביטולים בלבד — נשארים *אחרי* נקודת יצירת האובייקטים, כך שהם חייבים לשרוד.
   (20 ביטולים היו חוזרים אל לפני ההוספה, ושם היעלמותם היא ההתנהגות הנכונה.) */
for (let i = 0; i < 10; i++) { await page.keyboard.press('Control+z'); await page.waitForTimeout(70); }
const afterUndo = await page.evaluate(() => ({
  objs: document.querySelectorAll('.free-obj').length,
  paras: document.querySelectorAll('#editor > p').length,
}));
ok('undo/redo', 'אובייקטים חופשיים שורדים 10 ביטולים', afterUndo.objs === objsBeforeUndo,
   `${objsBeforeUndo} → ${afterUndo.objs}`);
for (let i = 0; i < 10; i++) { await page.keyboard.press("Control+y"); await page.waitForTimeout(70); }
const afterRedo = await page.evaluate(() => ({
  objs: document.querySelectorAll('.free-obj').length,
  paras: document.querySelectorAll('#editor > p').length,
}));
ok('undo/redo', 'אובייקטים שורדים גם 10 חזרות', afterRedo.objs === objsBeforeUndo,
   `${objsBeforeUndo} → ${afterRedo.objs}`);
ok('undo/redo', 'redo מחזיר תוכן', afterRedo.paras >= afterUndo.paras, `${afterUndo.paras} → ${afterRedo.paras}`);

/* ════════ 4. זום — מתמטיקת גרירה ════════ */
for (const zoom of [0.5, 1, 2]) {
  await page.evaluate(async (z) => {
    document.querySelectorAll('.free-obj').forEach(o => o.remove());
    document.getElementById('editor').innerHTML = '<p>זום</p>';
    window._docZoom = z;
    const st = document.getElementById('pageStack'); if (st) st.style.zoom = z;
    window.insertFreeShape?.('rect');
  }, zoom);
  await page.waitForTimeout(450);
  const res = await page.evaluate(() => {
    const o = document.querySelector('.free-obj');
    if (!o) return null;
    const t0 = o.offsetTop, l0 = o.offsetLeft;
    const r = o.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    o.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, pageX: cx + scrollX, pageY: cy + scrollY }));
    const dx = 100, dy = 60;
    window._onGlobalMove && window._onGlobalMove({ pageX: cx + scrollX + dx, pageY: cy + scrollY + dy, clientX: cx + dx, clientY: cy + dy, preventDefault(){}, altKey:false, shiftKey:false });
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    return { t0, l0, t1: o.offsetTop, l1: o.offsetLeft };
  });
  if (res) {
    const dTop = res.t1 - res.t0, dLeft = res.l1 - res.l0;
    /* בזום z, תזוזת-מסך של 60px = 60/z בקואורדינטות המסמך */
    const expTop = 60 / zoom;
    const good = Math.abs(dTop - expTop) < Math.max(12, expTop * 0.25);
    ok('זום', `גרירה בזום ${zoom * 100}% — האובייקט עוקב אחרי הסמן`, good,
       `Δtop=${dTop.toFixed(0)}px (צפוי ≈${expTop.toFixed(0)})`);
  } else ok('זום', `גרירה בזום ${zoom * 100}%`, false, 'לא נוצר אובייקט');
}
await page.evaluate(() => { window._docZoom = 1; const s = document.getElementById('pageStack'); if (s) s.style.zoom = 1; });

/* ════════ 5. הדבקה — חיטוי ════════ */
const pasteRes = await page.evaluate(() => {
  const ed = document.getElementById('editor');
  ed.innerHTML = '<p id="pp">כאן</p>';
  ed.focus({ preventScroll: true });
  const r = document.createRange(); r.selectNodeContents(document.getElementById('pp'));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  const dt = new DataTransfer();
  dt.setData('text/html',
    '<script>window.__XSS=1<\/script>' +
    '<p style="color:red" class="evil" onclick="window.__XSS2=1">טקסט מודבק</p>' +
    '<a href="java	script:window.__XSS3=1">קישור</a>' +
    '<img src="x" onerror="window.__XSS4=1">');
  ed.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
  return null;
});
await page.waitForTimeout(500);
const sanit = await page.evaluate(() => ({
  xss: !!(window.__XSS || window.__XSS2 || window.__XSS3 || window.__XSS4),
  hasScript: !!document.querySelector('#editor script'),
  hasOnclick: !!document.querySelector('#editor [onclick]'),
  hasClass: !!document.querySelector('#editor .evil'),
  anyJsHref: [...document.querySelectorAll('#editor a')].some(a => /^javascript:/i.test(a.href)),
  text: document.getElementById('editor').textContent.slice(0, 40),
}));
ok('הדבקה', 'לא הורץ קוד זדוני', !sanit.xss, '');
ok('הדבקה', '<script> הוסר', !sanit.hasScript, '');
ok('הדבקה', 'מטפלי-אירוע (onclick/onerror) הוסרו', !sanit.hasOnclick, '');
ok('הדבקה', 'class חיצוני הוסר', !sanit.hasClass, '');
ok('הדבקה', 'href="javascript:" מוסווה נחסם', !sanit.anyJsHref, '');
ok('הדבקה', 'הטקסט עצמו נשמר', /טקסט מודבק/.test(sanit.text), `"${sanit.text}"`);

/* ════════ 6. ייצוא — שלמות ════════ */
const exportRes = await page.evaluate(() => {
  const ed = document.getElementById('editor');
  ed.innerHTML = '<h1>כותרת ייצוא</h1><p>תוכן לייצוא</p>' +
    '<table><tr class="_pgspacer"><td colspan="2">רווח</td></tr><tr><td>א</td><td>ב</td></tr></table>';
  let captured = null;
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = (b) => { captured = b; return 'blob:fake'; };
  const origOpen = window.open; window.open = () => ({ document: { write(){}, close(){} }, focus(){}, print(){}, close(){} });
  try { window.exportHTML && window.exportHTML(); } catch (e) { return { err: String(e) }; }
  URL.createObjectURL = origCreate; window.open = origOpen;
  return { got: !!captured, size: captured?.size || 0, blob: !!captured };
});
if (exportRes.got) {
  const txt = await page.evaluate(async () => {
    const ed = document.getElementById('editor');
    let cap = null; const oc = URL.createObjectURL;
    URL.createObjectURL = (b) => { cap = b; return 'blob:fake'; };
    window.exportHTML && window.exportHTML();
    URL.createObjectURL = oc;
    return cap ? await cap.text() : '';
  });
  ok('ייצוא', 'HTML מיוצא מכיל את התוכן', /כותרת ייצוא/.test(txt) && /תוכן לייצוא/.test(txt), `${txt.length} תווים`);
  ok('ייצוא', 'שורות-ריווח (_pgspacer) לא נצרבו לייצוא', !/_pgspacer/.test(txt), '');
  ok('ייצוא', 'אין סרגלים/overlays בייצוא', !/class="ribbon"|id="ctxBar"/.test(txt), '');
} else ok('ייצוא', 'ייצוא HTML', false, JSON.stringify(exportRes));

/* ════════ 7. מצבי תמונה — כל 6 ════════ */
await page.evaluate(async (png) => {
  document.querySelectorAll('.free-obj').forEach(o => o.remove());
  document.getElementById('editor').innerHTML = '<p>טקסט</p>'.repeat(10);
  await window._buildImageObjFromSrc?.(png);
}, PNG);
await page.waitForTimeout(700);
const modes = ['free', 'above-text', 'float-right', 'float-left', 'inline', 'behind'];
for (const m of modes) {
  const r = await page.evaluate((mode) => {
    const o = document.querySelector('.free-obj');
    if (!o) return null;
    window._setImgMode && window._setImgMode(o, mode);
    const cs = getComputedStyle(o);
    return { applied: o.dataset.imgMode, pos: cs.position, float: cs.float, z: cs.zIndex };
  }, m);
  await page.waitForTimeout(200);
  ok('מצבי תמונה', `מצב "${m}" מוחל`, r && r.applied === m, r ? `position=${r.pos} float=${r.float} z=${r.z}` : 'נכשל');
}

/* ════════ 8. RTL / כיוון חכם ════════ */
const dirRes = await page.evaluate(() => {
  const f = window._firstStrongDir;
  if (!f) return null;
  return {
    he: f('שלום world'),
    en: f('Hello עולם'),
    num: f('123 שלום'),
    none: f('123 456'),
  };
});
if (dirRes) {
  ok('RTL', 'פסקה שמתחילה בעברית → rtl', dirRes.he === 'rtl', `=${dirRes.he}`);
  ok('RTL', 'פסקה שמתחילה באנגלית → ltr', dirRes.en === 'ltr', `=${dirRes.en}`);
  ok('RTL', 'מספר לפני עברית → rtl (התו החזק קובע)', dirRes.num === 'rtl', `=${dirRes.num}`);
  ok('RTL', 'ללא תו חזק → null (לא משנה כיוון)', dirRes.none === null, `=${dirRes.none}`);
} else ok('RTL', '_firstStrongDir זמין', false, 'לא נחשף');

/* ════════ דוח ════════ */
console.log('\n═══════ בדיקות עומק ═══════');
let cur = '';
for (const r of R) {
  if (r.area !== cur) { cur = r.area; console.log(`\n── ${cur} ──`); }
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? '   [' + r.detail + ']' : ''}`);
}
const f = R.filter(r => !r.pass);
console.log(`\nסה"כ: ${R.length - f.length}/${R.length}`);
console.log(`שגיאות console: ${errs.length}`);
errs.slice(0, 8).forEach(e => console.log('  ⚠ ' + e.slice(0, 160)));
await browser.close();
