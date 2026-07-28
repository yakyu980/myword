import { chromium } from 'playwright';

async function debugGoal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Load via HTTP
  const url = 'http://localhost:9999/MyWord-v2.html';
  await page.goto(url);
  await page.waitForTimeout(2000);
  
  console.log('\n=== Testing Goal Progress Bar (HTTP) ===');
  
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
      log('Goal element text: ' + el?.textContent);
      
      return {
        goalElement: !!el,
        goalText: el?.textContent,
        docId: window.currentDocId,
        savedGoal: goalsAfter[window.currentDocId]
      };
    });
    
    console.log('\nResult:', debug);
    
    if (debug.goalElement) {
      console.log('✓ Goal progress bar works via HTTP');
    } else {
      console.log('✗ Goal progress bar still not created');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

debugGoal().catch(console.error);
