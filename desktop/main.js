/* MyWord — תהליך ראשי (Electron)
   ═══════════════════════════════════════════════════════════════════════════
   עקרונות אבטחה (כל אחד מהם חובה — אל תשנה בלי לקרוא את ההערה):
   • contextIsolation:true + nodeIntegration:false + sandbox:true
     → לדף אין שום גישה ל-Node. כל פעולת-קובץ עוברת דרך IPC מפורש בלבד.
   • כל נתיב שמגיע מהדף נבדק כאן מחדש — הדף נחשב לא-אמין (הוא מציג תוכן
     שהמשתמש הדביק/ייבא, ולכן עלול להיות מושפע מקלט זר).
   • ניווט חיצוני וחלונות-קופצים חסומים; קישורים נפתחים בדפדפן המערכת בלבד.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.mwd', '.html', '.htm', '.doc', '.txt']);

let mainWindow = null;
let pendingOpenPath = null;      // קובץ שנפתח בדאבל-קליק לפני שהחלון היה מוכן

/* ── עזרי אבטחה ───────────────────────────────────────────────────────── */
function isAllowedPath(p) {
  if (typeof p !== 'string' || !p) return false;
  if (p.includes('\0')) return false;                       // null-byte injection
  const ext = path.extname(p).toLowerCase();
  return ALLOWED_EXT.has(ext);
}

function fileArgFromArgv(argv) {
  return (argv || []).slice(1).find(a => !a.startsWith('-') && isAllowedPath(a)) || null;
}

/* ── חלון ראשי ────────────────────────────────────────────────────────── */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 950,
    minWidth: 900,
    minHeight: 600,
    title: 'MyWord',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0F111A' : '#FFFFFF',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,      // חובה
      nodeIntegration: false,      // חובה
      sandbox: true,               // חובה
      webSecurity: true,           // לעולם לא לכבות
      spellcheck: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (pendingOpenPath) { sendOpenPath(pendingOpenPath); pendingOpenPath = null; }
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  /* ניווט חיצוני חסום — הדף רשאי להישאר רק על קובץ-האפליקציה */
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const here = 'file://' + path.join(__dirname, 'renderer', 'index.html').replace(/\\/g, '/');
    if (!url.startsWith(here.slice(0, here.lastIndexOf('/')))) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });
  /* חלונות-קופצים: אף פעם לא בתוך האפליקציה */
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  /* הרשאות מכשיר: מיקרופון בלבד (הכתבה קולית), כל השאר נדחה */
  mainWindow.webContents.session.setPermissionRequestHandler((wc, permission, cb) => {
    cb(permission === 'media');
  });

  buildMenu();
}

function sendOpenPath(p) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mw:open-path', p);
}
function ask(channel) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel);
}

/* ── תפריט מערכת (עברית, כמו Word) ────────────────────────────────────── */
function buildMenu() {
  const template = [
    {
      label: 'קובץ',
      submenu: [
        { label: 'מסמך חדש', accelerator: 'CmdOrCtrl+N', click: () => ask('mw:new') },
        { label: 'פתח מהמחשב…', accelerator: 'CmdOrCtrl+O', click: () => ask('mw:open') },
        { type: 'separator' },
        { label: 'שמור', accelerator: 'CmdOrCtrl+S', click: () => ask('mw:save') },
        { label: 'שמור בשם…', accelerator: 'CmdOrCtrl+Shift+S', click: () => ask('mw:save-as') },
        { type: 'separator' },
        { label: 'הדפסה…', accelerator: 'CmdOrCtrl+P', click: () => ask('mw:print') },
        { type: 'separator' },
        { label: 'יציאה', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'עריכה',
      submenu: [
        { label: 'בטל', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'בצע שוב', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'גזור', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'העתק', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'הדבק', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'בחר הכל', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: 'תצוגה',
      submenu: [
        { label: 'הגדל תצוגה', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'הקטן תצוגה', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'גודל מקורי', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'מסך מלא', accelerator: 'F11', role: 'togglefullscreen' },
        { label: 'כלי פיתוח', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'עזרה',
      submenu: [
        {
          label: 'אודות MyWord',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'אודות',
            message: 'MyWord ' + app.getVersion(),
            detail: 'עורך מסמכים בעברית.\nElectron ' + process.versions.electron +
                    ' · Chromium ' + process.versions.chrome,
            buttons: ['סגור'],
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ── IPC — פעולות קובץ ────────────────────────────────────────────────── */
ipcMain.handle('mw:open-dialog', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'פתח מסמך',
    properties: ['openFile'],
    filters: [
      { name: 'מסמכי MyWord', extensions: ['mwd', 'html', 'htm', 'doc', 'txt'] },
      { name: 'כל הקבצים', extensions: ['*'] },
    ],
  });
  if (r.canceled || !r.filePaths.length) return null;
  return await readDocument(r.filePaths[0]);
});

ipcMain.handle('mw:read-path', async (_e, p) => readDocument(p));

async function readDocument(filePath) {
  if (!isAllowedPath(filePath)) throw new Error('סוג קובץ לא נתמך');
  const st = await fs.stat(filePath);
  if (!st.isFile()) throw new Error('לא קובץ');
  if (st.size > MAX_FILE_BYTES) throw new Error('הקובץ גדול מ-25MB');
  const content = await fs.readFile(filePath, 'utf8');
  return { path: filePath, name: path.basename(filePath), content };
}

ipcMain.handle('mw:save-dialog', async (_e, { suggestedName }) => {
  const safe = String(suggestedName || 'מסמך').replace(/[\\/:*?"<>|]/g, '_');
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'שמור מסמך',
    defaultPath: safe + '.mwd',
    filters: [
      { name: 'מסמך MyWord', extensions: ['mwd'] },
      { name: 'עמוד HTML', extensions: ['html'] },
      { name: 'מסמך Word', extensions: ['doc'] },
    ],
  });
  if (r.canceled || !r.filePath) return null;
  return r.filePath;
});

ipcMain.handle('mw:write-path', async (_e, { filePath, content }) => {
  if (!isAllowedPath(filePath)) throw new Error('סוג קובץ לא נתמך');
  if (typeof content !== 'string') throw new Error('תוכן לא תקין');
  if (content.length > MAX_FILE_BYTES) throw new Error('המסמך גדול מדי');
  await fs.writeFile(filePath, content, 'utf8');
  return { path: filePath, name: path.basename(filePath) };
});

ipcMain.handle('mw:set-title', (_e, t) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle((t ? String(t).slice(0, 120) + ' — ' : '') + 'MyWord');
  }
});

ipcMain.handle('mw:print', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.print({ silent: false });
});

/* ── מופע יחיד + פתיחה בדאבל-קליק ─────────────────────────────────────── */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = fileArgFromArgv(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (f) sendOpenPath(f);
    }
  });

  app.whenReady().then(() => {
    pendingOpenPath = fileArgFromArgv(process.argv);
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

  app.on('open-file', (e, p) => {          // macOS
    e.preventDefault();
    if (mainWindow) sendOpenPath(p); else pendingOpenPath = p;
  });
}
