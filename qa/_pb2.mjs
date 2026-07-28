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
  let h=''; for (let i=0;i<80;i++) h += `<p id="p${i}">שורה מספר ${i} — טקסט לבדיקת זרימה טבעית בין עמודים.</p>`;
  ed.innerHTML = h;
  updatePagination();
  const ppc = getPxPerCm(), cycle=(29.7+1.5)*ppc, pageH=29.7*ppc;
  const kids=[...ed.children];
  // first element whose top >= cycle  (i.e. first on page 2)
  const firstP2 = kids.find(k=>k.offsetTop>=cycle-1);
  const lastP1  = [...kids].reverse().find(k=>k.offsetTop<cycle-1);
  return { ppc:+ppc.toFixed(1), cycle:Math.round(cycle), pageH:Math.round(pageH),
    firstP2:{id:firstP2?.id, top:Math.round(firstP2?.offsetTop), offsetInPage:Math.round(firstP2.offsetTop-cycle)},
    lastP1:{id:lastP1?.id, top:Math.round(lastP1.offsetTop), bottom:Math.round(lastP1.offsetTop+lastP1.offsetHeight),
            distFromPageBottom:Math.round(pageH-(lastP1.offsetTop+lastP1.offsetHeight))} };
});
console.log(JSON.stringify(r,null,1));
await b.close();
