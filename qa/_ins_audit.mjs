// audit of the "insert" ribbon — live behaviour vs Word expectations
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const HTML = path.resolve('C:/Users/yakyu/OneDrive/文档/WONDER LETER/MyWord-v2.html');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await ctx.newPage();
page.setDefaultTimeout(6000);
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.evaluate(() => {
  window.__reset = () => {
    const editor = document.getElementById('editor');
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    editor.innerHTML = '<p>שלום עולם</p>';
    document.querySelectorAll('.mw-panel,#_shapePick,#_symPick,#_emojiPick,#_calc,#bookmarkNavPanel,#_imgRibbonMenu,#_tblRibbonMenu,#_tbxRibbonMenu,#_shpRibbonMenu').forEach(p => p.remove());
    const ov = document.getElementById('mwDlgOverlay');
    if (ov) ov.style.display = 'none';
    window._docHeader = null; window._docFooter = null;
    editor.focus();
  };
  window.__caretEnd = () => {
    const p = document.querySelector('#editor p');
    const r = document.createRange(); r.selectNodeContents(p); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  };
  window.__selAll = () => {
    const p = document.querySelector('#editor p');
    const r = document.createRange(); r.selectNodeContents(p);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  };
  window.__dlgOpen = () => {
    const o = document.getElementById('mwDlgOverlay');
    return !!o && o.style.display !== 'none';
  };
  window.__dlgText = () => {
    const c = document.getElementById('mwDlgCard');
    return c ? c.innerText.replace(/\n/g, ' | ') : '';
  };
  window.__dlgFill = (v) => {
    const c = document.getElementById('mwDlgCard');
    if (!c) return false;
    const i = c.querySelector('input[type=text],textarea');
    if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }
    const ok = c.querySelector('[data-mw-default]');
    if (ok) ok.click();
    return true;
  };
  window.__dlgCancel = () => {
    const o = document.getElementById('mwDlgOverlay');
    if (!o) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    o.style.display = 'none';
  };
  // NOTE: offsetParent is null for position:fixed — never use it to test visibility here.
  const SKIP = ['ctxBar', 'mwDlgOverlay', 'mwSidebar', 'pageStack', 'rcMenu', '_hint', 'mobBar',
                'docTabsBar', 'editorArea', 'tblSelBar'];
  window.__vis = (d) => {
    const cs = getComputedStyle(d);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = d.getBoundingClientRect();
    return r.width > 40 && r.height > 20;
  };
  window.__anyPanel = () => {
    const cands = [...document.body.children].filter(d => {
      if (d.tagName !== 'DIV' && d.tagName !== 'SECTION') return false;
      if (SKIP.includes(d.id)) return false;
      const cs = getComputedStyle(d);
      if (cs.position !== 'absolute' && cs.position !== 'fixed') return false;
      return window.__vis(d);
    });
    return cands.map(d => ({ id: d.id, cls: (d.className || '').toString().slice(0, 40),
                             txt: d.innerText.replace(/\n/g, ' | ').slice(0, 220),
                             btns: d.querySelectorAll('button').length }));
  };
  // baseline of body children so reset can remove anything a test opened
  window.__BASE = new Set([...document.body.children]);
  window.__hardReset = () => {
    // ⚠️ never remove #mwDlgOverlay — mwDialog keeps an internal reference to it;
    // removing the node makes every later dialog silently invisible.
    [...document.body.children].forEach(c => {
      if (window.__BASE.has(c) || c.id === 'mwDlgOverlay') return;
      c.remove();
    });
    const ov = document.getElementById('mwDlgOverlay');
    if (ov) ov.style.display = 'none';
  };
});

const results = [];
async function T(name, fn) {
  const before = errs.length;
  let out;
  try { out = await fn(); } catch (e) { out = { ok: false, note: 'THREW ' + String(e.message).split('\n')[0] }; }
  const newErrs = errs.slice(before);
  if (newErrs.length) out.ok = false;
  results.push({ name, ...out, errs: newErrs });
  console.log(`${out.ok ? '✅' : '❌'} ${name} :: ${out.note || ''}${newErrs.length ? ' | ERR: ' + newErrs.join(' ; ') : ''}`);
  await page.evaluate(() => { window.__dlgCancel(); window.__hardReset(); window.__reset(); }).catch(() => {});
  await page.waitForTimeout(150);
}

const R = () => page.evaluate(() => window.__reset());
const click = async (id) => { await page.click('#' + id); await page.waitForTimeout(320); };
const panels = () => page.evaluate(() => window.__anyPanel());

await page.click('.tab[data-tab="insert"]');
await page.waitForTimeout(300);

// ── 1. לוח ──
await T('insPaste — כפתור הדבקה', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insPaste');
  const hint = await page.evaluate(() => document.getElementById('_hint')?.textContent || '');
  return { ok: true, note: 'hint="' + hint + '"' };
});
await T('insPasteCaret — תפריט אפשרויות הדבקה (Word: 3 מצבים)', async () => {
  await R(); await click('insPasteCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p) };
});

// ── 2. טבלה ──
await T('insTable — בורר גריד → טבלה 3×3', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insTable');
  const p = await panels();
  const picked = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#_tblGrid [data-r][data-c]')];
    if (!cells.length) return { n: 0 };
    const t = cells.find(c => +c.dataset.r === 3 && +c.dataset.c === 3);
    if (!t) return { n: cells.length, sample: cells[0].outerHTML.slice(0, 120) };
    t.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));  // sets sel
    t.click();
    return { n: cells.length, clicked: true };
  });
  await page.waitForTimeout(400);
  const tbl = await page.evaluate(() => {
    const t = document.querySelector('#editor table');
    if (!t || !t.rows.length) return { rows: 0 };
    return { rows: t.rows.length, cols: t.rows[0].cells.length, th: t.querySelectorAll('th').length,
             w: t.offsetWidth, scopeOk: [...t.querySelectorAll('th')].every(h => h.getAttribute('scope') === 'col') };
  });
  return { ok: !!tbl && tbl.rows === 3 && tbl.cols === 3, note: JSON.stringify({ panels: p.map(x => x.id || x.cls), picked, tbl }) };
});
await T('insTableCaret — תפריט כלי טבלה', async () => {
  await R(); await click('insTableCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p).slice(0, 400) };
});

// ── 3. צורות ──
await T('insShapeCaret — בורר צורות → הכנסת מלבן', async () => {
  await R(); await click('insShapeCaret');
  const p = await panels();
  const r = await page.evaluate(() => {
    const cand = [...document.querySelectorAll('#_shapePick .sp-grid button')];
    const rect = cand.find(b => b.title === 'מלבן') || cand[0];
    if (!rect) return { n: 0 };
    rect.click();
    return { n: cand.length, kind: rect.title };
  });
  await page.waitForTimeout(400);
  const shp = await page.evaluate(() => {
    const o = document.querySelector('#editor .free-obj');
    return o ? { kind: o.dataset.shapeKind, svg: !!o.querySelector('svg'), w: o.offsetWidth, h: o.offsetHeight } : null;
  });
  return { ok: !!shp && !!shp.svg, note: JSON.stringify({ panels: p.map(x => x.id || x.cls), r, shp }) };
});
await T('insShape — לחיצה ישירה = צורה אחרונה', async () => {
  await R(); await click('insShape');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const o = document.querySelector('#editor .free-obj');
    return { added: !!o, kind: o?.dataset.shapeKind, panels: window.__anyPanel().length };
  });
  return { ok: r.added || r.panels > 0, note: JSON.stringify(r) };
});

// ── 4. תיבת טקסט ──
await T('insTextbox — הכנסת תיבת טקסט', async () => {
  await R(); await click('insTextbox');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const tb = document.querySelector('#editor .free-textbox');
    return tb ? { w: tb.offsetWidth, h: tb.offsetHeight, content: !!tb.querySelector('.tb-content'),
                  editable: tb.querySelector('.tb-content')?.getAttribute('contenteditable') } : null;
  });
  return { ok: !!r && r.content, note: JSON.stringify(r) };
});
await T('insTextboxCaret — תפריט אפשרויות תיבה', async () => {
  await R(); await click('insTextboxCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p).slice(0, 400) };
});

// ── 5. ציור ──
await T('insDraw — לוח ציור נפתח + הכנסת ציור למסמך', async () => {
  await R(); await click('insDraw');
  await page.waitForTimeout(400);
  const pad = await page.evaluate(() => {
    const p = document.getElementById('_drawPad');
    if (!p) return null;
    return { canvas: !!p.querySelector('canvas'), btns: [...p.querySelectorAll('button')].map(b => b.textContent.trim() || b.title).slice(0, 12) };
  });
  if (!pad) return { ok: false, note: 'לוח ציור לא נפתח' };
  // צייר קו ואז הכנס
  const inserted = await page.evaluate(() => {
    const p = document.getElementById('_drawPad');
    const cv = p.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    // the pad listens on mousedown/mousemove (not pointer events)
    const ev = (t, x, y) => cv.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: r.left + x, clientY: r.top + y, buttons: 1 }));
    ev('mousedown', 20, 20); ev('mousemove', 60, 50); ev('mousemove', 140, 30);
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let painted = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) painted++;
    const ok = [...p.querySelectorAll('button')].find(b => /הוסף למסמך/.test(b.textContent));
    ok?.click();
    return { btn: ok ? ok.textContent.trim() : null, painted };
  });
  await page.waitForTimeout(400);
  const obj = await page.evaluate(() => {
    const im = document.querySelector('#editor .free-obj img');
    return im ? { png: /^data:image\/png/.test(im.src), w: im.naturalWidth || im.offsetWidth } : null;
  });
  const padGone = await page.evaluate(() => !document.getElementById('_drawPad'));
  return { ok: !!obj && obj.png && inserted.painted > 0 && padGone,
           note: JSON.stringify({ tools: pad.btns.length, inserted, obj, padGone }) };
});

// ── 6. תמונה ──
await T('insImageCaret — תפריט כלי תמונה', async () => {
  await R(); await click('insImageCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p).slice(0, 400) };
});
await T('insImage — פותח בורר קבצים', async () => {
  await R();
  const r = await page.evaluate(() => {
    let opened = false;
    const orig = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () { if (this.type === 'file') opened = true; else orig.call(this); };
    document.getElementById('insImage').click();
    HTMLInputElement.prototype.click = orig;
    return opened;
  });
  return { ok: r, note: 'file-dialog opened=' + r };
});

// ── 7. סימניות ──
await T('insBookmark — יצירת סימנייה על טקסט נבחר', async () => {
  await R(); await page.evaluate(() => window.__selAll());
  await page.click('#insBookmark');
  await page.waitForTimeout(400);
  const dlg = await page.evaluate(() => ({ open: window.__dlgOpen(), txt: window.__dlgText() }));
  if (dlg.open) await page.evaluate(() => window.__dlgFill('סימנייה1'));
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const bm = document.querySelector('#editor .bookmark');
    return { bm: !!bm, name: bm?.dataset.name || bm?.getAttribute('data-bm') || bm?.id,
             text: bm?.textContent, docText: document.getElementById('editor').innerText.trim() };
  });
  return { ok: !!r.bm && r.docText.includes('שלום עולם'), note: JSON.stringify({ dlg: dlg.txt.slice(0, 60), r }) };
});
await T('navBookmark — פאנל ניווט סימניות', async () => {
  await R(); await page.evaluate(() => window.__selAll());
  await page.click('#insBookmark'); await page.waitForTimeout(300);
  if (await page.evaluate(() => window.__dlgOpen())) await page.evaluate(() => window.__dlgFill('bm1'));
  await page.waitForTimeout(300);
  await page.click('#navBookmark'); await page.waitForTimeout(350);
  const r = await page.evaluate(() => {
    const p = document.getElementById('bookmarkNavPanel') || document.querySelector('.mw-panel');
    return p ? p.innerText.replace(/\n/g, ' | ').slice(0, 200) : '';
  });
  return { ok: /bm1/.test(r), note: r };
});

// ── 8. קישור ──
await T('insLink — דיאלוג קישור על טקסט נבחר', async () => {
  await R(); await page.evaluate(() => window.__selAll());
  await page.click('#insLink'); await page.waitForTimeout(450);
  const dlg = await page.evaluate(() => {
    const ov = document.querySelector('.mw-modal-ov');
    if (!ov) return { open: false, panels: window.__anyPanel().map(p => p.id || p.cls) };
    const url = ov.querySelector('#_lkUrl');
    const txt = ov.querySelector('#_lkText');
    if (url) { url.value = 'https://example.com'; url.dispatchEvent(new Event('input', { bubbles: true })); }
    const btns = [...ov.querySelectorAll('button')];
    const ok = btns.find(b => /אישור|הוסף|שמור|החל/.test(b.textContent));
    ok?.click();
    return { open: true, prefilled: txt ? txt.value : null, btns: btns.map(b => b.textContent.trim()) };
  });
  await page.waitForTimeout(400);
  const a = await page.evaluate(() => {
    const el = document.querySelector('#editor a');
    return el ? { href: el.getAttribute('href'), txt: el.textContent } : null;
  });
  return { ok: !!a && /example\.com/.test(a.href), note: JSON.stringify({ dlg, a }) };
});

// ── 9. קו ──
await T('insHR — קו אופקי', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insHR');
  const r = await page.evaluate(() => {
    const hr = document.querySelector('#editor hr');
    return hr ? { w: hr.offsetWidth, parent: hr.parentElement.id || hr.parentElement.tagName } : null;
  });
  return { ok: !!r, note: JSON.stringify(r) };
});

// ── 10. שעה/תאריך ──
await T('insTime — הכנסת שעה', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insTime');
  const txt = await page.evaluate(() => document.getElementById('editor').innerText.trim());
  return { ok: /\d{1,2}:\d{2}/.test(txt), note: JSON.stringify(txt.slice(0, 60)) };
});
await T('insTimeCaret — תפריט פורמטי שעה', async () => {
  await R(); await click('insTimeCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p).slice(0, 350) };
});
await T('insDate — הכנסת תאריך', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insDate');
  const txt = await page.evaluate(() => document.getElementById('editor').innerText.trim());
  return { ok: txt !== 'שלום עולם' && /\d/.test(txt), note: JSON.stringify(txt.slice(0, 80)) };
});
await T('insDateCaret — תפריט פורמטי תאריך', async () => {
  await R(); await click('insDateCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p).slice(0, 350) };
});

// ── 11. הערת שוליים ──
await T('insComment — הערת שוליים', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await page.click('#insComment'); await page.waitForTimeout(400);
  const dlg = await page.evaluate(() => ({ open: window.__dlgOpen(), txt: window.__dlgText() }));
  if (dlg.open) await page.evaluate(() => window.__dlgFill('הערה לבדיקה'));
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const ed = document.getElementById('editor');
    const m = ed.querySelector('sup, .fn-ref, [data-fn], .footnote-ref');
    return { marker: m ? m.outerHTML.slice(0, 140) : null, has: ed.innerText.includes('הערה לבדיקה'),
             fnArea: !!document.querySelector('.footnotes, [data-footnotes], .doc-footnotes') };
  });
  return { ok: !!r.marker, note: JSON.stringify({ dlg: dlg.txt.slice(0, 60), r }) };
});

// ── 12. שבר עמוד ──
await T('insPageBreak — שובר עמוד דוחף לעמוד הבא', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insPageBreak');
  await page.evaluate(() => {
    const ed = document.getElementById('editor');
    const p = document.createElement('p'); p.textContent = 'אחרי השבר';
    ed.appendChild(p);
    updatePagination();
  });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const ed = document.getElementById('editor');
    const pb = ed.querySelector('[data-pagebreak]');
    const last = ed.lastElementChild;
    const cycle = 31.2 * (window.getPxPerCm ? getPxPerCm() : 37.8);
    return { pb: !!pb, pages: document.querySelectorAll('.page-number').length,
             lastTop: last ? Math.round(last.offsetTop) : -1, cycle: Math.round(cycle) };
  });
  return { ok: r.pb && r.pages >= 2 && r.lastTop > r.cycle * 0.9, note: JSON.stringify(r) };
});

// ── 13. כותרת/תחתית ──
await T('insHeaderFooter — דיאלוג כותרת/תחתית', async () => {
  await R(); await page.click('#insHeaderFooter'); await page.waitForTimeout(450);
  const r = await page.evaluate(() => ({ dlg: window.__dlgOpen(), txt: window.__dlgText().slice(0, 200),
                                         panels: window.__anyPanel().map(p => ({ id: p.id, t: p.txt.slice(0, 120) })) }));
  return { ok: r.dlg || r.panels.length > 0, note: JSON.stringify(r).slice(0, 400) };
});

// ── 14. תווים ──
await T('insSymbol — בורר תווים → הכנסה', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insSymbol');
  const p = await panels();
  const r = await page.evaluate(() => {
    const host = document.getElementById('_picker');
    if (!host) return { open: false, panels: window.__anyPanel() };
    const b = [...host.querySelectorAll('.sp-item')];
    const ch = b[0]?.textContent.trim();
    b[0]?.click();
    return { open: true, n: b.length, ch, cats: [...host.querySelectorAll('.sp-cats .sp-cat')].map(c => c.textContent) };
  });
  await page.waitForTimeout(350);
  const txt = await page.evaluate(() => document.getElementById('editor').innerText);
  return { ok: !!r.ch && txt.includes(r.ch), note: JSON.stringify({ panels: p.map(x => x.id || x.cls), r, txt: txt.slice(0, 50) }) };
});
await T('insSymbolCaret — קטגוריות תווים', async () => {
  await R(); await click('insSymbolCaret');
  const p = await panels();
  return { ok: p.length > 0, note: JSON.stringify(p.map(x => ({ id: x.id, t: x.txt.slice(0, 100) }))) };
});

// ── 15. הוסף/הסר עמוד ──
await T('btnAddPage / btnDelPage', async () => {
  await R();
  await page.evaluate(() => { window.manualPages = 0; if (typeof updatePagination === 'function') updatePagination(); });
  await page.waitForTimeout(400);
  const p0 = await page.evaluate(() => document.querySelectorAll('.page-number').length);
  await click('btnAddPage');
  const p1 = await page.evaluate(() => document.querySelectorAll('.page-number').length);
  await click('btnDelPage');
  const p2 = await page.evaluate(() => document.querySelectorAll('.page-number').length);
  return { ok: p1 === p0 + 1 && p2 === p0, note: `${p0}→${p1}→${p2}` };
});

// ── 16. מחשבון ──
await T('insCalc — פתיחת מחשבון', async () => {
  await R(); await click('insCalc');
  const r = await page.evaluate(() => {
    const c = document.getElementById('_calc');
    return c ? { role: c.getAttribute('role'), vis: window.__vis(c), tabs: c.querySelectorAll('[role=tab]').length,
                 selTabs: c.querySelectorAll('[role=tab][aria-selected=true]').length } : null;
  });
  return { ok: !!r && r.vis, note: JSON.stringify(r) };
});

// ── 17. אימוג'י ──
await T('insEmojiCaret — בורר אימוג׳י → הכנסה', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insEmojiCaret');
  const p = await panels();
  const r = await page.evaluate(() => {
    const host = document.getElementById('_picker');
    if (!host) return { open: false, panels: window.__anyPanel() };
    const b = [...host.querySelectorAll('.sp-item')];
    const ch = b[0]?.textContent.trim();
    b[0]?.click();
    return { open: true, n: b.length, ch };
  });
  await page.waitForTimeout(350);
  const txt = await page.evaluate(() => document.getElementById('editor').innerText);
  return { ok: !!r.ch && txt.includes(r.ch), note: JSON.stringify({ panels: p.map(x => x.id || x.cls), r, txt: txt.slice(0, 40) }) };
});
await T('insEmoji — לחיצה ישירה = אימוג׳י אחרון', async () => {
  await R(); await page.evaluate(() => window.__caretEnd());
  await click('insEmoji');
  const r = await page.evaluate(() => ({ txt: document.getElementById('editor').innerText.slice(0, 40),
                                         panels: window.__anyPanel().length }));
  return { ok: /\p{Extended_Pictographic}/u.test(r.txt) || r.panels > 0, note: JSON.stringify(r) };
});

console.log('\n===== SUMMARY =====');
const bad = results.filter(r => !r.ok);
console.log(`${results.length - bad.length}/${results.length} passed`);
bad.forEach(b => console.log('  X ' + b.name + ' :: ' + (b.note || '')));
console.log('total console errors:', errs.length);
errs.slice(0, 10).forEach(e => console.log('   ' + e));
await browser.close();
