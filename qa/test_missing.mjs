import { chromium } from 'playwright';

async function testMissing() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  console.log('\n=== Testing Missing Functions ===\n');
  
  // בדוק insertTable בשמות שונים
  const tableNames = ['insertTable', 'addTable', 'openTablePicker', 'initTablePicker'];
  const tableFunc = await page.evaluate((names) => {
    return names.map(n => `${n}: ${typeof window[n]}`).join(', ');
  }, tableNames);
  console.log(`Table functions: ${tableFunc}`);
  
  // בדוק Find בשמות שונים
  const findNames = ['openFind', 'findOpen', 'initFind', 'openFindReplace', 'findReplace'];
  const findFunc = await page.evaluate((names) => {
    return names.map(n => `${n}: ${typeof window[n]}`).join(', ');
  }, findNames);
  console.log(`Find functions: ${findFunc}`);
  
  // בדוק כלי אחרים
  const toolFns = await page.evaluate(() => {
    const tools = {
      'Spellcheck': typeof window.openSpellCheck,
      'Statistics': typeof window.openStats,
      'Snippets': typeof window.openSnippets,
      'Bookmark': typeof window.initBookmarkNav,
      'TOC': typeof window.initTOC,
      'Speech recognition': typeof window.initSpeechRecognition,
    };
    return Object.entries(tools).map(([k,v]) => `${k}: ${v}`).join(', ');
  });
  console.log(`Tool functions: ${toolFns}`);
  
  // בדוק אם יש כפתור לטבלה בממשק
  const tableBtn = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.title || b.textContent).filter(t => t.toLowerCase().includes('table')).slice(0, 3).join(', ');
  });
  console.log(`\nTable button found in UI: ${tableBtn || 'none'}`);
  
  // בדוק כפתורים של Find
  const findBtn = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, #*')).map(b => b.id || b.title || b.textContent).filter(t => (t || '').toLowerCase().includes('find')).slice(0, 3).join(', ');
  });
  console.log(`Find button in UI: ${findBtn || 'none'}`);
  
  await browser.close();
}

await testMissing();
