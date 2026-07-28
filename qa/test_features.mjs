import { chromium } from 'playwright';

async function testFeatures() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  const results = [];
  
  try {
    // 1. הדפסה
    const printFn = await page.evaluate(() => typeof window.exportAndPrint === 'function');
    results.push(`Print function: ${printFn}`);
    
    // 2. ייצוא Word
    const wordExport = await page.evaluate(() => typeof window.exportDocWord === 'function');
    results.push(`Word export function: ${wordExport}`);
    
    // 3. ייצוא HTML
    const htmlExport = await page.evaluate(() => typeof window.exportHTML === 'function');
    results.push(`HTML export function: ${htmlExport}`);
    
    // 4. Undo/Redo
    const undo = await page.evaluate(() => typeof window.exec === 'function');
    results.push(`Undo/Redo function: ${undo}`);
    
    // 5. הוספת תמונה
    const addImg = await page.evaluate(() => typeof window.insertFreeImage === 'function');
    results.push(`Insert image function: ${addImg}`);
    
    // 6. הוספת טבלה
    const addTable = await page.evaluate(() => typeof window.insertTable === 'function');
    results.push(`Insert table function: ${addTable}`);
    
    // 7. הוספת צורות
    const addShape = await page.evaluate(() => typeof window.insertFreeShape === 'function');
    results.push(`Insert shape function: ${addShape}`);
    
    // 8. זום
    const zoom = await page.evaluate(() => document.getElementById('zoomSlider') !== null);
    results.push(`Zoom slider: ${zoom}`);
    
    // 9. מנהל מסמכים
    const docMgr = await page.evaluate(() => typeof window.openDocManager === 'function');
    results.push(`Doc manager function: ${docMgr}`);
    
    // 10. מחשבון
    const calc = await page.evaluate(() => typeof window.openCalculator === 'function');
    results.push(`Calculator function: ${calc}`);
    
    // 11. בדיקה: האם תצוגה (View) פועלת
    const viewTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      return tabs.some(t => t.textContent.includes('תצוגה') || t.textContent.includes('view'));
    });
    results.push(`View tab found: ${viewTab}`);
    
    // 12. בדיקה: האם פריסה (Layout) פועלת
    const layoutTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      return tabs.some(t => t.textContent.includes('פריסה') || t.textContent.includes('layout'));
    });
    results.push(`Layout tab found: ${layoutTab}`);
    
    // 13. בדיקה: הדבקה
    const paste = await page.evaluate(() => typeof window.initPasteSanitizer === 'function');
    results.push(`Paste sanitizer: ${paste}`);
    
    // 14. בדיקה: חיפוש והחלפה
    const find = await page.evaluate(() => typeof window.openFind === 'function');
    results.push(`Find function: ${find}`);
    
    // 15. בדיקה: שמירה אוטומטית
    const autoSave = await page.evaluate(() => typeof window.scheduleSave === 'function');
    results.push(`Auto-save function: ${autoSave}`);
    
  } catch (e) {
    results.push(`Error: ${e.message}`);
  }
  
  console.log('\n=== MyWord v2 Feature Check ===');
  results.forEach((r, i) => console.log(`${i+1}. ${r}`));
  
  await browser.close();
}

await testFeatures();
