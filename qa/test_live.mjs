import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

async function testFeatures() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Load the file
  const filePath = path.join(process.cwd(), '..', 'MyWord-v2.html');
  const fileUrl = 'file:///' + filePath.split(path.sep).join('/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl);
  await page.waitForTimeout(2000);
  
  console.log('\n=== TEST 1: Goal Progress Bar ===');
  
  try {
    // Set some content and a goal
    await page.evaluate(() => {
      window.currentDocId = 'test-' + Date.now();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>This is test content with many words to make the word count work properly for testing the goal progress bar</p>';
    });
    
    // Wait for initialization
    await page.waitForTimeout(500);
    
    // Call _setGoal
    await page.evaluate(() => {
      window._setGoal(50);
    });
    
    await page.waitForTimeout(700);
    
    // Check if element exists
    const result = await page.evaluate(() => {
      const el = document.getElementById('goalProgress');
      if (!el) return { found: false };
      
      return {
        found: true,
        text: el.textContent,
        parentClass: el.parentElement?.className,
        parentTag: el.parentElement?.tagName,
        hasBar: !!el.querySelector('.gp-bar'),
        hasFill: !!el.querySelector('.gp-fill')
      };
    });
    
    if (result.found) {
      console.log('✓ Goal Progress Element Found');
      console.log('  Text:', result.text);
      console.log('  Parent:', result.parentTag + '.' + result.parentClass);
      console.log('  Has Bar:', result.hasBar);
      console.log('  Has Fill:', result.hasFill);
    } else {
      console.log('✗ Goal Progress Element NOT found');
    }
  } catch (e) {
    console.log('✗ Error:', e.message);
  }
  
  console.log('\n=== TEST 2: Presentation Slide Count ===');
  
  try {
    // Clear and set new content with headings
    await page.evaluate(() => {
      const editor = document.getElementById('editor');
      editor.innerHTML = '<h1>First Slide</h1><p>Content here</p><h1>Second Slide</h1><p>More content</p>';
    });
    
    await page.waitForTimeout(500);
    
    // Start presentation
    await page.evaluate(() => {
      window.startPresentation();
    });
    
    await page.waitForTimeout(1000);
    
    // Check the counter
    const pResult = await page.evaluate(() => {
      const counter = document.querySelector('.preso-counter');
      const overlay = document.getElementById('presoOverlay');
      
      if (!counter || !overlay) {
        return { found: false };
      }
      
      const text = counter.textContent;
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      
      return {
        found: true,
        text: text,
        current: match?.[1],
        total: match?.[2],
        overlayVisible: overlay.offsetParent !== null
      };
    });
    
    if (pResult.found) {
      console.log('✓ Presentation Counter Found');
      console.log('  Counter Text:', pResult.text);
      console.log('  Slides Total:', pResult.total);
      console.log('  Overlay Visible:', pResult.overlayVisible);
      
      if (pResult.total === '2') {
        console.log('  ✓ Correct slide count (2 H1 headings = 2 slides)');
      } else {
        console.log('  ⚠ Unexpected slide count:', pResult.total);
      }
    } else {
      console.log('✗ Presentation Counter NOT found');
    }
  } catch (e) {
    console.log('✗ Error:', e.message);
  }
  
  await browser.close();
  console.log('\n=== Tests Complete ===\n');
}

testFeatures().catch(console.error);
