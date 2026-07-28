import { chromium } from 'playwright';

async function testPrintExport() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  console.log('\n=== Print/Export Functions Test ===\n');
  
  // Check what functions actually exist
  const functions = await page.evaluate(() => {
    const funcs = {};
    
    // Look for print/export related functions
    const names = [
      'exportAndPrint',
      'exportDocWord',
      'exportHTML',
      'exportDocPDF',
      'openPrint',
      'printDoc',
      'print',
      'window.print'
    ];
    
    for (const name of names) {
      const actualName = name.replace('window.', '');
      funcs[actualName] = typeof window[actualName];
    }
    
    return funcs;
  });
  
  console.log('Export/Print functions:');
  Object.entries(functions).forEach(([name, type]) => {
    if (type !== 'undefined') {
      console.log(`  ✓ ${name}: ${type}`);
    }
  });
  
  // Check buttons
  const buttons = await page.evaluate(() => {
    const fileTab = Array.from(document.querySelectorAll('.tabs .tab'))
      .find(t => t.textContent.includes('קובץ'));
    
    if (!fileTab) return [];
    
    // click file tab
    fileTab.click();
    
    // wait a tick
    return new Promise(resolve => {
      setTimeout(() => {
        const ribbon = document.querySelector('[data-ribbon="file"]');
        if (!ribbon) return resolve([]);
        
        const btns = Array.from(ribbon.querySelectorAll('button'))
          .map(b => ({
            title: b.title,
            text: b.textContent.trim().substring(0, 20),
            hasClick: !!b.onclick || b.hasAttribute('onclick')
          }))
          .filter(b => b.title || b.text);
        
        return resolve(btns);
      }, 200);
    });
  });
  
  console.log('\nFile tab buttons:');
  if (buttons.length > 0) {
    buttons.slice(0, 10).forEach(b => {
      console.log(`  • ${b.title || b.text} (clickable: ${b.hasClick})`);
    });
  } else {
    console.log('  (none found or error)');
  }
  
  // Try to click export button directly
  console.log('\nTesting export button click...');
  try {
    const exportOk = await page.evaluate(() => {
      const ribbonFile = document.querySelector('[data-ribbon="file"]');
      if (!ribbonFile) return 'file ribbon not found';
      
      const buttons = ribbonFile.querySelectorAll('button');
      let exportBtn = null;
      
      for (let btn of buttons) {
        const text = (btn.title || btn.textContent).toLowerCase();
        if (text.includes('export') || text.includes('word') || text.includes('ייצוא')) {
          exportBtn = btn;
          break;
        }
      }
      
      if (!exportBtn) return 'export button not found';
      
      // check if it has an onclick handler
      if (exportBtn.onclick) return 'has onclick handler';
      if (exportBtn.hasAttribute('data-action')) return 'has data-action: ' + exportBtn.getAttribute('data-action');
      
      return 'button found but no handler detected';
    });
    
    console.log(`  Result: ${exportOk}`);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  
  await browser.close();
}

await testPrintExport();
