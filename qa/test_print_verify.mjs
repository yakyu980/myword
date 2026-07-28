import { chromium } from 'playwright';

async function verify() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  // Very direct test
  const result1 = await page.evaluate(() => {
    return typeof window.exportAndPrint;
  });
  console.log(`typeof window.exportAndPrint: ${result1}`);
  
  const result2 = await page.evaluate(() => {
    return typeof window.exportAndPrint === 'function';
  });
  console.log(`typeof window.exportAndPrint === 'function': ${result2}`);
  
  // Check if print function works
  const printAvail = await page.evaluate(() => {
    return typeof window.print === 'function';
  });
  console.log(`typeof window.print: ${printAvail}`);
  
  // check what globals exist
  const globals = await page.evaluate(() => {
    const keys = Object.keys(window).filter(k => k.toLowerCase().includes('print') || k.toLowerCase().includes('export'));
    return keys;
  });
  console.log(`\nGlobals with 'print'/'export': ${globals.slice(0, 20).join(', ')}`);
  
  await browser.close();
}

await verify();
