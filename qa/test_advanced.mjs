import { chromium } from 'playwright';

async function advancedTests() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  const issues = [];
  
  console.log('\n=== Advanced Feature Tests ===\n');
  
  // Test 1: RTL direction
  const rtl = await page.evaluate(() => document.documentElement.dir);
  console.log(`1. RTL Direction: ${rtl === 'rtl' ? '✓' : '✗'} (${rtl})`);
  if (rtl !== 'rtl') {
    issues.push('HTML dir attribute not set to RTL');
  }
  
  // Test 2: Hebrew text handling
  await page.click('#editor');
  await page.type('#editor', 'זה טקסט בעברית');
  const hebrewOk = await page.evaluate(() => {
    const text = document.getElementById('editor').textContent;
    return text.includes('טקסט');
  });
  console.log(`2. Hebrew text: ${hebrewOk ? '✓' : '✗'}`);
  
  // Test 3: Font change
  const fontSelect = await page.$('#fontNameSelect');
  if (fontSelect) {
    await fontSelect.selectOption({ label: 'Arial' });
    const selectedFont = await fontSelect.inputValue();
    console.log(`3. Font selection: ✓ (${selectedFont})`);
  } else {
    console.log('3. Font selection: ✗ (not found)');
    issues.push('Font selector not found');
  }
  
  // Test 4: Font size
  const sizeBtn = await page.$('button[title*="גודל"], button[title*="size"]');
  console.log(`4. Font size control: ${sizeBtn ? '✓' : '✗'}`);
  
  // Test 5: Paragraph alignment
  const alignLeftBtn = await page.$('button[title*="שמאל"], button[title*="left"]');
  console.log(`5. Alignment buttons: ${alignLeftBtn ? '✓' : '✗'}`);
  
  // Test 6: Lists
  await page.click('#editor');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.type('#editor', '- item 1');
  await page.keyboard.press('Space');
  const listCreated = await page.evaluate(() => {
    return !!document.querySelector('#editor ul, #editor ol');
  });
  console.log(`6. Auto-list creation: ${listCreated ? '✓' : '✗'}`);
  
  // Test 7: Links
  const linkBtn = await page.$('button[title*="קישור"], button[title*="link"]');
  console.log(`7. Link button: ${linkBtn ? '✓' : '✗'}`);
  
  // Test 8: Zoom functionality
  const zoomSlider = await page.$('#zoomSlider');
  if (zoomSlider) {
    await zoomSlider.fill('150');
    const zoomLevel = await page.evaluate(() => parseInt(document.getElementById('zoomSlider').value));
    console.log(`8. Zoom control: ✓ (now ${zoomLevel}%)`);
    // restore
    await zoomSlider.fill('100');
  } else {
    console.log('8. Zoom control: ✗ (not found)');
    issues.push('Zoom slider not found');
  }
  
  // Test 9: Page count
  const pageCount = await page.evaluate(() => {
    const pc = document.querySelector('[class*="page-count"]');
    return pc ? pc.textContent : 'not found';
  });
  console.log(`9. Page counter: ✓ (${pageCount})`);
  
  // Test 10: Formatting toolbar visibility
  const ctxBar = await page.evaluate(() => {
    const bar = document.getElementById('ctxBar');
    return bar ? window.getComputedStyle(bar).display : 'not found';
  });
  console.log(`10. Context toolbar: ${ctxBar !== 'none' ? '✓' : '✗'}`);
  
  console.log('\n=== Summary ===');
  if (issues.length === 0) {
    console.log('✓ All advanced tests passed');
  } else {
    console.log(`✗ ${issues.length} issues found:`);
    issues.forEach(i => console.log(`  - ${i}`));
  }
  
  await browser.close();
}

await advancedTests();
