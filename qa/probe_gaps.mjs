import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

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

  // ─── GAP 1: image edit panels ───
  const r1 = await page.evaluate(async () => {
    const editor = document.getElementById('editor');
    editor.innerHTML = '<p><br></p>';
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());

    // build red bg + blue square test image (200x200)
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#0000ff'; ctx.fillRect(60, 60, 80, 80);
    const dataUrl = cv.toDataURL('image/png');

    const div = document.createElement('div');
    div.className = 'free-obj';
    div.setAttribute('contenteditable', 'false');
    div.setAttribute('data-img-mode', 'free');
    div.style.cssText = 'position:absolute;left:40px;top:40px;width:200px;height:200px;z-index:15';
    div.innerHTML = `<div class="free-img-wrap"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain"></div>`;
    editor.appendChild(div);
    const img = div.querySelector('img');
    await new Promise(res => { if (img.complete) res(); else img.onload = res; });
    const origSrc = img.src;

    const out = {};

    // 1. filters panel: brightness change + apply
    openImageFiltersPanel(div, div);
    const panel = document.getElementById('_imgFiltersPanel');
    const slider = panel.querySelectorAll('input[type=range]')[0]; // brightness
    slider.value = '50';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    out.filterPreviewApplied = img.style.filter.includes('brightness(50%)');
    const applyBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('אישור'));
    applyBtn.click();
    await new Promise(r => setTimeout(r, 50));
    out.filterSrcChanged = img.src !== origSrc;
    out.filterIsPng = img.src.startsWith('data:image/png');
    out.filterDatasetBrightness = img.dataset.brightness;
    out.filterStyleCleared = img.style.filter === '';
    const afterFilterSrc = img.src;

    // 2. bg-remove panel: chroma-key on red
    openBgRemovePanel(div, div);
    const bgPanel = document.getElementById('_bgRemovePanel');
    const canvas = bgPanel.querySelector('canvas.ie-canvas');
    const r = canvas.getBoundingClientRect();
    // click near top-left corner = red area
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }));
    const ctx2 = canvas.getContext('2d', { willReadFrequently: true });
    const redPx = ctx2.getImageData(5, 5, 1, 1).data;
    const bluePx = ctx2.getImageData(100, 100, 1, 1).data;
    out.chromaRedAlpha = redPx[3];
    out.chromaBlueAlpha = bluePx[3];
    const bgApplyBtn = [...bgPanel.querySelectorAll('button')].find(b => b.textContent === 'החל');
    bgApplyBtn.click();
    await new Promise(r2 => setTimeout(r2, 50));
    out.bgRemoveSrcChanged = img.src !== afterFilterSrc;

    // 3. restore original
    openImageFiltersPanel(div, div);
    const panel2 = document.getElementById('_imgFiltersPanel');
    const restoreBtn = [...panel2.querySelectorAll('button')].find(b => b.textContent.includes('שחזר'));
    restoreBtn.click();
    out.restoredSrc = img.src === origSrc;
    out.datasetClearedAfterRestore = !img.dataset.brightness;

    // 4. round-trip serialize/deserialize of imgOrigSrc
    // re-apply a filter so origSrc differs from current src
    openImageFiltersPanel(div, div);
    const panel3 = document.getElementById('_imgFiltersPanel');
    const sl3 = panel3.querySelectorAll('input[type=range]')[0];
    sl3.value = '150'; sl3.dispatchEvent(new Event('input', { bubbles: true }));
    const apply3 = [...panel3.querySelectorAll('button')].find(b => b.textContent.includes('אישור'));
    apply3.click();
    await new Promise(r3 => setTimeout(r3, 50));
    const serialized = window._serializeFreeObjs();
    out.serializedHasOrigSrc = !!(serialized[0] && serialized[0].imgOrigSrc);
    out.serializedOrigSrcMatches = serialized[0] && serialized[0].imgOrigSrc === origSrc;
    // deserialize into fresh editor
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    window._deserializeFreeObjs(serialized);
    const newImg = editor.querySelector('.free-obj img');
    out.deserializedOrigSrcPresent = newImg && newImg.dataset.origSrc === origSrc;

    return out;
  });
  console.log('GAP1 image-edit:', JSON.stringify(r1, null, 2));

  await browser.close();
  console.log('console errors:', errors);
})();
