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
  
  console.log('\n=== Tracing _setGoal and updateGoalProgress ===');
  
  try {
    // Detailed step-by-step
    const debug = await page.evaluate(() => {
      window.currentDocId = 'test-' + Date.now();
      
      // Check _getGoals before
      const goalsBefore = window._getGoals();
      console.log('Step 1 - Goals before _setGoal:', JSON.stringify(goalsBefore));
      console.log('Step 1 - currentDocId:', window.currentDocId);
      
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>This is test content with many words to make the word count work properly</p>';
      
      // Call _setGoal
      window._setGoal(50);
      
      // Check goals after
      const goalsAfter = window._getGoals();
      console.log('Step 2 - Goals after _setGoal:', JSON.stringify(goalsAfter));
      console.log('Step 2 - Goal for', window.currentDocId, '=', goalsAfter[window.currentDocId]);
      
      // Check if element exists now
      let el = document.getElementById('goalProgress');
      console.log('Step 3 - goalProgress element exists:', !!el);
      
      // Check the logic manually
      const goal = window.currentDocId ? window._getGoals()[window.currentDocId] : 0;
      console.log('Step 4 - Computed goal:', goal);
      console.log('Step 4 - Should create element:', goal > 0);
      
      if (!el && goal) {
        console.log('Step 5 - Creating element manually to test');
        el = document.createElement('span');
        el.id = 'goalProgress';
        document.querySelector('.status .left')?.appendChild(el);
        console.log('Step 5 - Element created and appended');
      }
      
      // Check again
      el = document.getElementById('goalProgress');
      console.log('Step 6 - goalProgress element now exists:', !!el);
      console.log('Step 6 - Parent:', el?.parentElement?.className);
      
      return {
        goalFound: !!el,
        goalValue: goal
      };
    });
    
    console.log('\nFinal result:', debug);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

debugGoal().catch(console.error);
