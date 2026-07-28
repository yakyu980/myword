import { chromium } from 'playwright';

async function checkDefects() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // catch console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  const defects = [];
  
  try {
    // 1. בדוק אם טבלה דורשת פונקציית insertTable שלא קיימת
    const tablePickerOk = await page.evaluate(() => typeof window.openTablePicker);
    if (tablePickerOk === 'undefined') {
      defects.push({
        severity: 'CRITICAL',
        title: 'Table insertion missing',
        desc: 'openTablePicker function not found - cannot insert tables'
      });
    }
    
    // 2. בדוק Find & Replace
    const findOk = await page.evaluate(() => typeof window.openFindReplace);
    if (findOk === 'undefined') {
      defects.push({
        severity: 'MAJOR',
        title: 'Find & Replace missing',
        desc: 'openFindReplace function not found'
      });
    }
    
    // 3. בדוק אם כפתורי הבית מוצגים
    const homeVisible = await page.evaluate(() => {
      const home = document.querySelector('[data-ribbon="home"]');
      return home ? window.getComputedStyle(home).display !== 'none' : false;
    });
    if (!homeVisible) {
      defects.push({
        severity: 'CRITICAL',
        title: 'Home ribbon not visible',
        desc: 'Home tab content not displayed'
      });
    }
    
    // 4. בדוק אם עריכת טקסט עובדת (Ctrl+U, Ctrl+I וכו')
    await page.click('#editor');
    await page.type('#editor', 'test');
    
    const underlineWorks = await page.evaluate(async () => {
      const ed = document.getElementById('editor');
      ed.focus();
      document.execCommand('selectAll');
      const before = ed.innerHTML;
      document.execCommand('underline');
      const after = ed.innerHTML;
      return after !== before || after.includes('<u>') || after.includes('text-decoration');
    });
    console.log(`Underline formatting: ${underlineWorks ? 'OK' : 'ISSUE'}`);
    
    // 5. בדוק אם Undo עובד
    const undoOk = await page.evaluate(() => typeof window.exec === 'function');
    if (!undoOk) {
      defects.push({
        severity: 'MAJOR',
        title: 'Undo/Redo not available',
        desc: 'exec() function missing'
      });
    }
    
    // 6. בדוק אם export עובד
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(500);
    const saveStatus = await page.evaluate(() => document.getElementById('saveState')?.textContent);
    console.log(`Save status after Ctrl+S: ${saveStatus}`);
    
  } catch (e) {
    defects.push({
      severity: 'ERROR',
      title: 'Testing error',
      desc: e.message
    });
  }
  
  console.log('\n=== DEFECTS FOUND ===\n');
  if (defects.length === 0) {
    console.log('No critical issues detected in basic functionality');
  } else {
    defects.forEach((d, i) => {
      console.log(`${i+1}. [${d.severity}] ${d.title}`);
      console.log(`   ${d.desc}\n`);
    });
  }
  
  if (consoleErrors.length > 0) {
    console.log('Console Errors:');
    consoleErrors.slice(0, 3).forEach(e => console.log(`  - ${e}`));
  }
  
  await browser.close();
}

await checkDefects();
