import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const HTML = path.resolve('C:/Users/yakyu/OneDrive/文档/WONDER LETER/MyWord-v2.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const vectors = ['javascript://%0aalert(1)', 'javascript:alert(1)', 'vbscript://%0amsgbox(1)',
                 'JaVaScRiPt://%0d%0aalert(2)', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
                 'example.com', 'https://ok.com', 'a@b.com'];
const out = await p.evaluate(vs => vs.map(v => {
  const href = normalizeUrl(v);
  const a = document.createElement('a'); a.setAttribute('href', href);
  return { input: v, normalized: href, browserSees: a.href.slice(0, 60),
           blockedByGuard: window._isSafeUserUrl ? !window._isSafeUserUrl(v) : null };
}), vectors);
console.table(out);
// live proof: does the produced href execute?
const exec = await p.evaluate(() => {
  const href = normalizeUrl('javascript://%0awindow.__XSS=1');
  const a = document.createElement('a'); a.href = href; a.textContent = 'x';
  document.getElementById('editor').appendChild(a);
  a.click();
  return { href, xss: !!window.__XSS };
});
console.log('EXEC TEST:', JSON.stringify(exec));
await b.close();
