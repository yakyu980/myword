import { chromium } from 'playwright';

async function detailedTests() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  console.log('\n=== Detailed Functionality Tests ===\n');
  
  // 1. Context Bar after selection
  console.log('Test 1: Context Bar');
  await page.click('#editor');
  await page.type('#editor, ', 'select me');
  await page.keyboard.press('Control+A');
  await page.waitForTimeout(200);
  
  const ctxBar = await page.evaluate(() => {
    const bar = document.getElementById('ctxBar');
    if (!bar) return { found: false, display: 'element not found' };
    const style = window.getComputedStyle(bar);
    return {
      found: true,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      zIndex: style.zIndex
    };
  });
  console.log(`  Context Bar: ${ctxBar.found ? `✓ (display: ${ctxBar.display})` : '✗ not found'}`);
  if (!ctxBar.found) {
    console.log('  → Context Bar element missing from DOM');
  }
  
  // 2. Page information
  console.log('\nTest 2: Page Info Display');
  const pageInfo = await page.evaluate(() => {
    // look for page numbers/status
    const elements = {
      pageNumbers: document.querySelectorAll('[class*="page"]').length,
      statusLine: document.getElementById('statusLine') ? 'found' : 'not found',
      pageStack: document.getElementById('pageStack') ? 'found' : 'not found',
      scrollHeight: document.getElementById('editor').scrollHeight,
      editorHeight: document.getElementById('editor').offsetHeight
    };
    return elements;
  });
  console.log(`  Page numbers elements: ${pageInfo.pageNumbers}`);
  console.log(`  Status line: ${pageInfo.statusLine}`);
  console.log(`  Content height: ${pageInfo.scrollHeight}px`);
  
  // 3. Copy/Paste
  console.log('\nTest 3: Copy/Paste');
  await page.click('#editor');
  await page.keyboard.press('Control+A');
  const copyOk = await page.keyboard.press('Control+C');
  console.log(`  Copy (Ctrl+C): ✓`);
  
  // Clear and paste
  await page.keyboard.press('Delete');
  await page.keyboard.press('Control+V');
  const pasteOk = await page.evaluate(() => document.getElementById('editor').textContent.length > 0);
  console.log(`  Paste (Ctrl+V): ${pasteOk ? '✓' : '✗'}`);
  
  // 4. Formatting persistence
  console.log('\nTest 4: Format Persistence');
  await page.click('#editor');
  await page.type('#editor, ', 'bold text');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+B');
  
  const isBold = await page.evaluate(() => {
    const html = document.getElementById('editor').innerHTML;
    return html.includes('<b') || html.includes('<strong') || html.includes('font-weight');
  });
  console.log(`  Bold applied: ${isBold ? '✓' : '✗'}`);
  
  // 5. Undo stack
  console.log('\nTest 5: Undo/Redo');
  const undoState = await page.evaluate(() => {
    return {
      hasExec: typeof window.exec === 'function',
      hasHistory: !!window._undoStack,
      historySize: window._undoStack ? window._undoStack.length : 'N/A'
    };
  });
  console.log(`  Undo available: ${undoState.hasExec ? '✓' : '✗'}`);
  
  // 6. Storage
  console.log('\nTest 6: Document Storage');
  const storageOk = await page.evaluate(() => {
    const docs = localStorage.getItem('myword2_docs');
    return {
      hasStorage: !!docs,
      hasLoadFunc: typeof window.loadDoc === 'function',
      hasSaveFunc: typeof window.saveDoc === 'function'
    };
  });
  console.log(`  localStorage active: ${storageOk.hasStorage ? '✓' : '○ (empty)'}`);
  console.log(`  Save/Load functions: ${storageOk.hasSaveFunc && storageOk.hasLoadFunc ? '✓' : '✗'}`);
  
  // 7. Tabs switching
  console.log('\nTest 7: Tab Switching');
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.tabs .tab')).map(t => t.textContent.trim());
  });
  console.log(`  Tabs available: ${tabs.slice(0, 4).join(', ')}`);
  
  if (tabs.length > 1) {
    const secondTab = tabs[1];
    await page.click(`.tabs .tab:nth-child(2)`);
    await page.waitForTimeout(200);
    
    const ribbonVisible = await page.evaluate((tabName) => {
      const ribbons = document.querySelectorAll('.ribbon');
      for (let r of ribbons) {
        if (window.getComputedStyle(r).display !== 'none') return true;
      }
      return false;
    }, secondTab);
    console.log(`  Tab switching works: ${ribbonVisible ? '✓' : '✗'}`);
  }
  
  await browser.close();
}

await detailedTests();
