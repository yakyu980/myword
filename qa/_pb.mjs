import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const HTML = path.resolve('C:/Users/yakyu/OneDrive/文档/WONDER LETER/MyWord-v2.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const r = await p.evaluate(() => {
  const ed = document.getElementById('editor');
  ed.querySelectorAll('.free-obj').forEach(o=>o.remove());
  ed.innerHTML = '<p id="a">לפני</p><p id="b">אחרי</p>';
  updatePagination();
  const before = { a: ed.querySelector('#a').offsetTop, b: ed.querySelector('#b').offsetTop };
  // caret in #a
  const n = ed.querySelector('#a').firstChild;
  const rg = document.createRange(); rg.setStart(n, n.length); rg.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
  document.getElementById('insPageBreak').click();
  return { before };
});
await p.waitForTimeout(700);
const after = await p.evaluate(() => {
  const ed = document.getElementById('editor');
  const ppc = getPxPerCm(), cycle = (29.7+1.5)*ppc, pageH = 29.7*ppc;
  const kids = [...ed.children].map(k => ({
    tag: k.tagName, id: k.id, pb: k.hasAttribute('data-pagebreak'),
    top: Math.round(k.offsetTop), h: Math.round(k.offsetHeight),
    mt: k.style.marginTop, pushed: k.getAttribute('data-pushed'),
    txt: (k.textContent||'').slice(0,12)
  }));
  const edCS = getComputedStyle(ed);
  return { kids, ppc: Math.round(ppc), cycle: Math.round(cycle), pageH: Math.round(pageH),
           edPadTop: edCS.paddingTop, edOffTop: ed.offsetTop,
           pageTop: document.querySelector('.page')?.offsetTop,
           pagePadTop: getComputedStyle(document.querySelector('.page')).paddingTop };
});
console.log(JSON.stringify(after, null, 1));
await b.close();
