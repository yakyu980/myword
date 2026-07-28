import { chromium } from 'playwright';

async function analyze() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  console.log('\n=== MyWord v2 UX Analysis ===\n');
  
  // 1. בדוק איזה כפתורים קיימים בסרגל בית
  const homeButtons = await page.evaluate(() => {
    const homeTab = document.querySelector('[data-tab="home"], [data-ribbon="home"]');
    if (!homeTab) return ['Home tab not found'];
    return Array.from(homeTab.querySelectorAll('button, [role="button"]'))
      .map(b => b.title || b.textContent.trim())
      .filter(t => t)
      .slice(0, 15);
  });
  console.log(`Home tab buttons: ${homeButtons.join(', ')}`);
  
  // 2. בדוק לשוניות זמינות
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.tabs .tab'))
      .map(t => t.textContent.trim());
  });
  console.log(`\nAvailable tabs: ${tabs.join(', ')}`);
  
  // 3. בדוק אם קיימים כפתורי ייצוא
  const exportBtns = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    return allBtns
      .filter(b => (b.title || b.textContent).toLowerCase().includes('export'))
      .map(b => b.title || b.textContent);
  });
  console.log(`\nExport buttons: ${exportBtns.join(', ') || 'none found'}`);
  
  // 4. בדוק שמירה
  const saveState = await page.evaluate(() => document.getElementById('saveState')?.textContent);
  console.log(`Save state indicator: ${saveState || 'not found'}`);
  
  // 5. בדוק זום
  const zoomValue = await page.evaluate(() => document.getElementById('zoomSlider')?.value || 'not found');
  console.log(`Current zoom: ${zoomValue}%`);
  
  // 6. כתוב טקסט, בדוק פונקציונליות בסיסית
  await page.click('#editor');
  await page.type('#editor', 'Test document for MyWord v2.');
  
  const hasPageNumber = await page.evaluate(() => {
    return !!document.querySelector('[class*="page-number"]') || 
           !!document.querySelector('[class*="page-count"]');
  });
  console.log(`\nPage numbers visible: ${hasPageNumber}`);
  
  // 7. בדוק Context Bar
  await page.keyboard.press('Control+A');
  const contextBar = await page.evaluate(() => {
    return !!document.getElementById('ctxBar') || !!document.querySelector('[class*="ctx"]');
  });
  console.log(`Context bar appears on selection: ${contextBar}`);
  
  // 8. בדוק אם קיימת פונקציית 'ניקיון' בדוקומנט חדש
  const newDocBtn = await page.evaluate(() => {
    return !!document.querySelector('button[title*="New"]') || 
           !!document.querySelector('button[title*="חדש"]');
  });
  console.log(`New document button: ${newDocBtn}`);
  
  // 9. בדוק שמות הגבהות
  const headingStyles = await page.evaluate(() => {
    const select = document.querySelector('#blockStyle');
    if (!select) return 'not found';
    return Array.from(select.options).map(o => o.text).join(', ');
  });
  console.log(`\nBlock styles: ${headingStyles}`);
  
  // 10. בדוק אם יש שגיאות בקונסול
  const errors = await page.evaluate(() => {
    return (window._consoleErrors || []).slice(0, 3);
  });
  console.log(`Console errors: ${errors.length > 0 ? errors.join('; ') : 'none'}`);
  
  await browser.close();
}

await analyze();
