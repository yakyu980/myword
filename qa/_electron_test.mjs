/* בדיקת התוכנה הארוזה — מריצה את Electron האמיתי ובודקת אבטחה + פעולות קובץ */
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..', 'desktop');

const say = (n, v, d = '') => console.log(`${v ? '✅' : '❌'} ${n}${d ? '  [' + d + ']' : ''}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mwtest-'));

/* Playwright מחפש את electron ב-node_modules שלו — כאן הוא יושב תחת desktop/ */
const EXE = path.join(APP, 'node_modules', 'electron', 'dist', 'electron.exe');
const app = await electron.launch({ args: [APP], executablePath: EXE });
const win = await app.firstWindow();
const errs = [];
win.on('pageerror', e => errs.push(e.message));
win.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await win.waitForSelector('#editor', { timeout: 30000 });
await win.waitForTimeout(1500);

console.log('\n══ 1. החלון עלה ══');
say('כותרת החלון', (await win.title()).includes('MyWord'), await win.title());
say('העורך נטען', await win.evaluate(() => !!document.getElementById('editor')));
say('הריבון נטען', await win.evaluate(() => document.querySelectorAll('.ribbon').length > 0),
    String(await win.evaluate(() => document.querySelectorAll('.ribbon').length)) + ' סרגלים');

console.log('\n══ 2. אבטחה — בידוד התהליך ══');
const sec = await win.evaluate(() => ({
  hasRequire: typeof window.require,
  hasProcess: typeof window.process,
  hasModule: typeof window.module,
  hasGlobal: typeof window.global,
  hasBuffer: typeof window.Buffer,
  bridge: typeof window.mwDesktop,
  bridgeKeys: window.mwDesktop ? Object.keys(window.mwDesktop).sort() : [],
  ipcLeak: typeof window.ipcRenderer,
  electronLeak: typeof window.electron,
}));
console.log(JSON.stringify(sec));
say('אין require בדף', sec.hasRequire === 'undefined');
say('אין process בדף', sec.hasProcess === 'undefined');
say('אין module/global/Buffer בדף', sec.hasModule === 'undefined' && sec.hasGlobal === 'undefined' && sec.hasBuffer === 'undefined');
say('אין דליפת ipcRenderer/electron', sec.ipcLeak === 'undefined' && sec.electronLeak === 'undefined');
say('הגשר mwDesktop נחשף', sec.bridge === 'object', sec.bridgeKeys.join(','));

const prefs = await app.evaluate(async ({ BrowserWindow }) => {
  const w = BrowserWindow.getAllWindows()[0];
  const p = w.webContents.getLastWebPreferences ? w.webContents.getLastWebPreferences() : null;
  return p ? { ctx: p.contextIsolation, node: p.nodeIntegration, sandbox: p.sandbox, websec: p.webSecurity } : null;
});
if (prefs) {
  console.log(JSON.stringify(prefs));
  say('contextIsolation פעיל', prefs.ctx === true);
  say('nodeIntegration כבוי', prefs.node === false || prefs.node === undefined);
  say('sandbox פעיל', prefs.sandbox === true);
  say('webSecurity פעיל', prefs.websec !== false);
}

console.log('\n══ 3. תפריט מערכת ══');
const menu = await app.evaluate(async ({ Menu }) => {
  const m = Menu.getApplicationMenu();
  if (!m) return null;
  return m.items.map(i => ({
    label: i.label,
    items: (i.submenu ? i.submenu.items : []).map(s => s.label || s.type).filter(Boolean),
  }));
});
console.log(JSON.stringify(menu, null, 0));
say('תפריט קיים', !!menu && menu.length >= 4);
const fileMenu = (menu || []).find(m => m.label === 'קובץ');
say('תפריט "קובץ" עם פתיחה/שמירה/הדפסה', !!fileMenu &&
    fileMenu.items.some(i => /פתח/.test(i)) && fileMenu.items.some(i => /שמור/.test(i)) &&
    fileMenu.items.some(i => /הדפסה/.test(i)), fileMenu ? fileMenu.items.join(' · ') : '');

console.log('\n══ 4. שמירה לקובץ אמיתי ══');
const outPath = path.join(tmp, 'בדיקה.mwd');
await app.evaluate(async ({ dialog }, p) => {
  dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
}, outPath);
await win.evaluate(() => {
  document.getElementById('editor').innerHTML = '<h1>מסמך מהתוכנה</h1><p>תוכן <b>מודגש</b></p><ul><li>פריט</li></ul>';
  document.getElementById('docTitle').value = 'בדיקה';
});
await win.evaluate(() => window.saveDocToComputer(true));
await win.waitForTimeout(1200);
const wrote = fs.existsSync(outPath);
say('הקובץ נכתב לדיסק', wrote, outPath);
if (wrote) {
  const txt = fs.readFileSync(outPath, 'utf8');
  say('הקובץ מכיל את התוכן', /מסמך מהתוכנה/.test(txt) && /מודגש/.test(txt), `${txt.length} תווים`);
  say('אין שאריות עימוד בקובץ', !/_pgspacer/.test(txt) && !/resize-handle/.test(txt));
}

console.log('\n══ 5. שמירה חוזרת דורסת את אותו קובץ ══');
await win.evaluate(() => { document.getElementById('editor').innerHTML = '<p>גרסה שנייה</p>'; });
await win.evaluate(() => window.saveDocToComputer(false));
await win.waitForTimeout(1000);
const files = fs.readdirSync(tmp);
const txt2 = fs.readFileSync(outPath, 'utf8');
say('לא נוצר קובץ כפול', files.length === 1, files.join(', '));
say('התוכן התעדכן באותו קובץ', /גרסה שנייה/.test(txt2));

console.log('\n══ 6. פתיחה מהדיסק ══');
await app.evaluate(async ({ dialog }, p) => {
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] });
}, outPath);
await win.evaluate(() => { document.getElementById('editor').innerHTML = '<p id="before">לפני</p>'; });
await win.evaluate(() => window.openDocFromComputer());
await win.waitForTimeout(1500);
const opened = await win.evaluate(() => ({
  text: (document.getElementById('editor').textContent || '').slice(0, 30),
  title: document.getElementById('docTitle').value,
  gone: !document.getElementById('before'),
}));
console.log(JSON.stringify(opened));
say('הקובץ נפתח מהדיסק', /גרסה שנייה/.test(opened.text));
say('שם הקובץ הפך לשם המסמך', opened.title === 'בדיקה', opened.title);

console.log('\n══ 7. קובץ זדוני מהדיסק ══');
const evilPath = path.join(tmp, 'זדוני.html');
fs.writeFileSync(evilPath, '<html><body><script>window.__EPWN=1<\/script>' +
  '<p onclick="window.__EPWN2=1">טקסט</p><iframe src="https://evil.test"></iframe>' +
  '<h1>כותרת</h1></body></html>', 'utf8');
await app.evaluate(async ({ dialog }, p) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] }); }, evilPath);
await win.evaluate(() => window.openDocFromComputer());
await win.waitForTimeout(1500);
const ev = await win.evaluate(() => ({
  pwn: !!(window.__EPWN || window.__EPWN2),
  scripts: document.querySelectorAll('#editor script').length,
  iframes: document.querySelectorAll('#editor iframe').length,
  onAttrs: [...document.querySelectorAll('#editor *')].filter(e => [...e.attributes].some(a => a.name.startsWith('on'))).length,
  keptH1: !!document.querySelector('#editor h1'),
}));
console.log(JSON.stringify(ev));
say('לא הורץ קוד מהקובץ', !ev.pwn);
say('script/iframe/on* הוסרו', ev.scripts === 0 && ev.iframes === 0 && ev.onAttrs === 0);
say('התוכן הלגיטימי נשמר', ev.keptH1);

console.log('\n══ 8. חסימת נתיב לא מורשה ══');
const blocked = await win.evaluate(async () => {
  try { await window.mwDesktop.writePath('C:\\Windows\\System32\\evil.exe', 'x'); return 'לא נחסם!'; }
  catch (e) { return 'נחסם: ' + (e.message || '').slice(0, 60); }
});
say('כתיבה לסיומת לא מורשית נחסמת', /נחסם/.test(blocked), blocked);
const blocked2 = await win.evaluate(async () => {
  try { await window.mwDesktop.readPath('C:\\Windows\\win.ini'); return 'לא נחסם!'; }
  catch (e) { return 'נחסם'; }
});
say('קריאת קובץ מערכת נחסמת', /נחסם/.test(blocked2), blocked2);

console.log('\nשגיאות: ' + errs.length);
errs.slice(0, 6).forEach(e => console.log('  ⚠ ' + String(e).slice(0, 150)));
await app.close();
fs.rmSync(tmp, { recursive: true, force: true });
