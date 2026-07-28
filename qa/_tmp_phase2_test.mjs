// בדיקה חיה זמנית — לשוניות-הקשר "עיצוב תמונה"/"עיצוב צורה" (שלב 2). נמחק בסוף.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const HTML = path.resolve('..', 'MyWord-v2.html');
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const out = {};

// 0. מצב התחלתי — לשוניות-הקשר קיימות ומוסתרות
out.initial = await page.evaluate(() => ({
  imgTabExists: !!document.querySelector('.tab[data-tab="imgformat"]'),
  shapeTabExists: !!document.querySelector('.tab[data-tab="shapeformat"]'),
  imgTabHidden: document.querySelector('.tab[data-tab="imgformat"]')?.hidden,
  imgTabDisplayed: document.querySelector('.tab[data-tab="imgformat"]') ? getComputedStyle(document.querySelector('.tab[data-tab="imgformat"]')).display : null,
  homeActive: document.querySelector('.tab[data-tab="home"]').classList.contains('active'),
  ribbonsActive: [...document.querySelectorAll('.ribbon.active')].map(r => r.dataset.ribbon),
}));

// 1. הוספת תמונה חופשית + בחירה → לשונית מופיעה, לא קופצת
out.imgSelect = await page.evaluate(() => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const d = document.createElement('div');
  d.className = 'free-obj'; d.setAttribute('contenteditable', 'false'); d.setAttribute('data-img-mode', 'free');
  d.style.cssText = 'position:absolute;left:100px;top:100px;width:120px;height:90px;z-index:15';
  d.innerHTML = '<div class="free-img-wrap"><img src="' + PNG + '" style="width:100%;height:100%;object-fit:contain"></div>';
  editor.appendChild(d);
  if (typeof _addHandles === 'function') _addHandles(d);
  _selectObj(d);
  const tab = document.querySelector('.tab[data-tab="imgformat"]');
  return {
    tabVisible: !tab.hidden && getComputedStyle(tab).display !== 'none',
    tabAutoActivated: tab.classList.contains('active'),  // חייב false — לא קופץ
    homeStillActive: document.querySelector('.tab.active')?.dataset.tab,
  };
});

// 2. לחיצה על הלשונית → ריבון imgformat יחיד פעיל
await page.click('.tab[data-tab="imgformat"]');
out.imgRibbon = await page.evaluate(() => ({
  active: [...document.querySelectorAll('.ribbon.active')].map(r => r.dataset.ribbon),
  ribbonVisible: getComputedStyle(document.querySelector('.ribbon[data-ribbon="imgformat"]')).display,
  groups: [...document.querySelectorAll('.ribbon[data-ribbon="imgformat"] .group-titled .label')].map(l => l.textContent),
  btns: [...document.querySelectorAll('.ribbon[data-ribbon="imgformat"] .ribbon-big .lb')].map(l => l.textContent),
  objStillSelected: !!document.querySelector('.free-obj.selected'),
}));

// 3. כפתור "מסננים" פותח את הפאנל, הבחירה נשמרת
await page.click('.ribbon[data-ribbon="imgformat"] .ribbon-big[aria-label*="בהירות"]');
await page.waitForTimeout(200);
out.filtersPanel = await page.evaluate(() => ({
  panelOpen: !!document.getElementById('_imgFiltersPanel'),
  objStillSelected: !!document.querySelector('.free-obj.selected'),
}));
await page.evaluate(() => document.getElementById('_imgFiltersPanel')?.remove());

// 3ב. הסר-רקע + מסגרת + בורר-גלישה
await page.click('.ribbon[data-ribbon="imgformat"] .ribbon-big[aria-label*="הסרת רקע"]');
await page.waitForTimeout(200);
out.bgPanel = await page.evaluate(() => {
  const p = document.getElementById('_bgRemovePanel'); const ok = !!p; p?.remove(); return ok;
});
await page.click('.ribbon[data-ribbon="imgformat"] .ribbon-big[aria-label*="פינות מעוגלות"]');
await page.waitForTimeout(200);
out.borderPanel = await page.evaluate(() => {
  const p = document.getElementById('_imgBorderPanel'); const ok = !!p; p?.remove(); return ok;
});
out.wrapMode = await page.evaluate(() => {
  const sel = document.querySelector('.ribbon[data-ribbon="imgformat"] select');
  sel.value = 'inline'; sel.dispatchEvent(new Event('change'));
  const o = document.querySelector('.free-obj.selected');
  const mode = o?.dataset.imgMode;
  sel.value = 'free'; sel.dispatchEvent(new Event('change'));
  return { afterChange: mode, back: o?.dataset.imgMode };
});

// 4. ביטול-בחירה בזמן שהלשונית פעילה → חזרה ל"בית", הלשונית נעלמת
await page.evaluate(() => _selectObj(null));
out.deselect = await page.evaluate(() => ({
  activeTab: document.querySelector('.tab.active')?.dataset.tab,
  imgTabHidden: document.querySelector('.tab[data-tab="imgformat"]').hidden,
  activeRibbons: [...document.querySelectorAll('.ribbon.active')].map(r => r.dataset.ribbon),
}));

// 5. צורה — לשונית "עיצוב צורה"
out.shape = await page.evaluate(() => {
  if (typeof insertFreeShape === 'function') insertFreeShape('rect');
  const shapes = [...editor.querySelectorAll('.free-obj')].filter(o => o.querySelector('.free-shape-wrap'));
  const sh = shapes[shapes.length - 1];
  _selectObj(sh);
  const st = document.querySelector('.tab[data-tab="shapeformat"]');
  return { shapeMade: !!sh, tabVisible: !st.hidden, imgTabStillHidden: document.querySelector('.tab[data-tab="imgformat"]').hidden };
});
await page.click('.tab[data-tab="shapeformat"]');
out.shapeRibbon = await page.evaluate(() => ({
  active: [...document.querySelectorAll('.ribbon.active')].map(r => r.dataset.ribbon),
  groups: [...document.querySelectorAll('.ribbon[data-ribbon="shapeformat"] .group-titled .label')].map(l => l.textContent),
  btns: [...document.querySelectorAll('.ribbon[data-ribbon="shapeformat"] .ribbon-big .lb')].map(l => l.textContent),
}));
// מילוי → גלגל-צבע נפתח
await page.click('.ribbon[data-ribbon="shapeformat"] .ribbon-big[aria-label="צבע מילוי לצורה"]');
await page.waitForTimeout(200);
out.colorWheel = await page.evaluate(() => { const w = document.querySelector('.color-wheel'); const ok = !!w; w?.remove(); return ok; });
// שכפול
out.dup = await page.evaluate(() => {
  const before = editor.querySelectorAll('.free-obj').length;
  document.querySelector('.ribbon[data-ribbon="shapeformat"] .ribbon-big[aria-label*="שכפל"]').click();
  return { added: editor.querySelectorAll('.free-obj').length - before, newSelected: !!document.querySelector('.free-obj.selected') };
});
// מיזוג עם 2 צורות דרך בחירה-מרובה
out.merge = await page.evaluate(() => {
  const shapes = [...editor.querySelectorAll('.free-obj')].filter(o => o.querySelector('.free-shape-wrap'));
  const set = window._ctxMultiSel; set.clear();
  shapes.slice(0, 2).forEach(o => { set.add(o); o.classList.add('multi-sel'); });
  const before = editor.querySelectorAll('.free-obj').length;
  document.querySelector('.ribbon[data-ribbon="shapeformat"] .ribbon-big[aria-label*="אחד צורות"]').click();
  return { beforeCount: before, afterCount: editor.querySelectorAll('.free-obj').length, mergedSelected: !!document.querySelector('.free-obj.selected') };
});
out.postMergeState = await page.evaluate(() => ({
  shapeTabHidden: document.querySelector('.tab[data-tab="shapeformat"]').hidden,
  selObjClasses: document.querySelector('.free-obj.selected')?.className || null,
  selHasShapeWrap: !!document.querySelector('.free-obj.selected .free-shape-wrap'),
  freeObjs: [...editor.querySelectorAll('.free-obj')].map(o => o.className),
}));
console.log('POSTMERGE', JSON.stringify(out.postMergeState));
// מחיקה → לשונית נעלמת וחזרה ל"בית" (הריבון היה פעיל)
await page.evaluate(() => { const s = [...editor.querySelectorAll('.free-obj')].find(o => o.querySelector('.free-shape-wrap')); if (s) _selectObj(s); });
await page.click('.tab[data-tab="shapeformat"]');
out.del = await page.evaluate(() => {
  document.querySelector('.ribbon[data-ribbon="shapeformat"] .ribbon-big[aria-label*="מחק את הצורה"]').click();
  return {
    activeTab: document.querySelector('.tab.active')?.dataset.tab,
    shapeTabHidden: document.querySelector('.tab[data-tab="shapeformat"]').hidden,
  };
});

// 6. מעבר לשוניות רגילות ממשיך לעבוד
await page.click('.tab[data-tab="insert"]');
out.regularTabs = await page.evaluate(() => ({
  active: [...document.querySelectorAll('.ribbon.active')].map(r => r.dataset.ribbon),
  insertTabActive: document.querySelector('.tab[data-tab="insert"]').classList.contains('active'),
}));
await page.click('.tab[data-tab="home"]');
out.backHome = await page.evaluate(() => [...document.querySelectorAll('.ribbon.active')].map(r => r.dataset.ribbon));

out.consoleErrors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
