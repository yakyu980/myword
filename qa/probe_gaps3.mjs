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

  // ─── GAP 3: calculator ───
  const r3 = await page.evaluate(() => {
    const editor = document.getElementById('editor');
    editor.innerHTML = '<p>x</p>';
    // put cursor in editor
    editor.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor.firstChild);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);

    const out = {};
    document.getElementById('insCalc').click();
    const calc = document.getElementById('_calc');
    out.calcOpened = !!calc && calc.style.display !== 'none';
    out.calcRole = calc.getAttribute('role');

    const modeIds = ['_modeBasic', '_modeSci', '_modeGeo', '_modeEq', '_modeUnit', '_modeStat', '_modeVar', '_modeGraph', '_modeTrig'];
    out.modeTransitions = {};
    modeIds.forEach(id => {
      const btn = calc.querySelector('#' + id);
      btn.click();
      out.modeTransitions[id] = {
        active: btn.classList.contains('active'),
        ariaSelected: btn.getAttribute('aria-selected'),
        othersInactive: modeIds.filter(x => x !== id).every(x => calc.querySelector('#' + x).getAttribute('aria-selected') === 'false'),
      };
    });

    // basic mode: 5 + 3 =
    calc.querySelector('#_modeBasic').click();
    const clickBtn = (sel) => calc.querySelector(sel).click();
    clickBtn('[data-act=DIG][data-d="5"]');
    clickBtn('[data-act=OP][data-op="+"]');
    clickBtn('[data-act=DIG][data-d="3"]');
    clickBtn('[data-act=EQ]');
    out.basicResultText = calc.querySelector('#_calcFormula').textContent;

    const before = editor.innerHTML;
    calc.querySelector('#_insRes').click();
    out.editorChangedAfterInsRes = editor.innerHTML !== before;
    const before2 = editor.innerHTML;
    calc.querySelector('#_insFull').click();
    out.editorChangedAfterInsFull = editor.innerHTML !== before2;
    const before3 = editor.innerHTML;
    calc.querySelector('#_insSteps').click();
    out.editorChangedAfterInsSteps = editor.innerHTML !== before3;
    const before4 = editor.innerHTML;
    calc.querySelector('#_insHeb').click();
    out.editorChangedAfterInsHeb = editor.innerHTML !== before4;
    out.editorFinalHtml = editor.innerHTML.slice(0, 400);

    // history: Enter on focused row triggers _histUseRow (result restored to display)
    const histRow = calc.querySelector('#_calcHist .ch-r');
    out.histRowExists = !!histRow;
    if (histRow) {
      // change display first via AC to make sure Enter actually changes it
      clickBtn('[data-act=AC]');
      out.formulaAfterAC = calc.querySelector('#_calcFormula').textContent;
      histRow.focus();
      histRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      out.formulaAfterHistEnter = calc.querySelector('#_calcFormula').textContent;
    }

    // geo mode: square side=4 -> insert
    calc.querySelector('#_modeGeo').click();
    calc.querySelector('#_geoShape').value = 'square';
    calc.querySelector('#_geoShape').dispatchEvent(new Event('change', { bubbles: true }));
    const sideInput = calc.querySelector('#_geoFields input');
    out.geoFieldExists = !!sideInput;
    if (sideInput) {
      sideInput.value = '4';
      sideInput.dispatchEvent(new Event('input', { bubbles: true }));
      calc.querySelector('#_geoCalc').click();
      out.geoOutputHasResult = calc.querySelector('#_geoOutput').textContent.length > 5;
      const beforeGeo = editor.innerHTML;
      const geoInsertBtn = calc.querySelector('#_geoInsert');
      out.geoInsertEnabled = !geoInsertBtn.disabled;
      geoInsertBtn.click();
      out.editorChangedAfterGeoInsert = editor.innerHTML !== beforeGeo;
    }

    // graph mode: draw f(x)=x^2 -> insert image with alt
    calc.querySelector('#_modeGraph').click();
    calc.querySelector('#_graphFn').value = 'x^2';
    calc.querySelector('#_graphFn').dispatchEvent(new Event('input', { bubbles: true }));
    calc.querySelector('#_graphDraw').click();
    const graphInsertBtn = calc.querySelector('#_graphInsert');
    out.graphInsertEnabled = !graphInsertBtn.disabled;
    const beforeGraph = editor.innerHTML;
    graphInsertBtn.click();
    out.editorChangedAfterGraphInsert = editor.innerHTML !== beforeGraph;
    const imgs = [...editor.querySelectorAll('img')];
    const lastImg = imgs[imgs.length - 1];
    out.graphImgAltNonEmpty = !!(lastImg && lastImg.alt && lastImg.alt.trim().length > 0);
    out.graphImgAlt = lastImg && lastImg.alt;

    return out;
  });
  console.log('GAP3 calculator:', JSON.stringify(r3, null, 2));

  await browser.close();
  console.log('console errors:', errors);
})();
