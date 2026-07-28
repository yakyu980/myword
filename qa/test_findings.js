// Test 1: Goal Progress Bar
console.log('=== TEST 1: Goal Progress Bar ===');
const editor = document.getElementById('editor');
const status = document.querySelector('.status .left');

// Create test document
window.currentDocId = 'test-doc';
editor.innerHTML = '<p>Hello world test paragraph one</p><p>This is the second paragraph</p>';

// Open stats dialog to set goal
document.getElementById('tlStats')?.click();
setTimeout(() => {
  const input = document.getElementById('_goalInput');
  if (input) {
    input.value = '50';
    document.getElementById('_goalSet')?.click();
    
    setTimeout(() => {
      const goalEl = document.getElementById('goalProgress');
      console.log('Goal Progress Element:', goalEl);
      console.log('Goal Progress HTML:', goalEl?.outerHTML);
      console.log('Goal Progress Parent:', goalEl?.parentElement?.className);
      
      // Test 2: Presentation Slide Count
      console.log('\n=== TEST 2: Presentation Slide Count ===');
      editor.innerHTML = '<h1>Slide 1</h1><p>Content 1</p><h1>Slide 2</h1><p>Content 2</p>';
      
      setTimeout(() => {
        document.getElementById('vwPresent')?.click();
        setTimeout(() => {
          const counter = document.querySelector('.preso-counter');
          console.log('Slide Counter:', counter?.textContent);
          console.log('Full Overlay:', document.getElementById('presoOverlay'));
        }, 500);
      }, 100);
    }, 600);
  }
}, 500);
