// Phase 2 — insert ribbon OUTPUT vs Word semantics
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const HTML = path.resolve('C:/Users/yakyu/OneDrive/文档/WONDER LETER/MyWord-v2.html');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1500, height: 950 },
  permissions: ['clipboard-read', 'clipboard-write']
});
const page = await ctx.newPage();
page.setDefaultTimeout(6000);
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.evaluate(() => {
  window.__BASE = new Set([...document.body.children]);
  window.__vis = (d) => {
    const cs = getComputedStyle(d);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = d.getBoundingClientRect();
    return r.width > 40 && r.height > 20;
  };
  window.__reset = (html) => {
    [...document.body.children].forEach(c => {
      if (window.__BASE.has(c) || c.id === 'mwDlgOverlay') return;
      c.remove();
    });
    const ov = document.getElementById('mwDlgOverlay');
    if (ov) ov.style.display = 'none';
    const editor = document.getElementById('editor');
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    document.getElementById('pageStack').querySelectorAll('.footnote,.doc-header,.doc-footer').forEach(e => e.remove());
    editor.innerHTML = html || '<p>שלום עולם</p>';
    window._docHeader = null; window._docFooter = null;
    window.manualPages = 0;
    editor.focus();
    updatePagination();
  };
  window.__caretIn = (sel, offset) => {
    const el = document.querySelector(sel);
    const node = el.firstChild || el;
    const r = document.createRange();
    if (node.nodeType === 3) r.setStart(node, Math.min(offset ?? node.length, node.length));
    else { r.selectNodeContents(el); r.collapse(false); }
    r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  };
  window.__selectNode = (sel) => {
    const el = document.querySelector(sel);
    const r = document.createRange(); r.selectNodeContents(el);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
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
  window.__ppc = () => getPxPerCm();
});

const results = [];
async function T(name, expect, fn) {
  const before = errs.length;
  let out;
  try { out = await fn(); } catch (e) { out = { ok: false, note: 'THREW ' + String(e.message).split('\n')[0] }; }
  const newErrs = errs.slice(before);
  if (newErrs.length) { out.ok = false; out.note = (out.note || '') + ' | ERR ' + newErrs.join(';'); }
  results.push({ name, expect, ...out });
  console.log(`${out.ok ? '✅' : '❌'} ${name}\n     Word: ${expect}\n     got : ${out.note || ''}`);
  await page.evaluate(() => window.__reset()).catch(() => {});
  await page.waitForTimeout(150);
}
const R = (html) => page.evaluate(h => window.__reset(h), html);

await page.click('.tab[data-tab="insert"]');
await page.waitForTimeout(300);

// ══════════ A. הערות שוליים ══════════
async function addFootnote(text) {
  await page.click('#insComment');
  await page.waitForTimeout(350);
  await page.evaluate(t => window.__dlgFill(t), text);
  await page.waitForTimeout(400);
}

await T('A1 הערת שוליים — טקסט ההערה מופיע בתחתית העמוד',
  'סמן [1] בטקסט + שורת ההערה בתחתית אותו עמוד',
  async () => {
    await R('<p>פסקה ראשונה</p>');
    await page.evaluate(() => window.__caretIn('#editor p'));
    await addFootnote('הערה א');
    const r = await page.evaluate(() => {
      const m = document.querySelector('#editor .fn-ref');
      const boxes = [...document.querySelectorAll('#pageStack .footnote')];
      const ppc = window.__ppc();
      return { marker: m?.textContent, nBoxes: boxes.length,
               txt: boxes[0]?.innerText.replace(/\n/g, ' '),
               topCm: boxes[0] ? +(parseFloat(boxes[0].style.top) / ppc).toFixed(1) : null };
    });
    return { ok: r.marker === '[1]' && r.nBoxes === 1 && /הערה א/.test(r.txt || '') && r.topCm > 28 && r.topCm < 30,
             note: JSON.stringify(r) };
  });

await T('A2 מספור אוטומטי — הערה שנוספה לפני קיימת מקבלת [1]',
  'Word ממספר מחדש לפי סדר הופעה במסמך',
  async () => {
    await R('<p id="pa">אלף</p><p id="pb">בית</p>');
    await page.evaluate(() => window.__caretIn('#pb'));
    await addFootnote('הערת בית');
    await page.evaluate(() => window.__caretIn('#pa'));
    await addFootnote('הערת אלף');
    const r = await page.evaluate(() => {
      const refs = [...document.querySelectorAll('#editor .fn-ref')];
      return refs.map(x => ({ n: x.textContent, note: x.getAttribute('data-note') }));
    });
    return { ok: r.length === 2 && r[0].n === '[1]' && r[0].note === 'הערת אלף' && r[1].n === '[2]' && r[1].note === 'הערת בית',
             note: JSON.stringify(r) };
  });

await T('A3 הערה בעמוד 2 — מופיעה בתחתית עמוד 2',
  'הערה שייכת לעמוד שבו הסמן שלה',
  async () => {
    await R('<p>' + 'שורה ארוכה מאוד לבדיקה. '.repeat(300) + '</p><p id="last">סוף</p>');
    await page.evaluate(() => window.__caretIn('#last'));
    await addFootnote('הערה בעמוד אחרון');
    const r = await page.evaluate(() => {
      const ppc = window.__ppc(), cycle = (29.7 + 1.5) * ppc;
      const m = document.querySelector('#editor .fn-ref');
      const mPage = Math.floor(m.offsetTop / cycle);
      const boxes = [...document.querySelectorAll('#pageStack .footnote')];
      const bPage = boxes.length ? Math.floor(parseFloat(boxes[0].style.top) / cycle) : -1;
      return { mPage, bPage, n: boxes.length, txt: boxes[0]?.innerText.trim().slice(0, 30) };
    });
    return { ok: r.n === 1 && r.mPage === r.bPage && r.mPage >= 1, note: JSON.stringify(r) };
  });

await T('A4 מחיקת הסמן — שורת ההערה נעלמת',
  'מחיקת הסימן מוחקת את ההערה (Word)',
  async () => {
    await R('<p>טקסט</p>');
    await page.evaluate(() => window.__caretIn('#editor p'));
    await addFootnote('להסרה');
    const b4 = await page.evaluate(() => document.querySelectorAll('#pageStack .footnote').length);
    await page.evaluate(() => { document.querySelector('#editor .fn-ref').remove(); updatePagination(); });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.querySelectorAll('#pageStack .footnote').length);
    return { ok: b4 === 1 && after === 0, note: `boxes ${b4}→${after}` };
  });

// ══════════ B. הדבקה — 3 מצבים ══════════
async function setClip(html, text) {
  await page.evaluate(async ([h, t]) => {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([h], { type: 'text/html' }),
      'text/plain': new Blob([t], { type: 'text/plain' })
    })]);
  }, [html, text]);
}
async function pasteVia(labelRe) {
  await page.click('#insPasteCaret');
  await page.waitForTimeout(300);
  await page.evaluate(re => {
    const m = document.getElementById('_pasteOptMenu');
    const b = [...m.querySelectorAll('button')].find(x => new RegExp(re).test(x.textContent));
    b.click();
  }, labelRe.source);
  await page.waitForTimeout(500);
}

await T('B1 הדבק (ברירת מחדל) — שומר עיצוב בסיסי',
  'Word "Keep Source Formatting": מודגש נשאר מודגש',
  async () => {
    await R('<p id="p">בסיס </p>');
    await setClip('<b>מודגש</b>', 'מודגש');
    await page.evaluate(() => window.__caretIn('#p'));
    await pasteVia(/הדבק\s+Ctrl\+V|שומר עיצוב/);
    const r = await page.evaluate(() => ({ html: document.getElementById('editor').innerHTML.slice(0, 200) }));
    return { ok: /<b[ >]|font-weight/.test(r.html) && /מודגש/.test(r.html), note: JSON.stringify(r) };
  });

await T('B2 הדבק טקסט בלבד — מסיר כל עיצוב',
  'Word "Keep Text Only": ללא <b>',
  async () => {
    await R('<p id="p">בסיס </p>');
    await setClip('<b>מודגש</b>', 'מודגש');
    await page.evaluate(() => window.__caretIn('#p'));
    await pasteVia(/טקסט בלבד/);
    const r = await page.evaluate(() => ({ html: document.getElementById('editor').innerHTML.slice(0, 200) }));
    return { ok: /מודגש/.test(r.html) && !/<b>|font-weight\s*:\s*(bold|700)/.test(r.html), note: JSON.stringify(r) };
  });

await T('B3 הדבק תואם עיצוב — מקבל את עיצוב הסביבה',
  'Word "Merge Formatting": ללא עיצוב-מקור',
  async () => {
    await R('<p id="p">בסיס </p>');
    await setClip('<b style="color:red">מודגש</b>', 'מודגש');
    await page.evaluate(() => window.__caretIn('#p'));
    await pasteVia(/תואם עיצוב/);
    const r = await page.evaluate(() => ({ html: document.getElementById('editor').innerHTML.slice(0, 250) }));
    return { ok: /מודגש/.test(r.html) && !/color\s*:\s*red/.test(r.html), note: JSON.stringify(r) };
  });

// ══════════ C. טבלה ══════════
async function insertTableViaPicker(rows, cols, header) {
  await page.click('#insTable');
  await page.waitForTimeout(300);
  await page.evaluate(([r, c, h]) => {
    const hb = document.getElementById('_tblHeader');
    if (hb) hb.checked = h;
    const cell = [...document.querySelectorAll('#_tblGrid [data-r][data-c]')].find(x => +x.dataset.r === r && +x.dataset.c === c);
    cell.dispatchEvent(new MouseEvent('mouseenter'));
    cell.click();
  }, [rows, cols, header]);
  await page.waitForTimeout(400);
}

await T('C1 טבלה נכנסת במיקום הסמן, לא בסוף המסמך',
  'Word מוסיף במיקום הסמן',
  async () => {
    await R('<p id="p1">ראשונה</p><p id="p2">שנייה</p>');
    await page.evaluate(() => window.__caretIn('#p1'));
    await insertTableViaPicker(2, 2, true);
    const r = await page.evaluate(() => {
      const kids = [...document.getElementById('editor').children].map(k => k.id || k.tagName);
      return { order: kids };
    });
    const ti = r.order.indexOf('TABLE');
    return { ok: ti > -1 && ti < r.order.indexOf('p2'), note: JSON.stringify(r) };
  });

await T('C2 "שורת כותרת" מכובה → אין <th>',
  'תיבת-הסימון בבורר חייבת להשפיע',
  async () => {
    await R('<p>x</p>');
    await page.evaluate(() => window.__caretIn('#editor p'));
    await insertTableViaPicker(2, 3, false);
    const r = await page.evaluate(() => {
      const t = document.querySelector('#editor table');
      return { th: t.querySelectorAll('th').length, rows: t.rows.length, cols: t.rows[0].cells.length };
    });
    return { ok: r.th === 0 && r.rows === 2 && r.cols === 3, note: JSON.stringify(r) };
  });

await T('C3 רוחב טבלה לא חורג מאזור התוכן',
  'טבלה חדשה ברוחב אזור-הכתיבה (21cm − 2×2.5cm = 16cm) ולא מעבר ל-19cm',
  async () => {
    await R('<p>x</p>');
    await page.evaluate(() => window.__caretIn('#editor p'));
    await insertTableViaPicker(2, 4, true);
    const r = await page.evaluate(() => {
      const t = document.querySelector('#editor table');
      const ed = document.getElementById('editor');
      const cs = getComputedStyle(ed);
      const contentPx = ed.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const ppc = window.__ppc();
      return { wCm: +(t.offsetWidth / ppc).toFixed(2), contentCm: +(contentPx / ppc).toFixed(2) };
    });
    return { ok: r.wCm <= 19.01 && Math.abs(r.wCm - r.contentCm) < 0.15, note: JSON.stringify(r) };
  });

// ══════════ D. קישור ══════════
await T('D1 קישור בלי סכימה — מתווסף https://',
  'Word משלים פרוטוקול לכתובת ללא סכימה',
  async () => {
    await R('<p id="p">אתר</p>');
    await page.evaluate(() => window.__selectNode('#p'));
    await page.click('#insLink'); await page.waitForTimeout(400);
    await page.evaluate(() => {
      const ov = document.querySelector('.mw-modal-ov');
      ov.querySelector('#_lkUrl').value = 'example.com';
      [...ov.querySelectorAll('button')].find(b => /הוסף|אישור/.test(b.textContent)).click();
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const a = document.querySelector('#editor a');
      return a ? { href: a.getAttribute('href'), txt: a.textContent } : null;
    });
    return { ok: !!r && /^https?:\/\/example\.com/.test(r.href), note: JSON.stringify(r) };
  });

await T('D2 קישור javascript: נחסם',
  'לא נוצר קישור מסוכן',
  async () => {
    await R('<p id="p">אתר</p>');
    await page.evaluate(() => window.__selectNode('#p'));
    await page.click('#insLink'); await page.waitForTimeout(400);
    await page.evaluate(() => {
      const ov = document.querySelector('.mw-modal-ov');
      ov.querySelector('#_lkUrl').value = 'javascript:alert(1)';
      [...ov.querySelectorAll('button')].find(b => /הוסף|אישור/.test(b.textContent)).click();
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const a = document.querySelector('#editor a');
      return { href: a ? a.getAttribute('href') : null, text: document.getElementById('editor').innerText.trim() };
    });
    return { ok: !r.href || !/javascript:/i.test(r.href), note: JSON.stringify(r) };
  });

await T('D3 קישור אימייל → mailto:',
  'Word ממיר כתובת דוא"ל ל-mailto:',
  async () => {
    await R('<p id="p">מייל</p>');
    await page.evaluate(() => window.__selectNode('#p'));
    await page.click('#insLink'); await page.waitForTimeout(400);
    await page.evaluate(() => {
      const ov = document.querySelector('.mw-modal-ov');
      ov.querySelector('#_lkUrl').value = 'a@b.com';
      [...ov.querySelectorAll('button')].find(b => /הוסף|אישור/.test(b.textContent)).click();
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const a = document.querySelector('#editor a');
      return a ? a.getAttribute('href') : null;
    });
    return { ok: /^mailto:/.test(r || ''), note: JSON.stringify(r) };
  });

// ══════════ E. תאריך/שעה — בחירת פורמט ══════════
await T('E1 תפריט תאריך — הפורמט הנבחר הוא זה שמוכנס',
  'בחירת "מספרי" מכניסה 28.7.2026 ולא את הפורמט המלא',
  async () => {
    await R('<p id="p">תאריך: </p>');
    await page.evaluate(() => window.__caretIn('#p'));
    await page.click('#insDateCaret'); await page.waitForTimeout(300);
    const chosen = await page.evaluate(() => {
      const m = document.getElementById('_insMenu');
      const b = [...m.querySelectorAll('button')].find(x => /מספרי/.test(x.textContent));
      const prev = b.querySelector('small').textContent;
      b.click();
      return prev;
    });
    await page.waitForTimeout(350);
    const txt = await page.evaluate(() => document.getElementById('editor').innerText.trim());
    return { ok: txt.includes(chosen), note: JSON.stringify({ chosen, txt }) };
  });

// ══════════ F. כותרת/תחתית ══════════
await T('F1 כותרת עם {עמוד}/{סהכ} — מספור נכון בכל עמוד',
  'Word: מספר עמוד מתעדכן לכל עמוד',
  async () => {
    await R('<p>' + 'טקסט ארוך לבדיקת עימוד. '.repeat(400) + '</p>');
    await page.click('#insHeaderFooter'); await page.waitForTimeout(450);
    const applied = await page.evaluate(() => {
      const d = document.getElementById('_hfDlg');
      if (!d) return { open: false };
      const ins = [...d.querySelectorAll('input[type=text],textarea')];
      if (ins[0]) { ins[0].value = 'דוח — עמוד {עמוד} מתוך {סהכ}'; ins[0].dispatchEvent(new Event('input', { bubbles: true })); }
      const ok = [...d.querySelectorAll('button')].find(b => /החל|אישור|שמור/.test(b.textContent));
      ok?.click();
      return { open: true, inputs: ins.length, btn: ok?.textContent.trim() };
    });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const hs = [...document.querySelectorAll('#pageStack .doc-header')];
      return { n: hs.length, txts: hs.map(h => h.innerText.trim()) };
    });
    const ok = r.n >= 2 && r.txts.every((t, i) => t.includes(`עמוד ${i + 1} מתוך ${r.n}`));
    return { ok, note: JSON.stringify({ applied, r }) };
  });

// ══════════ G. סימנים / אימוג'י ══════════
await T('G1 סימן נכנס במיקום הסמן (לא בסוף הפסקה)',
  'Word מוסיף במיקום הסמן',
  async () => {
    await R('<p id="p">אבגד</p>');
    await page.evaluate(() => window.__caretIn('#p', 2));
    await page.click('#insSymbol'); await page.waitForTimeout(350);
    await page.evaluate(() => {
      const it = [...document.querySelectorAll('#_picker .sp-item')].find(b => b.textContent.trim() === '±');
      it.click();
    });
    await page.waitForTimeout(350);
    const txt = await page.evaluate(() => document.querySelector('#editor p').textContent);
    return { ok: txt === 'אב±גד', note: JSON.stringify(txt) };
  });

await T('G2 הבורר נשאר פתוח אחרי הכנסה (כמו דיאלוג הסמלים ב-Word)',
  'אפשר להוסיף כמה סמלים ברצף',
  async () => {
    await R('<p id="p">x</p>');
    await page.evaluate(() => window.__caretIn('#p'));
    // ⚠️ #insSymbol הוא כפתור-מפוצל: אחרי בחירה קודמת הוא מכניס את האחרון ולא
    //    פותח בורר. את הבורר פותחים תמיד דרך החץ.
    await page.click('#insSymbolCaret'); await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#_picker .sp-item')];
      items[0].click(); items[1].click();
      return { stillOpen: !!document.getElementById('_picker'), a: items[0].textContent, b: items[1].textContent };
    });
    await page.waitForTimeout(300);
    const txt = await page.evaluate(() => document.querySelector('#editor p').textContent);
    return { ok: r.stillOpen && txt.includes(r.a) && txt.includes(r.b), note: JSON.stringify({ r, txt }) };
  });

// ══════════ H. סימניות ══════════
await T('H1 מחיקת סימנייה לא מוחקת את הטקסט',
  'הסרת סימנייה משאירה את התוכן (באג עבר)',
  async () => {
    await R('<p id="p">מילה חשובה כאן</p>');
    await page.evaluate(() => window.__selectNode('#p'));
    await page.click('#insBookmark'); await page.waitForTimeout(350);
    await page.evaluate(() => window.__dlgFill('bmA'));
    await page.waitForTimeout(350);
    await page.click('#navBookmark'); await page.waitForTimeout(350);
    await page.evaluate(() => {
      const p = document.getElementById('bookmarkNavPanel');
      p.querySelector('.bmnav-del')?.click();
    });
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => ({
      txt: document.getElementById('editor').innerText.trim(),
      bm: document.querySelectorAll('#editor .bookmark').length
    }));
    return { ok: r.txt === 'מילה חשובה כאן' && r.bm === 0, note: JSON.stringify(r) };
  });

// ══════════ I. שבר עמוד ══════════
await T('I1 שבר עמוד — התוכן שאחריו מתחיל בראש העמוד הבא',
  'Word: התוכן הבא בראש עמוד 2, באותו מיקום שאליו נוחת טקסט בזרימה טבעית',
  async () => {
    // בייסליין: לאן נוחת בלוק בזרימה טבעית (בלי שבר) — זהו "ראש העמוד" במודל של MyWord.
    await R('<p>' + '<p>שורת מילוי לבדיקת זרימה.</p>'.repeat(0) + '</p>');
    const natural = await page.evaluate(() => {
      const ed = document.getElementById('editor');
      let h = ''; for (let i = 0; i < 80; i++) h += `<p id="n${i}">שורה ${i} — מילוי לזרימה טבעית בין עמודים.</p>`;
      ed.innerHTML = h; updatePagination();
      const ppc = getPxPerCm(), cycle = (29.7 + 1.5) * ppc;
      const first = [...ed.children].find(k => k.offsetTop >= cycle - 1);
      return Math.round(first.offsetTop % cycle);
    });
    await R('<p id="a">לפני</p><p id="b">אחרי</p>');
    await page.evaluate(() => window.__caretIn('#a'));
    await page.click('#insPageBreak'); await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const ppc = window.__ppc(), cycle = (29.7 + 1.5) * ppc;
      const b = document.getElementById('b');
      const brk = document.querySelector('#editor [data-pagebreak]');
      return { pageIdx: Math.floor(b.offsetTop / cycle),
               breakAtPageTop: Math.round(brk.offsetTop % cycle),
               offsetInPage: Math.round(b.offsetTop % cycle) };
    });
    // פסקת-השבר עצמה חייבת לנחות בדיוק בראש עמוד 2 (כמו זרימה טבעית);
    // #b יושבת מיד אחריה.
    return { ok: r.pageIdx === 1 && r.breakAtPageTop === natural,
             note: JSON.stringify({ naturalTopInPage: natural, ...r }) };
  });

console.log('\n===== SUMMARY =====');
const bad = results.filter(r => !r.ok);
console.log(`${results.length - bad.length}/${results.length} passed`);
bad.forEach(b => console.log('  X ' + b.name + '\n      Word: ' + b.expect + '\n      got : ' + (b.note || '')));
console.log('console errors:', errs.length);
await browser.close();
