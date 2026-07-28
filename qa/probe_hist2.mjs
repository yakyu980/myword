import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const HTML = 'C:\\Users\\yakyu\\OneDrive\\文档\\WONDER LETER\\MyWord-v2.html';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
  await page.waitForSelector('#editor', { timeout: 15000 });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    window.__keydownCount = 0;
    const origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (type === 'keydown' && this.id === '_calcHist') {
        const wrapped = function (e) { window.__keydownCount++; return fn.call(this, e); };
        return origAdd.call(this, type, wrapped, opts);
      }
      return origAdd.call(this, type, fn, opts);
    };
    document.getElementById('insCalc').click();
    EventTarget.prototype.addEventListener = origAdd;
    const calc = document.getElementById('_calc');
    const clickBtn = (sel) => calc.querySelector(sel).click();
    clickBtn('[data-act=DIG][data-d="5"]');
    clickBtn('[data-act=OP][data-op="+"]');
    clickBtn('[data-act=DIG][data-d="3"]');
    clickBtn('[data-act=EQ]');
    const entryText = calc.querySelector('#_calcHist .ch-r').textContent;
    clickBtn('[data-act=AC]');
    const histRow = calc.querySelector('#_calcHist .ch-r');
    const stateBefore = calc.querySelector('#_calcFormula').textContent;
    histRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const afterKeydown = calc.querySelector('#_calcFormula').textContent;
    clickBtn('[data-act=AC]');
    const histRow2 = calc.querySelector('#_calcHist .ch-r');
    histRow2.click();
    const afterClick = calc.querySelector('#_calcFormula').textContent;
    return { entryText, stateBefore, afterKeydown, afterClick, keydownListenerCount: window.__keydownCount };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
