/* MyWord — preload
   הגשר היחיד בין הדף לבין מערכת ההפעלה. רץ מבודד (contextIsolation),
   ולכן הדף מקבל *רק* את הפונקציות שמופיעות כאן — ולא את Node עצמו.
   כל פונקציה מחזירה ערכים פשוטים בלבד; שום אובייקט של Electron לא נחשף. */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const handlers = { new: null, open: null, save: null, saveAs: null, print: null, openPath: null };

ipcRenderer.on('mw:new',     () => handlers.new     && handlers.new());
ipcRenderer.on('mw:open',    () => handlers.open    && handlers.open());
ipcRenderer.on('mw:save',    () => handlers.save    && handlers.save());
ipcRenderer.on('mw:save-as', () => handlers.saveAs  && handlers.saveAs());
ipcRenderer.on('mw:print',   () => handlers.print   && handlers.print());
ipcRenderer.on('mw:open-path', (_e, p) => handlers.openPath && handlers.openPath(String(p)));

contextBridge.exposeInMainWorld('mwDesktop', {
  isDesktop: true,
  version: process.versions.electron,

  /* דיאלוג פתיחה של מערכת ההפעלה → {path,name,content} או null אם בוטל */
  openDialog: () => ipcRenderer.invoke('mw:open-dialog'),
  /* קריאת נתיב מוכר (דאבל-קליק על קובץ) */
  readPath: (p) => ipcRenderer.invoke('mw:read-path', String(p)),
  /* דיאלוג שמירה → נתיב שנבחר או null */
  saveDialog: (suggestedName) => ipcRenderer.invoke('mw:save-dialog', { suggestedName: String(suggestedName || '') }),
  /* כתיבה בפועל לנתיב */
  writePath: (filePath, content) =>
    ipcRenderer.invoke('mw:write-path', { filePath: String(filePath), content: String(content) }),

  setTitle: (t) => ipcRenderer.invoke('mw:set-title', String(t || '')),
  print: () => ipcRenderer.invoke('mw:print'),

  /* רישום מטפלים לפריטי תפריט המערכת */
  on: (name, fn) => { if (name in handlers && typeof fn === 'function') handlers[name] = fn; },
});
