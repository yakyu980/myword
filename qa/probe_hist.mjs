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
    document.getElementById('insCalc').click();
    const calc = document.getElementById('_calc');
    const clickBtn = (sel) => calc.querySelector(sel).click();
    clickBtn('[data-act=DIG][data-d="5"]');
    clickBtn('[data-act=OP][data-op="+"]');
    clickBtn('[data-act=DIG][data-d="3"]');
    clickBtn('[data-act=EQ]');
    const entryText = calc.querySelector('#_calcHist .ch-r').textContent;
    clickBtn('[data-act=AC]');
    const histRow = calc.querySelector('#_calcHist .ch-r');
    histRow.focus();
    histRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    return { entryText, formulaAfter: calc.querySelector('#_calcFormula').textContent, resultAfter: calc.querySelector('#_calcResult').textContent };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
