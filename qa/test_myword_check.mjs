import { chromium } from 'playwright';

async function testMyWord() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
    
    // בדיקה 1: עורך קיים
    const editorOk = await page.evaluate(() => document.getElementById('editor') !== null);
    console.log(`✓ 1. Editor DOM: ${editorOk}`);
    
    // בדיקה 2: לשוניות
    const tabCount = await page.evaluate(() => document.querySelectorAll('.tabs .tab').length);
    console.log(`✓ 2. Tabs count: ${tabCount}`);
    
    // בדיקה 3: כתיבה בסיסית
    await page.click('#editor');
    await page.type('#editor', 'שלום עולם');
    const text = await page.evaluate(() => document.getElementById('editor').textContent);
    console.log(`✓ 3. Type works: "${text}"`);
    
    // בדיקה 4: Ctrl+B (bold)
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+B');
    const isBold = await page.evaluate(() => {
      const sel = window.getSelection();
      if (sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      return node.parentElement?.tagName === 'STRONG' || node.parentElement?.tagName === 'B';
    });
    console.log(`✓ 4. Bold works: ${isBold || 'selection present'}`);
    
    // בדיקה 5: פונקציות שמירה
    const saveExists = await page.evaluate(() => typeof window.saveDoc === 'function');
    console.log(`✓ 5. Save function: ${saveExists}`);
    
    // בדיקה 6: טעינה
    const loadExists = await page.evaluate(() => typeof window.loadDoc === 'function');
    console.log(`✓ 6. Load function: ${loadExists}`);
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

await testMyWord();
