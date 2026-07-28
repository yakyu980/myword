import { chromium } from 'playwright';
import * as path from 'path';

async function debugGoal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Load the file
  const filePath = path.resolve('../MyWord-v2.html');
  const fileUrl = 'file:///' + filePath.split(path.sep).join('/');
  await page.goto(fileUrl);
  await page.waitForTimeout(2000);
  
  console.log('\n=== Tracing _setGoal and updateGoalProgress ===');
  
  try {
    const debug = await page.evaluate(() => {
      const log = (msg) => console.log('[EVAL]', msg);
      
      log('Starting test');
      window.currentDocId = 'test-' + Date.now();
      log('Set currentDocId: ' + window.currentDocId);
      
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>This is test content with many words</p>';
      log('Set editor content');
      
      const goalsBefore = window._getGoals();
      log('Goals before: ' + JSON.stringify(goalsBefore));
      
      window._setGoal(50);
      log('Called _setGoal(50)');
      
      const goalsAfter = window._getGoals();
      log('Goals after: ' + JSON.stringify(goalsAfter));
      
      const el = document.getElementById('goalProgress');
      log('Goal element exists: ' + (!!el));
      
      return {
        goalElement: !!el,
        docId: window.currentDocId,
        savedGoal: goalsAfter[window.currentDocId]
      };
    });
    
    console.log('\nResult:', debug);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

debugGoal().catch(console.error);
