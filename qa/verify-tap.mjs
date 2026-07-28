import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { mkdirSync } from 'fs';

const FILE = pathToFileURL('C:/Users/yakyu/OneDrive/文档/WONDER LETER/MyWord-v2.html').href;
const OUT  = 'C:/Users/yakyu/OneDrive/文档/WONDER LETER/qa/screenshots/verify-tap';
mkdirSync(OUT, { recursive: true });

// Reset editor to a known paragraph and select chars [0..target] of first text node.
async function freshSelect(page, end = 8) {
  await page.evaluate(() => {
    const ed = document.querySelector('#editor');
    ed.innerHTML = '<p>שלום עולם זהו טקסט לבדיקה ארוך מספיק כדי לעצב</p>';
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    // hook execCommand to record every real invocation
    if (!document.__hk) {
      const o = document.execCommand.bind(document);
      document.execCommand = function (c, ...a) { (window.__exec = window.__exec || []).push(c); return o(c, ...a); };
      document.__hk = 1;
    }
    window.__exec = [];
  });
  await page.waitForTimeout(200);
  await page.evaluate((end) => {
    const ed = document.querySelector('#editor'); ed.focus();
    const tn = ed.querySelector('p').firstChild;
    const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, end);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  }, end);
  await page.waitForTimeout(450); // let ctxBar appear & settle
}

const editorHTML = (page) => page.evaluate(() => document.querySelector('#editor').innerHTML);
const barVisible = (page) => page.evaluate(() => {
  const b = document.querySelector('#ctxBar');
  return !!b && getComputedStyle(b).display !== 'none';
});

// Instrument the pointerup/click flow on a specific button (by title) without firing anything.
async function instrument(page, title) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('#ctxBar .ctx-cmds button')].find(x => x.title === t);
    window.__trace = { pointerup: 0, click: 0 };
    if (!b) { window.__trace.notfound = true; return; }
    b.addEventListener('pointerup', () => window.__trace.pointerup++, true);
    b.addEventListener('click',     () => window.__trace.click++,     true);
  }, title);
}
const trace = (page) => page.evaluate(() => window.__trace);

// Trusted touch at the button's visual center via CDP touchscreen.
// We compute the center from the real bounding box and let the BROWSER
// generate/suppress compatibility events. We do NOT call dispatchEvent.
// (Playwright's locator.tap() actionability hit-test wrongly thinks the
//  overlapping <p> intercepts the point; touchscreen.tap bypasses that
//  guard while remaining a genuine trusted CDP touch.)
async function centerOf(page, title) {
  const loc = page.locator(`#ctxBar .ctx-cmds button[title=${JSON.stringify(title)}]`).first();
  await loc.waitFor({ state: 'visible', timeout: 3000 });
  const box = await loc.boundingBox();
  if (!box) throw new Error('no bounding box for ' + title);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function tapByTitle(page, title) {
  const { x, y } = await centerOf(page, title);
  await page.touchscreen.tap(x, y); // TRUSTED CDP touch — no manual dispatch
  await page.waitForTimeout(250);
}
async function clickByTitle(page, title) {
  const { x, y } = await centerOf(page, title);
  await page.mouse.click(x, y); // TRUSTED CDP mouse — no manual dispatch
  await page.waitForTimeout(250);
}

const results = [];

async function run() {
  const browser = await chromium.launch();

  // ---------- MOBILE: trusted tap ----------
  const mobile = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 740 } });
  const page = await mobile.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(400);

  // before/after screenshot for Bold
  await freshSelect(page);
  if (!await barVisible(page)) { console.log('FATAL: ctxBar not visible on mobile after select'); }
  await page.screenshot({ path: `${OUT}/bold-before.png` });

  // Define checks: title -> predicate(htmlBefore, htmlAfter) and which tag we expect
  const checks = [
    { key: 'Bold',      title: 'מודגש (Ctrl+B)',          test: h => /<b>|<b\s|font-weight:\s*bold|<strong/i.test(h) },
    { key: 'Italic',    title: 'נטוי (Ctrl+I)',           test: h => /<i>|<i\s|font-style:\s*italic|<em/i.test(h) },
    { key: 'Underline', title: 'קו תחתון (Ctrl+U)',       test: h => /<u>|<u\s|text-decoration[^;"]*underline/i.test(h) },
    { key: 'Strike',    title: 'קו חוצה',                  test: h => /<strike|<s>|<s\s|line-through/i.test(h) },
    { key: 'AlignCtr',  title: 'מרכז',                     test: h => /text-align:\s*center|justifycenter/i.test(h) },
    { key: 'AlignLeft', title: 'יישור לשמאל',              test: h => /text-align:\s*left/i.test(h) },
    { key: 'AlignRight',title: 'יישור לימין',              test: h => /text-align:\s*right/i.test(h) },
    { key: 'Bullet',    title: 'רשימת תבליטים',            test: h => /<ul/i.test(h) },
    { key: 'Number',    title: 'רשימה ממוספרת',            test: h => /<ol/i.test(h) },
  ];

  for (const c of checks) {
    await freshSelect(page);
    await instrument(page, c.title);
    const before = await editorHTML(page);
    let err = null;
    try { await tapByTitle(page, c.title); } catch (e) { err = e.message; }
    const after = await editorHTML(page);
    const tr = await trace(page);
    const changed = c.test(after) && after !== before;
    const r = { key: c.key, tapChanged: changed, pointerup: tr.pointerup, click: tr.click, err };
    results.push(r);
    if (c.key === 'Bold') {
      await page.screenshot({ path: `${OUT}/bold-after.png` });
      r._boldAfterSnippet = after.slice(0, 140);
    }
  }

  // Font size +/- : measure font-size px of selection before/after
  async function fontPx(page) {
    return page.evaluate(() => {
      const tn = document.querySelector('#editor p').firstChild;
      const el = tn.nodeType === 3 ? tn.parentElement : tn;
      return parseFloat(getComputedStyle(el).fontSize);
    });
  }
  await freshSelect(page);
  const fpA = await fontPx(page);
  let fontErr = null;
  try { await tapByTitle(page, 'הגדל גופן (אפשר ללחוץ שוב ושוב)'); } catch (e) { fontErr = e.message; }
  const fpB = await fontPx(page);
  results.push({ key: 'FontUp', tapChanged: fpB > fpA, pointerup: '-', click: '-', detail: `${fpA}->${fpB}`, err: fontErr });

  // Highlight (marker): tapping opens a color palette, then we pick a color.
  await freshSelect(page);
  let hlErr = null, hlChanged = false;
  try {
    await tapByTitle(page, 'מרקר / צבע רקע');
    await page.waitForTimeout(200);
    // palette swatches live in #ctxColors or similar; tap first colored swatch
    const swatch = page.locator('.ctx-colors [data-color], #ctxColors [data-color], .color-swatch').first();
    if (await swatch.count()) { const b = await swatch.boundingBox(); if (b) { await page.touchscreen.tap(b.x + b.width/2, b.y + b.height/2); await page.waitForTimeout(200); } }
  } catch (e) { hlErr = e.message; }
  const hlAfter = await editorHTML(page);
  hlChanged = /background-color|backColor|background:/i.test(hlAfter);
  results.push({ key: 'Highlight', tapChanged: hlChanged, pointerup: '-', click: '-', err: hlErr });

  // Double-fire test for Bold: tap once, expect bold present exactly once (not toggled off).
  await freshSelect(page);
  await tapByTitle(page, 'מודגש (Ctrl+B)');
  const dblAfter = await editorHTML(page);
  const boldOn = /<b>|<b\s|font-weight:\s*bold|<strong/i.test(dblAfter);
  results.push({ key: 'Bold-singleTap-stillBold', tapChanged: boldOn, pointerup: '-', click: '-' });

  await mobile.close();

  // ---------- DESKTOP: mouse, no touch ----------
  const desk = await browser.newContext({ hasTouch: false, viewport: { width: 1200, height: 900 } });
  const dpage = await desk.newPage();
  await dpage.goto(FILE);
  await dpage.waitForTimeout(400);
  await freshSelect(dpage);
  const dBefore = await editorHTML(dpage);
  let dErr = null;
  try { await clickByTitle(dpage, 'מודגש (Ctrl+B)'); } catch (e) { dErr = e.message; }
  const dAfter = await editorHTML(dpage);
  const dBold = /<b>|<b\s|font-weight:\s*bold|<strong/i.test(dAfter) && dAfter !== dBefore;
  results.push({ key: 'Desktop-Bold-click', tapChanged: dBold, pointerup: '-', click: '-', err: dErr });
  await desk.close();

  await browser.close();

  console.log('\n=== VERIFY-TAP RESULTS ===');
  for (const r of results) console.log(JSON.stringify(r));
}

run().catch(e => { console.error('CRASH', e); process.exit(2); });
