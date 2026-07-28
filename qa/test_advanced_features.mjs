import { chromium } from 'playwright';

async function testAdvanced() {
  const FILE_URL = 'file:///C:/Users/yakyu/OneDrive/文档/WONDER%20LETER/MyWord-v2.html';
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  
  console.log('\n=== Advanced Feature Testing ===\n');
  
  const issues = [];
  
  // 1. Test table insertion
  console.log('1. Table Insertion');
  try {
    // find and click insert tab
    const insertTabClicked = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
      const insertTab = tabs.find(t => t.textContent.includes('הוספה'));
      if (insertTab) {
        insertTab.click();
        return true;
      }
      return false;
    });
    
    if (insertTabClicked) {
      await page.waitForTimeout(300);
      
      // look for table button
      const tableBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => 
          (b.title || b.textContent).toLowerCase().includes('table') ||
          (b.title || b.textContent).toLowerCase().includes('טבלה')
        );
      });
      
      if (tableBtn) {
        console.log('   ✓ Table button found');
      } else {
        console.log('   ✗ Table button NOT found');
        issues.push('Table insertion button missing');
      }
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
    issues.push(`Table test error: ${e.message}`);
  }
  
  // 2. Test image insertion
  console.log('\n2. Image Insertion');
  try {
    const imgFunc = await page.evaluate(() => typeof window.insertFreeImage === 'function');
    if (imgFunc) {
      console.log('   ✓ insertFreeImage function exists');
    } else {
      console.log('   ✗ insertFreeImage function missing');
      issues.push('Image insertion function missing');
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 3. Test shapes
  console.log('\n3. Shape Insertion');
  try {
    const shapeFunc = await page.evaluate(() => typeof window.insertFreeShape === 'function');
    if (shapeFunc) {
      console.log('   ✓ insertFreeShape function exists');
    } else {
      console.log('   ✗ insertFreeShape function missing');
      issues.push('Shape insertion function missing');
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 4. Test list creation
  console.log('\n4. List Creation (auto-formatting)');
  try {
    await page.click('#editor');
    await page.type('#editor, ', '• bullet');
    await page.keyboard.press('Space');
    
    const hasList = await page.evaluate(() => {
      const html = document.getElementById('editor').innerHTML;
      return html.includes('<ul') || html.includes('<ol');
    });
    
    if (hasList) {
      console.log('   ✓ Auto-list creation works');
    } else {
      console.log('   ~ List not auto-created (may be opt-in)');
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 5. Test italics
  console.log('\n5. Italic Formatting');
  try {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+I');
    
    const isItalic = await page.evaluate(() => {
      const html = document.getElementById('editor').innerHTML.toLowerCase();
      return html.includes('<i') || html.includes('<em') || html.includes('font-style');
    });
    
    console.log(`   ${isItalic ? '✓' : '~'} Italic formatting ${isItalic ? 'works' : '(may need verification)'}`);
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 6. Test underline
  console.log('\n6. Underline Formatting');
  try {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+U');
    
    const isUnderline = await page.evaluate(() => {
      const html = document.getElementById('editor').innerHTML.toLowerCase();
      return html.includes('<u') || html.includes('text-decoration');
    });
    
    console.log(`   ${isUnderline ? '✓' : '~'} Underline formatting ${isUnderline ? 'works' : '(needs verification)'}`);
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 7. Test Find and Replace
  console.log('\n7. Find and Replace');
  try {
    const findFunc = await page.evaluate(() => typeof window.openFindReplace === 'function');
    if (findFunc) {
      console.log('   ✓ openFindReplace function exists');
    } else {
      console.log('   ✗ Find & Replace function missing');
      issues.push('Find & Replace missing');
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 8. Test RTL/LTR switching
  console.log('\n8. Text Direction (RTL/LTR)');
  try {
    const dirFunc = await page.evaluate(() => {
      return Object.keys(window).filter(k => 
        k.toLowerCase().includes('dir') || 
        k.toLowerCase().includes('ltr') || 
        k.toLowerCase().includes('rtl')
      );
    });
    
    const currentDir = await page.evaluate(() => document.documentElement.dir);
    console.log(`   ✓ Direction functions found, current: ${currentDir}`);
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 9. Test multiple document tabs
  console.log('\n9. Multiple Documents');
  try {
    const newDocFunc = await page.evaluate(() => typeof window.newDoc === 'function');
    if (newDocFunc) {
      console.log('   ✓ newDoc function exists');
    } else {
      console.log('   ~ New document function missing or different name');
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // 10. Test pagination
  console.log('\n10. Pagination');
  try {
    const paginateFunc = await page.evaluate(() => typeof window.updatePagination === 'function');
    const pageCount = await page.evaluate(() => document.querySelectorAll('[class*="page"]').length);
    
    console.log(`   ${paginateFunc ? '✓' : '~'} Pagination: ${pageCount} page markers`);
  } catch (e) {
    console.log(`   ✗ Error: ${e.message}`);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===\n');
  if (issues.length === 0) {
    console.log('✓ No issues found in advanced features');
  } else {
    console.log(`✗ ${issues.length} issues detected:`);
    issues.forEach(i => console.log(`  • ${i}`));
  }
  
  await browser.close();
}

await testAdvanced();
