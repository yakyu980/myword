/* בדיקת "פתח מהמחשב" / "שמור למחשב" — כולל וקטורי-אבטחה בקובץ נכנס */
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, '..', 'MyWord-v2.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForSelector('#editor'); await page.waitForTimeout(900);
const say = (n, v, d = '') => console.log(`${v ? '✅' : '❌'} ${n}${d ? '  [' + d + ']' : ''}`);

/* ── 1. הכפתורים קיימים ומחווטים ── */
console.log('\n══ 1. חיווט ══');
const wired = await page.evaluate(() => ({
  openFn: typeof window.openDocFromComputer,
  saveFn: typeof window.saveDocToComputer,
  openBtn: !!document.querySelector('[onclick*="openDocFromComputer"]'),
  saveBtn: !!document.querySelector('[onclick*="saveDocToComputer"]'),
  inFileRibbon: !!document.querySelector('[data-ribbon="file"] [onclick*="openDocFromComputer"]'),
}));
console.log(JSON.stringify(wired));
say('פונקציות חשופות', wired.openFn === 'function' && wired.saveFn === 'function');
say('כפתורים בלשונית קובץ', wired.openBtn && wired.saveBtn && wired.inFileRibbon);

/* ── 2. חיטוי קובץ נכנס — וקטורי תקיפה ── */
console.log('\n══ 2. אבטחה — קובץ זדוני מהדיסק ══');
const evil = `<!DOCTYPE html><html><head>
<style>body{display:none!important}</style>
<script>window.__PWN1=1<\/script>
<meta http-equiv="refresh" content="0;url=https://evil.test">
<base href="https://evil.test/">
</head><body>
<p onclick="window.__PWN2=1" onmouseover="window.__PWN3=1">תוכן אמיתי</p>
<img src="x" onerror="window.__PWN4=1">
<a href="java\tscript:window.__PWN5=1">קישור מוסווה</a>
<a href="javascript:window.__PWN6=1">קישור ישיר</a>
<iframe src="https://evil.test"></iframe>
<object data="evil.swf"></object>
<embed src="evil.swf">
<form action="https://evil.test"><input name="x"></form>
<svg><script>window.__PWN7=1<\/script></svg>
<h1>כותרת ששרדה</h1>
<table><tr class="_pgspacer"><td>ריווח</td></tr><tr><td>תא אמיתי</td></tr></table>
<p data-pushed="1" data-orig-mt="" style="margin-top:610px">פסקה שנדחפה</p>
<div class="page-number">7</div><div class="doc-header">כותרת רצה</div>
</body></html>`;

const res = await page.evaluate((raw) => {
  const out = window._importSanitize ? null : 'לא חשוף';
  /* קוראים לפונקציה הפנימית דרך הזרמה לעורך, כמו שהפתיחה עושה */
  const clean = (typeof _importSanitize === 'function') ? _importSanitize(raw) : null;
  if (clean === null) return { err: '_importSanitize לא נגיש' };
  const probe = document.createElement('div');
  probe.innerHTML = clean;
  document.body.appendChild(probe);
  const r = {
    pwned: ['__PWN1','__PWN2','__PWN3','__PWN4','__PWN5','__PWN6','__PWN7'].filter(k => window[k]),
    script: probe.querySelectorAll('script').length,
    iframe: probe.querySelectorAll('iframe').length,
    objEmbed: probe.querySelectorAll('object,embed').length,
    form: probe.querySelectorAll('form').length,
    styleTag: probe.querySelectorAll('style').length,
    metaBase: probe.querySelectorAll('meta,base,link').length,
    onAttrs: [...probe.querySelectorAll('*')].filter(e => [...e.attributes].some(a => a.name.toLowerCase().startsWith('on'))).length,
    jsHrefs: [...probe.querySelectorAll('a')].filter(a => /^javascript:/i.test(a.getAttribute('href') || '')).length,
    spacers: probe.querySelectorAll('tr._pgspacer').length,
    pushed: probe.querySelectorAll('[data-pushed]').length,
    overlays: probe.querySelectorAll('.page-number,.doc-header,.doc-footer').length,
    keptH1: !!probe.querySelector('h1'),
    keptText: /תוכן אמיתי/.test(probe.textContent),
    keptTable: /תא אמיתי/.test(probe.textContent),
  };
  probe.remove();
  return r;
}, evil);
console.log(JSON.stringify(res));
say('לא הורץ שום קוד מהקובץ', res.pwned && res.pwned.length === 0, JSON.stringify(res.pwned));
say('<script> הוסר', res.script === 0);
say('<iframe>/<object>/<embed> הוסרו', res.iframe === 0 && res.objEmbed === 0);
say('<form> הוסר', res.form === 0);
say('<style> זר הוסר', res.styleTag === 0);
say('<meta>/<base>/<link> הוסרו', res.metaBase === 0);
say('מטפלי-אירוע inline הוסרו', res.onAttrs === 0);
say('href="javascript:" (כולל מוסווה) הוסר', res.jsHrefs === 0);
say('שאריות-עימוד הוסרו', res.spacers === 0 && res.pushed === 0 && res.overlays === 0);
say('התוכן הלגיטימי נשמר', res.keptH1 && res.keptText && res.keptTable);

/* ── 3. פתיחה בפועל דרך הבורר ── */
console.log('\n══ 3. פתיחה בפועל ══');
const opened = await page.evaluate(async () => {
  const before = document.getElementById('editor').innerHTML;
  document.getElementById('editor').innerHTML = '<p id="orig">מסמך קיים שאסור לדרוס</p>';
  const html = '<html><body><h1>מיובא</h1><p>שורה מיובאת</p>' +
               '<script>window.__PWN8=1<\/script></body></html>';
  const file = new File([html], 'הדוח שלי.html', { type: 'text/html' });
  /* מזריקים את הקובץ לבורר: עוקפים את showOpenFilePicker ואת ה-input */
  const origPicker = window.showOpenFilePicker;
  window.showOpenFilePicker = undefined;
  const origCreate = document.createElement.bind(document);
  document.createElement = (tag) => {
    const el = origCreate(tag);
    if (tag === 'input') {
      Object.defineProperty(el, 'files', { get: () => [file] });
      el.click = () => setTimeout(() => el.onchange && el.onchange(), 0);
    }
    return el;
  };
  await window.openDocFromComputer();
  document.createElement = origCreate;
  window.showOpenFilePicker = origPicker;
  await new Promise(r => setTimeout(r, 700));
  return {
    title: document.getElementById('docTitle')?.value,
    hasH1: !!document.querySelector('#editor h1'),
    text: (document.getElementById('editor').textContent || '').slice(0, 40),
    origGone: !document.getElementById('orig'),
    pwn8: !!window.__PWN8,
    scripts: document.querySelectorAll('#editor script').length,
  };
});
console.log(JSON.stringify(opened));
say('הקובץ נטען לעורך', opened.hasH1 && /מיובא/.test(opened.text));
say('שם הקובץ הפך לשם המסמך (בלי סיומת)', opened.title === 'הדוח שלי', opened.title);
say('נפתח כמסמך חדש (הקודם לא נדרס בתוכו)', opened.origGone);
say('סקריפט מהקובץ לא רץ ולא נכנס', !opened.pwn8 && opened.scripts === 0);

/* ── 4. שמירה למחשב ── */
console.log('\n══ 4. שמירה למחשב ══');
const saved = await page.evaluate(async () => {
  document.getElementById('editor').innerHTML =
    '<h1>כותרת לשמירה</h1><p>תוכן</p>' +
    '<table><tr class="_pgspacer"><td>x</td></tr><tr><td>תא</td></tr></table>';
  document.getElementById('docTitle').value = 'קובץ/עם:תווים*אסורים';
  let written = null, name = null;
  window.showSaveFilePicker = async (opts) => {
    name = opts.suggestedName;
    return { name: opts.suggestedName,
      createWritable: async () => ({ write: async (b) => { written = await b.text(); }, close: async () => {} }) };
  };
  await window.saveDocToComputer(true);
  return { name, len: written ? written.length : 0,
    hasDoctype: /^<!DOCTYPE html>/i.test(written || ''),
    hasContent: /כותרת לשמירה/.test(written || '') && /תא/.test(written || ''),
    spacers: ((written || '').match(/_pgspacer/g) || []).length,
    handles: ((written || '').match(/resize-handle|free-move-handle/g) || []).length,
    titleEsc: /<title>/.test(written || ''),
  };
});
console.log(JSON.stringify(saved));
say('בורר-השמירה קיבל שם קובץ תקין (תווים אסורים הוחלפו)', saved.name === 'קובץ_עם_תווים_אסורים.html', saved.name);
say('נכתב מסמך HTML שלם', saved.hasDoctype && saved.len > 200, `${saved.len} תווים`);
say('התוכן נשמר', saved.hasContent);
say('שאריות-עימוד/ידיות לא נשמרו', saved.spacers === 0 && saved.handles === 0);

/* ── 5. סבב מלא: שמור → פתח ── */
console.log('\n══ 5. סבב מלא שמור→פתח ══');
const round = await page.evaluate(async () => {
  document.getElementById('editor').innerHTML = '<h1>מסמך מקורי</h1><p>פסקה <b>מודגשת</b></p><ul><li>פריט</li></ul>';
  document.getElementById('docTitle').value = 'סבב';
  let saved = null;
  window.showSaveFilePicker = async (o) => ({ name: o.suggestedName,
    createWritable: async () => ({ write: async (b) => { saved = await b.text(); }, close: async () => {} }) });
  await window.saveDocToComputer(true);
  const file = new File([saved], 'סבב.html', { type: 'text/html' });
  window.showOpenFilePicker = undefined;
  const oc = document.createElement.bind(document);
  document.createElement = (t) => { const el = oc(t);
    if (t === 'input') { Object.defineProperty(el, 'files', { get: () => [file] });
      el.click = () => setTimeout(() => el.onchange && el.onchange(), 0); } return el; };
  await window.openDocFromComputer();
  document.createElement = oc;
  await new Promise(r => setTimeout(r, 700));
  const ed = document.getElementById('editor');
  return { h1: !!ed.querySelector('h1'), bold: !!ed.querySelector('b,strong'),
    li: ed.querySelectorAll('li').length, text: (ed.textContent || '').slice(0, 40) };
});
console.log(JSON.stringify(round));
say('כותרת · מודגש · רשימה שרדו את הסבב', round.h1 && round.bold && round.li === 1, JSON.stringify(round));

console.log('\nשגיאות: ' + errs.length);
errs.slice(0, 8).forEach(e => console.log('  ⚠ ' + e.slice(0, 160)));
await browser.close();
