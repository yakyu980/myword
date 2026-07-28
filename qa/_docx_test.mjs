import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path'; import fs from 'fs'; import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1400,height:1000}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto(pathToFileURL(path.resolve(__dirname,'..','MyWord-v2.html')).href,{waitUntil:'networkidle'});
await page.waitForSelector('#editor'); await page.waitForTimeout(900);
const say=(n,v,d='')=>console.log(`${v?'✅':'❌'} ${n}${d?'  ['+d+']':''}`);

const PNG='iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAOklEQVR4nO3QMQEAAAgDoC251a3gLkiQVj+qgQ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4NEC0GgAAT8xkPMAAAAASUVORK5CYII=';
const b64 = await page.evaluate(async (png)=>{
  document.querySelectorAll('.free-obj').forEach(o=>o.remove());
  document.getElementById('docTitle').value='מסמך בדיקה';
  document.getElementById('editor').innerHTML =
    '<h1>כותרת ראשית</h1>'+
    '<p style="text-align:center">פסקה <b>מודגשת</b> ו<i>נטויה</i> ו<u>קו תחתון</u>.</p>'+
    '<p><span style="color:#cc0000;font-size:20pt">טקסט אדום גדול</span></p>'+
    '<h2>כותרת משנה</h2>'+
    '<ul><li>תבליט ראשון</li><li>תבליט שני</li></ul>'+
    '<ol><li>ממוספר אחד</li><li>ממוספר שתיים</li></ol>'+
    '<table><tr><th>עמודה א</th><th>עמודה ב</th></tr><tr><td>ערך 1</td><td>ערך 2</td></tr></table>'+
    '<blockquote>ציטוט</blockquote>'+
    '<p><img src="data:image/png;base64,'+png+'" width="64" height="64"></p>';
  const blob = window.exportDocxReal();
  const buf = await blob.arrayBuffer();
  let s=''; const u=new Uint8Array(buf);
  for(let i=0;i<u.length;i++) s+=String.fromCharCode(u[i]);
  return btoa(s);
}, PNG);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'docx-'));
const file=path.join(tmp,'out.docx');
fs.writeFileSync(file, Buffer.from(b64,'base64'));
say('נוצר קובץ docx', fs.existsSync(file), fs.statSync(file).size+' בתים');

// חילוץ ה-ZIP כדי לאמת מבנה תקני
const zipCopy=path.join(tmp,'out.zip'); fs.copyFileSync(file,zipCopy);
const ex=path.join(tmp,'x');
fs.mkdirSync(ex);
try{ execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipCopy}' -DestinationPath '${ex}' -Force"`,{stdio:'pipe'}); }
catch(e){ console.log('❌ ה-ZIP לא נפתח (מבנה שגוי):', String(e).slice(0,200)); process.exit(1); }
const list=[];
(function walk(d,pre=''){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f);
  if(fs.statSync(p).isDirectory()) walk(p,pre+f+'/'); else list.push(pre+f); } })(ex);
console.log('תוכן החבילה:', list.join(' · '));
say('ה-ZIP תקין ונפתח ע"י Windows', true);
say('כל החלקים הנדרשים קיימים',
  ['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/numbering.xml','word/_rels/document.xml.rels']
    .every(f=>list.includes(f)));
say('התמונה נארזה', list.some(f=>f.startsWith('word/media/')), list.filter(f=>f.startsWith('word/media/')).join(','));

const doc=fs.readFileSync(path.join(ex,'word','document.xml'),'utf8');
say('XML תקין (נפתח ונסגר)', doc.startsWith('<?xml') && doc.trim().endsWith('</w:document>'));
say('כותרות ממופות ל-Heading', /w:pStyle w:val="Heading1"/.test(doc) && /Heading2/.test(doc));
say('מודגש/נטוי/קו-תחתון', /<w:b\/>/.test(doc) && /<w:i\/>/.test(doc) && /<w:u w:val="single"\/>/.test(doc));
say('צבע וגודל גופן', /<w:color w:val="CC0000"\/>/.test(doc) && /<w:sz w:val="40"\/>/.test(doc));
say('יישור מרכז', /<w:jc w:val="center"\/>/.test(doc));
say('רשימות (תבליטים + ממוספרת)', /w:numId w:val="1"/.test(doc) && /w:numId w:val="2"/.test(doc));
say('טבלה', /<w:tbl>/.test(doc) && /<w:tc>/.test(doc));
say('כיוון RTL', /<w:bidi\/>/.test(doc) && /<w:rtl\/>/.test(doc));
say('תמונה משובצת', /<w:drawing>/.test(doc) && /r:embed="rId101"/.test(doc));
say('טקסט עברי נשמר', /כותרת ראשית/.test(doc) && /תבליט ראשון/.test(doc));
say('גודל עמוד A4', /w:pgSz w:w="11906" w:h="16838"/.test(doc));

// אימות XML אמיתי בעזרת מפענח
const bad=await page.evaluate((x)=>{
  const d=new DOMParser().parseFromString(x,'application/xml');
  const err=d.querySelector('parsererror');
  return err?err.textContent.slice(0,200):null;
}, doc);
say('אין שגיאת XML', !bad, bad||'');

console.log('שגיאות: '+errs.length);
fs.rmSync(tmp,{recursive:true,force:true});
await browser.close();
