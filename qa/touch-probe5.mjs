import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { mkdirSync } from 'fs';
import path from 'path';

const FILE = pathToFileURL('C:/Users/yakyu/OneDrive/文档/WONDER LETER/MyWord-v2.html').href;
const OUT = 'C:/Users/yakyu/OneDrive/文档/WONDER LETER/qa/screenshots/touch-probe';
mkdirSync(OUT, { recursive: true });

async function freshSelect(page) {
  await page.evaluate(() => {
    const ed = document.querySelector('#editor');
    ed.innerHTML = '<p>שלום עולם זהו טקסט לבדיקה ארוך מספיק כדי לעצב אותו</p>';
    ed.dispatchEvent(new Event('input', {bubbles:true}));
    window.__exec = [];
    window.__rebuilds = 0;
    if (!document.__hk){ const o=document.execCommand.bind(document); document.execCommand=function(c,...a){window.__exec.push(c);return o(c,...a);}; document.__hk=1; }
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const ed=document.querySelector('#editor'); ed.focus();
    const tn=ed.querySelector('p').firstChild;
    const r=document.createRange(); r.setStart(tn,0); r.setEnd(tn,8);
    const s=getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.waitForTimeout(450); // let ctxBar settle
}

// Tap using raw CDP Input.dispatchTouchEvent (true touch), reading coords once, NO playwright auto-wait
async function rawTouchTap(page, x, y) {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x,y}] });
  await client.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
}

async function rawMouse(page, x, y) {
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.up();
}

const TESTS = [
  { name:'Bold',        frag:'מודגש', detect:h=>/<(b|strong)\b/i.test(h) },
  { name:'Italic',      frag:'נטוי',  detect:h=>/<(i|em)\b/i.test(h) },
  { name:'Underline',   frag:'תחתון', detect:h=>/<u\b/i.test(h)||/underline/i.test(h) },
  { name:'Strike',      frag:'חוצה',  detect:h=>/<(s|strike)\b/i.test(h)||/line-through/i.test(h) },
  { name:'AlignCenter', frag:'מרכז',  detect:h=>/text-align:\s*center/i.test(h)||/align="center"/i.test(h) },
];

async function run(mode, w, h) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, hasTouch:true, isMobile:true, deviceScaleFactor:2 });
  const page = await ctx.newPage();
  await page.goto(FILE); await page.waitForTimeout(700);
  const out = [];
  for (const t of TESTS) {
    await freshSelect(page);
    // read button coords ONCE, right now
    const info = await page.evaluate((frag)=>{
      const bar=document.querySelector('#ctxBar');
      if(!bar) return {none:true};
      if(getComputedStyle(bar).display==='none') return {hidden:true};
      const b=[...bar.querySelectorAll('button')].find(x=>(x.title||'').includes(frag));
      if(!b) return {noBtn:true};
      const r=b.getBoundingClientRect();
      return { x:r.x+r.width/2, y:r.y+r.height/2, w:r.width, h:r.height,
               hit: (()=>{const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return e?{tag:e.tagName,inBtn:b.contains(e)||e===b}:null;})() };
    }, t.frag);
    if(info.none||info.hidden||info.noBtn){ out.push({test:t.name, info}); continue; }

    const before = await page.evaluate(()=>document.querySelector('#editor').innerHTML);
    if(mode==='touch') await rawTouchTap(page, info.x, info.y);
    else await rawMouse(page, info.x, info.y);
    await page.waitForTimeout(400);
    const after = await page.evaluate(()=>({ html:document.querySelector('#editor').innerHTML, exec:window.__exec }));
    out.push({
      test:t.name, btn:{x:Math.round(info.x),y:Math.round(info.y),w:info.w}, hit:info.hit,
      execCalled: after.exec, applied: t.detect(after.html)&&!t.detect(before),
      htmlChanged: before!==after.html
    });
    if(t.name==='Bold') await page.screenshot({ path: path.join(OUT, `${w}-${mode}-bold-raw.png`) });
  }
  await browser.close();
  return { mode, vp:`${w}x${h}`, out };
}

(async()=>{
  const all=[];
  for (const [w,h] of [[390,844],[360,740]]) {
    all.push(await run('mouse', w, h));
    all.push(await run('touch', w, h));
  }
  console.log(JSON.stringify(all,null,2));
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
