import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const HTML = 'C:\\Users\\yakyu\\OneDrive\\文档\\WONDER LETER\\MyWord-v2.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
  await page.waitForSelector('#editor', { timeout: 15000 });
  await page.waitForTimeout(400);

  // ─── GAP 2: ctx-format tabs ───
  const r2 = await page.evaluate(() => {
    const editor = document.getElementById('editor');
    editor.innerHTML = '<p><br></p>';
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    const out = {};

    // insert image
    editor.innerHTML = '<p><br></p>';
    const div = document.createElement('div');
    div.className = 'free-obj';
    div.setAttribute('contenteditable', 'false');
    div.setAttribute('data-img-mode', 'free');
    div.style.cssText = 'position:absolute;left:40px;top:40px;width:100px;height:100px;z-index:15';
    div.innerHTML = `<div class="free-img-wrap"><img src="${window.location.href}"></div>`;
    // simpler: reuse a tiny png data uri already available in window? just make one
    div.innerHTML = '<div class="free-img-wrap"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="></div>';
    editor.appendChild(div);

    window._selectObj(div);
    const imgTab = document.querySelector('.tab[data-tab="imgformat"]');
    const shapeTab = document.querySelector('.tab[data-tab="shapeformat"]');
    out.imgTabHiddenAfterSelectImg = imgTab.hidden;
    out.shapeTabHiddenAfterSelectImg = shapeTab.hidden;

    imgTab.click();
    out.imgRibbonActive = document.querySelector('.ribbon[data-ribbon="imgformat"]').classList.contains('active');
    out.onlyOneActive = document.querySelectorAll('.ribbon.active').length === 1;
    out.homeNotActiveWhileImgActive = !document.querySelector('.ribbon[data-ribbon="home"]').classList.contains('active');

    // deselect -> back to home
    window._selectObj(null);
    out.imgTabHiddenAfterDeselect = imgTab.hidden;
    out.homeActiveAfterDeselect = document.querySelector('.ribbon[data-ribbon="home"]').classList.contains('active');

    // insert shape
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    const shapeObj = window.insertFreeShape('rect');
    window._selectObj(shapeObj || document.querySelector('.free-obj'));
    out.shapeTabHiddenAfterSelectShape = shapeTab.hidden;
    out.imgTabHiddenAfterSelectShape = imgTab.hidden;
    shapeTab.click();
    out.shapeRibbonActive = document.querySelector('.ribbon[data-ribbon="shapeformat"]').classList.contains('active');

    // gradient round-trip
    const shape = document.querySelector('.free-obj');
    if (typeof window._applyShapeFx === 'function') {
      shape.dataset.grad = JSON.stringify({ on: true, c1: '#ff0000', c2: '#0000ff', angle: 45, type: 'linear' });
      window._applyShapeFx(shape);
    }
    const gradId1 = shape.querySelector('linearGradient, radialGradient')?.id;
    out.gradientApplied = !!gradId1;

    // serialize -> deserialize round trip
    const ser = window._serializeFreeObjs();
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    window._deserializeFreeObjs(ser);
    const shape2 = document.querySelector('.free-obj');
    out.gradientSurvivedRoundtrip = !!shape2 && !!shape2.querySelector('linearGradient, radialGradient');

    // clone shape with gradient -> unique gradient ids
    const allGradIdsBefore = [...document.querySelectorAll('linearGradient,radialGradient')].map(g => g.id);
    const clone = shape2.cloneNode(true);
    editor.appendChild(clone);
    if (typeof window._applyShapeFx === 'function') window._applyShapeFx(clone);
    const allGradIdsAfter = [...document.querySelectorAll('linearGradient,radialGradient')].map(g => g.id);
    out.allGradIdsUnique = new Set(allGradIdsAfter).size === allGradIdsAfter.length;
    out.gradIdsBefore = allGradIdsBefore;
    out.gradIdsAfter = allGradIdsAfter;

    return out;
  });
  console.log('GAP2 ctx-format-tabs:', JSON.stringify(r2, null, 2));

  await browser.close();
  console.log('console errors:', errors);
})();
