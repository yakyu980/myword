import { chromium } from 'playwright';
import * as path from 'path';

async function debugGoal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Load the file
  const filePath = path.resolve('../MyWord-v2.html');
  const fileUrl = 'file:///' + filePath.split(path.sep).join('/');
  await page.goto(fileUrl);
  await page.waitForTimeout(2000);
  
  console.log('\n=== Debugging Goal Progress Bar ===');
  
  try {
    // Detailed debugging
    const debug = await page.evaluate(() => {
      window.currentDocId = 'test-' + Date.now();
      
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>This is test content with many words to make the word count work properly</p>';
      
      window._setGoal(50);
      
      const el = document.getElementById('goalProgress');
      const status = document.querySelector('.status .left');
      
      return {
        goalFound: !!el,
        statusFound: !!status,
        goalText: el?.textContent,
        statusChildren: status?.children.length,
        statusChildrenIds: Array.from(status?.children || []).map(c => c.id)
      };
    });
    
    console.log('Result:', debug);
    
    if (!debug.goalFound) {
      console.log('Goal element NOT found after _setGoal');
      console.log('Status bar exists:', debug.statusFound);
      console.log('Status children:', debug.statusChildren);
      console.log('Status child IDs:', debug.statusChildrenIds);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

debugGoal().catch(console.error);
