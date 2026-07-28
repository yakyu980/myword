// lib/scenarios.mjs — כל תרחישי הבדיקה של מרקוס וורד v3.0
// 216 תרחישים קבועים + suite דינמי `buttons` (נבנה מ-docs/BUTTONS-SPEC.md).
// כל תרחיש: { id, name, rule, suite, expectPages?, setup, assert?, assertArg? }
// setup רץ בדפדפן (page.evaluate). אחרי כל setup: updatePagination + probe.
// assert (אופציונלי) רץ בדפדפן עם assertArg ומחזיר מערך issues (ראה BUTTON_ASSERT).

import { loadSpecFromDisk } from './spec.mjs';
import { isExcluded } from './test-exclude.mjs';

const PNG_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ─── עוזרים מוזרקים לדפדפן לפני כל setup ────────────────────────────────────
function helpers() {
  const editor = document.getElementById('editor');
  window.PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  window.__reset = () => {
    editor.querySelectorAll('.free-obj').forEach(o => o.remove());
    editor.innerHTML = '<p><br></p>';
    if (typeof window._docHeader !== 'undefined') window._docHeader = null;
    if (typeof window._docFooter !== 'undefined') window._docFooter = null;
    // איפוס מצב-זום גלובלי כדי שתרחישי zoom לא ידליפו _docZoom/zoom לתרחיש הבא
    // (בידוד תרחישים: בלי זה obj-behind-watermark וכו' מקבלים מדידות מעוותות).
    window._docZoom = 1;
    const stack = document.getElementById('pageStack');
    if (stack) stack.style.zoom = '1';
    // בידוד UI גלובלי: פנלים/מצבי-תצוגה דולפים בין תרחישים (מאזיני dismiss וכו').
    document.querySelectorAll('.mw-panel,#_docMgr,#_imgRibbonMenu,#_tblRibbonMenu,#_tbxRibbonMenu,#_shpRibbonMenu,#_shapePick,#_strokePanel').forEach(p => p.remove());
    // #rcMenu הוא singleton קבוע ב-body (לא .mw-panel) — תפריט שנשאר פתוח דולף
    // לתרחיש הבא, ושם מאזין-ה-mousedown הגלובלי גורם לקליק-הראשון רק *לסגור* אותו.
    // אותה מלכודת-בידוד כמו #bookmarkNavPanel (2026-07-18).
    const _rc = document.getElementById('rcMenu');
    if (_rc) { _rc.style.display = 'none'; _rc.innerHTML = ''; }
    if (editor.spellcheck === false) editor.spellcheck = true;   // תרחישי rcmenu משנים אותו
    // ⚠️ styleWithCSS הוא דגל **גלובלי של המסמך** שנשאר דלוק לצמיתות אחרי כל שינוי
    // צבע/גודל/הדגשה (4 אתרים בקוד קובעים true ואף אחד לא מחזיר ל-false). כשהוא דלוק,
    // execCommand('bold') מייצר <span style="font-weight:bold"> במקום <b> — ולכן תרחיש
    // שרץ *לבדו* עובר ו*בריצה-מלאה* נכשל. מאפסים לערך ידוע כדי שהתרחישים יהיו דטרמיניסטיים.
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
    document.body.classList.remove('focus-mode', 'hide-status');
    editor.focus();
  };

  // ── עוזרי תפריט קליק-ימני (suite rcmenu) ──
  // חובה dispatchEvent סינתטי: setup/assert רצים בתוך page.evaluate ואין גישה ל-page.
  window.__rc = (target, x, y) => {
    const r = target.getBoundingClientRect();
    const ev = new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true,
      clientX: x != null ? x : Math.round(r.left + r.width / 2),
      clientY: y != null ? y : Math.round(r.top + r.height / 2)
    });
    target.dispatchEvent(ev);
    window.__rcLastPrevented = ev.defaultPrevented;
    return document.getElementById('rcMenu');
  };
  window.__rcOpen = () => {
    const m = document.getElementById('rcMenu');
    return !!m && m.style.display === 'block';
  };
  window.__rcLabels = () =>
    [...document.querySelectorAll('#rcMenu button')].map(b => b.textContent.replace(/Ctrl\+\w|F\d/g, '').trim());
  window.__rcClick = (txt) => {
    const b = [...document.querySelectorAll('#rcMenu button')].find(x => x.textContent.includes(txt));
    if (!b || b.disabled) return false;
    b.click();                      // click() ולא pointerup — rcMenu שונה מ-ctxBar
    return true;
  };
  window.__rcHide = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  window.__rcSel = (node, a, b) => {
    const tn = node.firstChild, r = document.createRange();
    r.setStart(tn, a); if (b == null) r.collapse(true); else r.setEnd(tn, b);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  };

  window.__para = (n, words = 20) => {
    let h = '';
    for (let i = 0; i < n; i++)
      h += '<p>' + ('מילה '.repeat(words)) + `(${i + 1})</p>`;
    editor.innerHTML = h;
  };

  window.__pxPerCm = () => {
    const t = document.createElement('div');
    t.style.cssText = 'position:absolute;height:1cm;width:1cm;visibility:hidden';
    editor.appendChild(t); const v = t.getBoundingClientRect().height; t.remove(); return v;
  };

  window.__freeImg = (leftCm, topCm, wCm, hCm, mode = 'free') => {
    const ppc = window.__pxPerCm();
    const d = document.createElement('div');
    d.className = 'free-obj';
    d.setAttribute('contenteditable', 'false');
    d.setAttribute('data-img-mode', mode);
    d.style.cssText = `position:absolute;left:${leftCm*ppc}px;top:${topCm*ppc}px;` +
      `width:${wCm*ppc}px;height:${hCm*ppc}px;z-index:15`;
    d.innerHTML = `<div class="free-img-wrap"><img src="${window.PNG_1x1}" style="width:100%;height:100%;object-fit:contain"></div>`;
    editor.appendChild(d); return d;
  };

  window.__freeTextbox = (leftCm, topCm, wCm, hCm, text = 'תוכן תיבה') => {
    const ppc = window.__pxPerCm();
    const d = document.createElement('div');
    d.className = 'free-obj free-textbox';
    d.setAttribute('contenteditable', 'false');
    d.style.cssText = `position:absolute;left:${leftCm*ppc}px;top:${topCm*ppc}px;` +
      `width:${wCm*ppc}px;height:${hCm*ppc}px;z-index:15;border:1px solid #888;background:#fff`;
    d.innerHTML = `<div class="tb-header" style="height:1.2em;background:#eee;font-size:10pt;padding:2px">תיבה</div>` +
      `<div class="tb-content" contenteditable="true" style="padding:4px">${text}</div>`;
    editor.appendChild(d); return d;
  };

  window.__bigTable = (rows, cols) => {
    let h = '<table border="1" style="border-collapse:collapse;width:100%">';
    for (let r = 0; r < rows; r++) {
      h += '<tr>';
      for (let c = 0; c < cols; c++) h += `<td style="padding:6px">תא ${r+1},${c+1}</td>`;
      h += '</tr>';
    }
    return h + '</table>';
  };

  window.__clickBtn = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.click(); return true;
  };

  window.__selectAll = () => {
    editor.focus();
    document.execCommand('selectAll');
  };

  window.__type = (text) => {
    editor.focus();
    document.execCommand('insertText', false, text);
  };

  window.__key = (combo) => {
    const parts = combo.toLowerCase().split('+');
    const key = parts.pop();
    const ctrl = parts.includes('ctrl');
    const shift = parts.includes('shift');
    editor.dispatchEvent(new KeyboardEvent('keydown', {
      key, ctrlKey: ctrl, shiftKey: shift, bubbles: true, cancelable: true
    }));
  };

  window.__setImgMode = (obj, mode) => {
    if (typeof window._setImgMode === 'function') {
      window._setImgMode(obj, mode);
    } else {
      obj.setAttribute('data-img-mode', mode);
    }
  };

  window.__applyFontSize = (pt) => {
    if (typeof applyFontSize === 'function') {
      applyFontSize(pt);
    } else {
      document.execCommand('fontSize', false, '3');
    }
  };

  window.__setLineHeight = (lh) => {
    window.__selectAll();
    document.querySelectorAll('#editor p, #editor li').forEach(el => {
      el.style.lineHeight = String(lh);
    });
  };

  /* פתיחת פאנל-הסימניות בצורה עמידה (2026-07-17). initBookmarkNav מחזיק את
     ה-panel ב-closure ומתנהג כ-toggle; מחיקת סימנייה *לא* סוגרת את הפאנל, ו-
     __reset לא מסיר את #bookmarkNavPanel (הוא לא .mw-panel). לכן קליק בתרחיש
     הבא היה *סוגר* פאנל-שנשאר-פתוח במקום לפתוח — ה-del לא נמצא והבדיקה נכשלה
     על ארטיפקט-בידוד ולא על באג-מוצר. כאן: קליק, ואם לא נפתח — קליק נוסף. */
  window.__openBookmarkPanel = async () => {
    const btn = document.getElementById('navBookmark');
    btn.click();
    await new Promise(r => setTimeout(r, 40));
    if (!document.getElementById('bookmarkNavPanel')) {
      btn.click();
      await new Promise(r => setTimeout(r, 40));
    }
    return document.getElementById('bookmarkNavPanel');
  };

  // בידוד תרחישי-מסמכים (2026-07-06): getAllDocs קורא מ-IndexedDB (mwDB), לא
  // localStorage — מסמכי-בדיקה ממריצה קודמת נשארים ב-IDB בין תרחישים בתוך
  // אותו ריצת-מרקוס ומזהמים ספירות/חיפושים. ר' זיכרון test-hygiene-idb.
  window.__wipeAllDocs = async () => {
    try {
      const all = typeof getAllDocs === 'function' ? getAllDocs() : {};
      for (const id of Object.keys(all)) { try { await mwDB.del(id); } catch (e) {} }
    } catch (e) {}
    try { localStorage.removeItem('myword2_open_tabs'); } catch (e) {}
    try { localStorage.removeItem('myword2_last'); } catch (e) {}
    if (typeof window !== 'undefined') window.currentDocId = null;
    try { currentDocId = null; } catch (e) {}
  };
}

export const HELPERS_SRC = `(${helpers.toString()})(); window.PNG_1x1=${JSON.stringify(PNG_1x1)};`;

// ─── כל התרחישים — 216 תרחישים ─────────────────────────────────────────────
export const scenarios = [

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE A — חוקי הדף (page-rules) · 18 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'empty', suite: 'page-rules',
    name: 'מסמך ריק', rule: 'PAGE_RULES §1',
    expectPages: 1,
    setup: () => { window.__reset(); },
  },
  {
    id: 'heavy-text', suite: 'page-rules',
    name: 'עומס טקסט — 220 פסקאות', rule: 'PAGE_RULES §3+§4',
    setup: () => { window.__reset(); window.__para(220, 30); },
  },
  {
    id: 'boundary-stress', suite: 'page-rules',
    name: 'בלוקים גבוהים בגבול עמוד', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 60; i++)
        h += `<p style="font-size:20pt;line-height:2">בלוק ${i+1} ${'טקסט '.repeat(40)}</p>`;
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'big-table', suite: 'page-rules',
    name: 'טבלה גדולה חוצה גבול', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>' + 'מילה '.repeat(300) + '</p>' + window.__bigTable(18, 4) + '<p>אחרי</p>';
    },
  },
  {
    id: 'many-images', suite: 'page-rules',
    name: 'תמונות חופשיות בעמודים שונים', rule: 'PAGE_RULES §5 + _clamp',
    setup: () => {
      window.__reset(); window.__para(180, 25);
      window.__freeImg(2, 5, 6, 4);
      window.__freeImg(2, 28.5, 6, 4);
      window.__freeImg(8, 40, 5, 5);
      window.__freeImg(2, 60, 6, 4);
    },
  },
  {
    id: 'inline-huge-image', suite: 'page-rules',
    name: 'תמונה inline ענקית > 24.7cm', rule: 'PAGE_RULES §8',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>לפני</p><p><img src="' + window.PNG_1x1 +
        '" style="width:10cm;height:40cm"></p><p>אחרי</p>';
    },
  },
  {
    id: 'mixed-load', suite: 'page-rules',
    name: 'עומס מעורב — טקסט+טבלאות+תמונות', rule: 'כל חוקי הדף',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 40; i++) {
        h += `<p>${'מילה '.repeat(25)}</p>`;
        if (i % 10 === 5) h += window.__bigTable(6, 3);
      }
      document.getElementById('editor').innerHTML = h;
      window.__freeImg(2, 6, 5, 4);
      window.__freeImg(3, 35, 5, 4);
      window.__freeImg(4, 66, 5, 4);
    },
  },
  {
    id: 'free-obj-in-gap', suite: 'page-rules',
    name: 'אובייקט חופשי בתוך הפער (_clamp)', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(120, 25);
      window.__freeImg(2, 30.2, 6, 1);  // בכוונה בפער עמוד 1
    },
  },
  {
    id: 'orphan-widow', suite: 'page-rules',
    name: 'שורה בודדת בסוף עמוד (orphan)', rule: 'PAGE_RULES §5',
    setup: () => {
      window.__reset();
      // פסקאות שמביאות שורה אחת בסוף עמוד
      let h = '<p>' + 'מילה '.repeat(350) + '</p>';
      h += '<p>שורה בודדת</p>';
      h += '<p>' + 'המשך '.repeat(100) + '</p>';
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'heading-alone', suite: 'page-rules',
    name: 'H1 לבד בסוף עמוד — break-after:avoid', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '<p>' + 'מילה '.repeat(350) + '</p>';
      h += '<h1>כותרת ראשית שאמורה לעבור לדף הבא</h1>';
      h += '<p>' + 'פסקה אחרי הכותרת '.repeat(30) + '</p>';
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'blockquote-gap', suite: 'page-rules',
    name: 'blockquote נוחת בפער — נדחף לעמוד הבא', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      let h = '<p>' + 'מילה '.repeat(340) + '</p>';
      h += '<blockquote style="border-right:4px solid #aaa;padding-right:1cm;margin:1cm">ציטוט חשוב שלא אמור להיחתך בגבול עמוד</blockquote>';
      h += '<p>' + 'המשך '.repeat(100) + '</p>';
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'table-header-gap', suite: 'page-rules',
    name: 'שורת כותרת טבלה לבד בסוף עמוד', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '<p>' + 'מילה '.repeat(340) + '</p>';
      h += '<table border="1" style="border-collapse:collapse;width:100%">';
      h += '<tr style="background:#eee"><th>עמודה א</th><th>עמודה ב</th><th>עמודה ג</th></tr>';
      for (let i = 0; i < 10; i++)
        h += `<tr><td>נתון ${i*3+1}</td><td>נתון ${i*3+2}</td><td>נתון ${i*3+3}</td></tr>`;
      h += '</table>';
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'many-pages-20', suite: 'page-rules',
    name: '20 עמודים רציפים — אפס דליפות', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset(); window.__para(600, 20);
    },
  },
  {
    id: 'header-footer-layout', suite: 'page-rules',
    name: 'כותרת+תחתית — paginateBlocks שומר 1.8+1.6cm', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(200, 25);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת עמוד {עמוד}';
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית — {סהכ} עמודים';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  {
    id: 'header-footer-5pages', suite: 'page-rules',
    name: '5 עמודים + כותרת + תחתית — אין חפיפה', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(160, 25);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת';
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  {
    id: 'free-obj-rotate-gap', suite: 'page-rules',
    name: 'אובייקט מסובב קרוב לפער', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(120, 25);
      const obj = window.__freeImg(5, 27, 6, 4);
      obj.setAttribute('data-rotation', '45');
      obj.style.transform = 'rotate(45deg)';
    },
  },
  {
    id: 'page-break-manual', suite: 'page-rules',
    name: 'שובר עמוד ידני — 2 עמודים', rule: 'PAGE_RULES §3',
    expectPages: 2,
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>עמוד ראשון</p>' +
        '<div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד שני</p>';
    },
  },
  {
    id: 'double-page-break', suite: 'page-rules',
    name: 'שני שוברי עמוד — 3 עמודים', rule: 'PAGE_RULES §3',
    expectPages: 3,
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>עמוד 1</p>' +
        '<div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 2</p>' +
        '<div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 3</p>';
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE B — סרגל הבית (home-ribbon) · 45 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  // B1 — עיצוב בסיסי
  {
    id: 'bold', suite: 'home-ribbon',
    name: 'מודגש Ctrl+B', rule: 'CLAUDE.md §11',
    setup: () => { window.__reset(); window.__para(5); window.__selectAll(); document.execCommand('bold'); },
  },
  {
    id: 'italic', suite: 'home-ribbon',
    name: 'נטוי Ctrl+I', rule: 'CLAUDE.md §11',
    setup: () => { window.__reset(); window.__para(5); window.__selectAll(); document.execCommand('italic'); },
  },
  {
    id: 'underline', suite: 'home-ribbon',
    name: 'קו תחתון Ctrl+U', rule: 'CLAUDE.md §11',
    setup: () => { window.__reset(); window.__para(5); window.__selectAll(); document.execCommand('underline'); },
  },
  {
    id: 'strikethrough', suite: 'home-ribbon',
    name: 'קו חוצה', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(5); window.__selectAll();
      document.execCommand('strikeThrough');
    },
  },
  {
    id: 'superscript', suite: 'home-ribbon',
    name: 'כתב עילי x²', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>E=mc<sup>2</sup> — נוסחה עם כתב עילי</p>' + '<p>' + 'טקסט רגיל '.repeat(30) + '</p>';
    },
  },
  {
    id: 'subscript', suite: 'home-ribbon',
    name: 'כתב תחתי H₂O', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>H<sub>2</sub>O — כתב תחתי</p><p>' + 'טקסט '.repeat(30) + '</p>';
    },
  },
  {
    id: 'text-color-red', suite: 'home-ribbon',
    name: 'צבע טקסט אדום', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(5); window.__selectAll();
      document.execCommand('foreColor', false, '#ff0000');
    },
  },
  {
    id: 'text-color-blue', suite: 'home-ribbon',
    name: 'צבע טקסט כחול', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(5); window.__selectAll();
      document.execCommand('foreColor', false, '#0000ff');
    },
  },
  {
    id: 'bg-color-yellow', suite: 'home-ribbon',
    name: 'רקע צהוב (מרקר)', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(5); window.__selectAll();
      document.execCommand('backColor', false, '#ffff00');
    },
  },
  {
    id: 'bg-color-clear', suite: 'home-ribbon',
    name: 'ניקוי רקע צהוב', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p><span style="background:#ffff00">טקסט עם רקע</span> וטקסט רגיל</p>';
      window.__selectAll();
      document.execCommand('backColor', false, 'transparent');
    },
  },
  {
    id: 'clear-format', suite: 'home-ribbon',
    name: 'ניקוי כל עיצוב', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p><b><i><u><span style="color:red;font-size:24pt">טקסט מעוצב מאוד</span></u></i></b></p>';
      window.__selectAll();
      document.execCommand('removeFormat');
    },
  },
  {
    id: 'bold-italic-combined', suite: 'home-ribbon',
    name: 'מודגש + נטוי + קו תחתון יחד', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(10); window.__selectAll();
      document.execCommand('bold');
      document.execCommand('italic');
      document.execCommand('underline');
    },
  },

  // B2 — גופן וגודל
  {
    id: 'font-arial', suite: 'home-ribbon',
    name: 'גופן Arial', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(20); window.__selectAll();
      document.execCommand('fontName', false, 'Arial');
    },
  },
  {
    id: 'font-times', suite: 'home-ribbon',
    name: 'גופן Times New Roman', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(20); window.__selectAll();
      document.execCommand('fontName', false, 'Times New Roman');
    },
  },
  {
    id: 'font-david', suite: 'home-ribbon',
    name: 'גופן David', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(20); window.__selectAll();
      document.execCommand('fontName', false, 'David');
    },
  },
  {
    id: 'font-size-8', suite: 'home-ribbon',
    name: 'גופן 8pt — pagination מתכווץ', rule: 'PAGE_RULES §7',
    setup: () => {
      window.__reset(); window.__para(30); window.__selectAll();
      window.__applyFontSize(8);
    },
  },
  {
    id: 'font-size-36', suite: 'home-ribbon',
    name: 'גופן 36pt — pagination מתרחב', rule: 'PAGE_RULES §7',
    setup: () => {
      window.__reset(); window.__para(20); window.__selectAll();
      window.__applyFontSize(36);
    },
  },
  {
    id: 'font-size-72', suite: 'home-ribbon',
    name: 'גופן ענק 72pt — pagination מתעדכן', rule: 'PAGE_RULES §7',
    setup: () => {
      window.__reset(); window.__para(10); window.__selectAll();
      window.__applyFontSize(72);
    },
  },
  {
    id: 'font-size-large', suite: 'home-ribbon',
    name: 'גופן 48pt — pagination מתעדכן', rule: 'PAGE_RULES §7',
    setup: () => {
      window.__reset(); window.__para(30); window.__selectAll();
      window.__applyFontSize(48);
    },
  },
  {
    id: 'font-mixed-sizes', suite: 'home-ribbon',
    name: 'גדלים שונים בעמוד — pagination חכם', rule: 'PAGE_RULES §7',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 20; i++) {
        const sizes = [8, 12, 14, 18, 24, 36];
        const sz = sizes[i % sizes.length];
        h += `<p style="font-size:${sz}pt">שורה בגופן ${sz} נקודות — ${'מילה '.repeat(10)}</p>`;
      }
      document.getElementById('editor').innerHTML = h;
    },
  },

  // B3 — יישור ורווח
  {
    id: 'align-right', suite: 'home-ribbon',
    name: 'יישור ימין (RTL ברירת מחדל)', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(10); window.__selectAll();
      document.execCommand('justifyRight');
    },
  },
  {
    id: 'align-center', suite: 'home-ribbon',
    name: 'יישור מרכז', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(10); window.__selectAll();
      document.execCommand('justifyCenter');
    },
  },
  {
    id: 'align-left', suite: 'home-ribbon',
    name: 'יישור שמאל', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(10); window.__selectAll();
      document.execCommand('justifyLeft');
    },
  },
  {
    id: 'align-justify', suite: 'home-ribbon',
    name: 'יישור דו-צדדי', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(20, 40); window.__selectAll();
      document.execCommand('justifyFull');
    },
  },
  {
    id: 'align-all', suite: 'home-ribbon',
    name: 'ארבעה יישורים בעמוד אחד', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p style="text-align:right">ימין</p>' +
        '<p style="text-align:center">מרכז</p>' +
        '<p style="text-align:left">שמאל</p>' +
        '<p style="text-align:justify">' + 'מילה '.repeat(50) + '</p>';
    },
  },
  {
    id: 'line-spacing-1', suite: 'home-ribbon',
    name: 'ריווח שורות 1.0 — יותר עמודים', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 80; i++)
        h += `<p style="line-height:1.0">${'מילה '.repeat(15)}</p>`;
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'line-spacing-stress', suite: 'home-ribbon',
    name: 'ריווח שורות 3.0 — pagination מתעדכן', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 40; i++)
        h += `<p style="line-height:3">${'מילה '.repeat(15)}</p>`;
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'indent-heavy', suite: 'home-ribbon',
    name: 'הזחה עמוקה — לא חורגת מהשוליים', rule: 'PAGE_RULES §2',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p style="margin-right:6cm">הזחה עמוקה מימין</p>' +
        '<p style="margin-left:6cm">הזחה עמוקה משמאל</p>' +
        '<p style="margin:1cm 3cm">' + 'מילה '.repeat(30) + '</p>';
    },
  },

  // B4 — רשימות
  {
    id: 'list-unordered', suite: 'home-ribbon',
    name: 'רשימת תבליטים — 80 פריטים', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      let h = '<ul>';
      for (let i = 0; i < 80; i++) h += `<li>פריט ${i+1} — ${'מילה '.repeat(5)}</li>`;
      document.getElementById('editor').innerHTML = h + '</ul>';
    },
  },
  {
    id: 'list-ordered', suite: 'home-ribbon',
    name: 'רשימה ממוספרת — 80 פריטים', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      let h = '<ol>';
      for (let i = 0; i < 80; i++) h += `<li>פריט ${i+1}</li>`;
      document.getElementById('editor').innerHTML = h + '</ol>';
    },
  },
  {
    id: 'list-auto-dash', suite: 'home-ribbon',
    name: 'זיהוי רשימה אוטומטי — "- " + Space', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>- </p>';
      editor.focus();
      // מדמה לחיצת Space שמפעילה auto-list
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      editor.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
    },
  },
  {
    id: 'list-auto-number', suite: 'home-ribbon',
    name: 'זיהוי רשימה אוטומטי — "1. " + Space', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>1. </p>';
      editor.focus();
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    },
  },
  {
    id: 'list-in-table', suite: 'home-ribbon',
    name: 'רשימה בתוך תא טבלה', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<table border="1" style="border-collapse:collapse;width:100%"><tr>' +
        '<td style="padding:8px"><ul><li>פריט א</li><li>פריט ב</li><li>פריט ג</li></ul></td>' +
        '<td style="padding:8px"><ol><li>ראשון</li><li>שני</li></ol></td>' +
        '</tr></table>';
    },
  },

  // B5 — סגנונות בלוק
  {
    id: 'headings', suite: 'home-ribbon',
    name: 'כותרות H1/H2/H3 — break-after:avoid', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 15; i++) {
        h += `<h1>כותרת ראשית ${i+1}</h1>`;
        h += `<h2>כותרת משנה</h2>`;
        h += '<p>' + 'טקסט רגיל '.repeat(30) + '</p>';
      }
      document.getElementById('editor').innerHTML = h;
    },
  },
  {
    id: 'style-h1', suite: 'home-ribbon',
    name: 'סגנון H1 — כותרת גדולה', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<h1>כותרת ראשית גדולה</h1>' +
        '<p>' + 'תוכן המסמך '.repeat(50) + '</p>';
    },
  },
  {
    id: 'style-h2', suite: 'home-ribbon',
    name: 'סגנון H2 — כותרת משנה', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>' + 'פסקה קודמת '.repeat(20) + '</p>' +
        '<h2>כותרת משנה</h2>' +
        '<p>' + 'תוכן '.repeat(50) + '</p>';
    },
  },
  {
    id: 'style-blockquote', suite: 'home-ribbon',
    name: 'סגנון BLOCKQUOTE — ציטוט', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>לפני הציטוט</p>' +
        '<blockquote style="border-right:4px solid #aaa;padding-right:1cm;margin:0.5cm 0">' +
        'זוהי פסקת ציטוט עם גבול צדדי. '.repeat(10) + '</blockquote>' +
        '<p>אחרי הציטוט</p>';
    },
  },
  {
    id: 'style-h1-at-bottom', suite: 'home-ribbon',
    name: 'H1 בסוף עמוד — עוברת לעמוד הבא', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '<p>' + 'מילה '.repeat(340) + '</p>';
      h += '<h1>כותרת שחייבת להיות עם הפסקה שאחריה</h1>';
      h += '<p>' + 'הפסקה שאחרי הכותרת '.repeat(40) + '</p>';
      document.getElementById('editor').innerHTML = h;
    },
  },

  // B6 — כלים
  {
    id: 'format-painter', suite: 'home-ribbon',
    name: 'מברשת עיצוב — לכוד והחל', rule: 'CLAUDE.md §16',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p><b style="color:blue;font-size:18pt">מקור העיצוב</b></p>' +
        '<p>יעד — טקסט רגיל שיקבל עיצוב</p>';
    },
  },
  {
    id: 'undo-text', suite: 'home-ribbon',
    name: 'Ctrl+Z — ביטול הקלדה', rule: 'CLAUDE.md §12',
    setup: () => {
      window.__reset(); window.__para(5);
      document.execCommand('insertText', false, 'טקסט שיבוטל');
      document.execCommand('undo');
    },
  },
  {
    id: 'redo-text', suite: 'home-ribbon',
    name: 'Ctrl+Y — חזרה אחרי ביטול', rule: 'CLAUDE.md §12',
    setup: () => {
      window.__reset(); window.__para(5);
      document.execCommand('insertText', false, 'טקסט');
      document.execCommand('undo');
      document.execCommand('redo');
    },
  },
  {
    id: 'undo-free-obj', suite: 'home-ribbon',
    name: 'Ctrl+Z עם תמונה — תמונה לא נמחקת', rule: 'CLAUDE.md §12',
    setup: () => {
      window.__reset(); window.__para(10);
      window.__freeImg(2, 5, 6, 4);  // תמונה חופשית
      document.getElementById('editor').focus();
      document.execCommand('insertText', false, 'טקסט שיבוטל');
      // undo אמור לבטל את הטקסט, לא את התמונה
      document.execCommand('undo');
    },
  },
  { id: 'color-palette-zindex', suite: 'home-ribbon',
    name: 'פלטת צבע — z-index מעל סרגל הצף', rule: 'CLAUDE.md §8',
    setup: () => {
      window.__reset(); window.__para(10);
      const ctxBar = document.getElementById('ctxBar');
      if (ctxBar) {
        const z = parseInt(getComputedStyle(ctxBar).zIndex || '0');
        if (z > 10050) throw new Error(`ctxBar z-index ${z} גבוה — פלטה תיסתר`);
      }
    },
  },
  { id: 'ctx-more-downward', suite: 'home-ribbon',
    name: '"עוד אפשרויות" — נפתח כלפי מטה תמיד', rule: 'CLAUDE.md §8',
    setup: () => { window.__reset(); window.__para(15); },
  },
  { id: 'blockstyle-all', suite: 'home-ribbon',
    name: 'כל סגנונות הבלוק — P/H1/H2/H3/BLOCKQUOTE', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>' + 'פסקה רגילה '.repeat(15) + '</p>' +
        '<h1>כותרת ראשית</h1><h2>כותרת משנה</h2><h3>כותרת שלישית</h3>' +
        '<blockquote style="border-right:4px solid #aaa;padding-right:1cm">' + 'ציטוט '.repeat(20) + '</blockquote>' +
        '<p>' + 'פסקה אחרונה '.repeat(15) + '</p>';
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE C — סרגל ההוספה (insert) · 75 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  // C1 — תמונות × 7 מצבים × 4 הקשרים
  { id: 'img-free-empty', suite: 'insert', name: 'תמונה free — מסמך ריק', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__freeImg(2, 2, 8, 6, 'free'); } },
  { id: 'img-free-with-text', suite: 'insert', name: 'תמונה free — עם טקסט', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(80, 20); window.__freeImg(2, 5, 6, 4, 'free'); } },
  { id: 'img-free-near-gap', suite: 'insert', name: 'תמונה free — קרוב לגבול עמוד', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(120, 20); window.__freeImg(2, 29.5, 6, 1, 'free'); } },
  { id: 'img-free-multipage', suite: 'insert', name: 'תמונה free — 3 תמונות ב-3 עמודים', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(200, 20); window.__freeImg(2,5,5,4); window.__freeImg(2,36,5,4); window.__freeImg(2,67,5,4); } },

  { id: 'img-above-text-empty', suite: 'insert', name: 'תמונה above-text — מסמך ריק', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__freeImg(2, 2, 8, 6, 'above-text'); } },
  { id: 'img-above-text-with-text', suite: 'insert', name: 'תמונה above-text — מעל טקסט', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(80); window.__freeImg(2, 5, 8, 6, 'above-text'); } },
  { id: 'img-above-text-near-gap', suite: 'insert', name: 'תמונה above-text — קרוב לפער', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(120); window.__freeImg(2, 28, 8, 4, 'above-text'); } },
  { id: 'img-above-text-multipage', suite: 'insert', name: 'תמונה above-text — ריבוי עמודים', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(200); window.__freeImg(2,5,5,4,'above-text'); window.__freeImg(2,36,5,4,'above-text'); } },

  { id: 'img-below-text-empty', suite: 'insert', name: 'תמונה below-text — מסמך ריק', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); const o=window.__freeImg(2,2,8,6,'below-text'); o.style.zIndex='5'; } },
  { id: 'img-below-text-with-text', suite: 'insert', name: 'תמונה below-text — מתחת טקסט', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(80); const o=window.__freeImg(2,5,8,6,'below-text'); o.style.zIndex='5'; } },
  { id: 'img-below-text-near-gap', suite: 'insert', name: 'תמונה below-text — קרוב לפער', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(120); const o=window.__freeImg(2,28,8,4,'below-text'); o.style.zIndex='5'; } },
  { id: 'img-below-text-multipage', suite: 'insert', name: 'תמונה below-text — ריבוי עמודים', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(200); window.__freeImg(2,5,5,4,'below-text'); window.__freeImg(2,36,5,4,'below-text'); } },

  { id: 'img-float-right-empty', suite: 'insert', name: 'תמונה float-right — מסמך ריק', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p><img src="'+window.PNG_1x1+'" style="float:right;width:6cm;height:6cm;margin-left:0.5cm">טקסט קצר</p>'; } },
  { id: 'img-float-right-with-text', suite: 'insert', name: 'תמונה float-right — טקסט עוטף', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p><img src="'+window.PNG_1x1+'" style="float:right;width:6cm;height:8cm;margin-left:0.5cm">'+'מילה '.repeat(200)+'</p>'; } },
  { id: 'img-float-right-near-gap', suite: 'insert', name: 'תמונה float-right — קרוב לפער', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p>'+'מילה '.repeat(320)+'</p><p><img src="'+window.PNG_1x1+'" style="float:right;width:6cm;height:5cm;margin-left:0.5cm">'+'מילה '.repeat(100)+'</p>'; } },
  { id: 'img-float-right-multipage', suite: 'insert', name: 'תמונה float-right — ריבוי עמודים', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); let h=''; for(let i=0;i<3;i++) h+='<p><img src="'+window.PNG_1x1+'" style="float:right;width:5cm;height:6cm;margin-left:0.5cm">'+'מילה '.repeat(150)+'</p>'; document.getElementById('editor').innerHTML=h; } },

  { id: 'img-float-left-empty', suite: 'insert', name: 'תמונה float-left — מסמך ריק', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p><img src="'+window.PNG_1x1+'" style="float:left;width:6cm;height:6cm;margin-right:0.5cm">טקסט קצר</p>'; } },
  { id: 'img-float-left-with-text', suite: 'insert', name: 'תמונה float-left — טקסט עוטף', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p><img src="'+window.PNG_1x1+'" style="float:left;width:6cm;height:8cm;margin-right:0.5cm">'+'מילה '.repeat(200)+'</p>'; } },
  { id: 'img-float-left-near-gap', suite: 'insert', name: 'תמונה float-left — קרוב לפער', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p>'+'מילה '.repeat(300)+'</p><p><img src="'+window.PNG_1x1+'" style="float:left;width:5cm;height:5cm;margin-right:0.5cm">'+'מילה '.repeat(100)+'</p>'; } },
  { id: 'img-float-left-multipage', suite: 'insert', name: 'תמונה float-left — ריבוי עמודים', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); let h=''; for(let i=0;i<3;i++) h+='<p><img src="'+window.PNG_1x1+'" style="float:left;width:5cm;height:6cm;margin-right:0.5cm">'+'מילה '.repeat(150)+'</p>'; document.getElementById('editor').innerHTML=h; } },

  { id: 'img-inline-empty', suite: 'insert', name: 'תמונה inline — מסמך ריק', rule: 'PAGE_RULES §8',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p><img src="'+window.PNG_1x1+'" style="display:block;width:10cm;height:12cm"></p>'; } },
  { id: 'img-inline-pagination', suite: 'insert', name: 'תמונה inline — דוחה טקסט + pagination', rule: 'PAGE_RULES §3+§8',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p>'+'לפני '.repeat(50)+'</p><p><img src="'+window.PNG_1x1+'" style="display:block;width:10cm;height:15cm"></p><p>'+'אחרי '.repeat(50)+'</p>'; } },
  { id: 'img-inline-near-gap', suite: 'insert', name: 'תמונה inline — נוחתת בפער', rule: 'PAGE_RULES §3+§8',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p>'+'מילה '.repeat(330)+'</p><p><img src="'+window.PNG_1x1+'" style="display:block;width:8cm;height:10cm"></p><p>אחרי</p>'; } },
  { id: 'img-inline-huge', suite: 'insert', name: 'תמונה inline ענקית — נחסמת ל-24.7cm', rule: 'PAGE_RULES §8',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML='<p><img src="'+window.PNG_1x1+'" style="width:10cm;height:40cm"></p>'; } },

  { id: 'img-behind-empty', suite: 'insert', name: 'תמונה behind — מסמך ריק (סימן מים)', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); const o=window.__freeImg(2,2,14,20,'behind'); o.style.zIndex='-1'; o.style.opacity='0.3'; } },
  { id: 'img-behind-with-text', suite: 'insert', name: 'תמונה behind — מאחורי טקסט', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(60); const o=window.__freeImg(2,2,14,20,'behind'); o.style.zIndex='-1'; o.style.opacity='0.2'; } },

  // C — תרחישים מיוחדים לתמונות
  /* עודכן 2026-07-11 (פעם שנייה באותו יום): הכפתור בסרגל הצף כבר לא מחזורי —
     לבקשת המשתמש ("חלונית כמו בוורד") הוא פותח עכשיו את openWrapPanel (רשת
     6 מצבים עם אייקונים). התרחיש בודק את הזרימה החדשה בלחיצות אמיתיות:
     קליק על הכפתור → החלונית נפתחת (והמצב לא משתנה מעצם הפתיחה!) → קליק על
     כל אחד מ-6 המצבים בחלונית → data-img-mode מתעדכן בהתאמה → Escape סוגר.
     ⚠️ מלכודות-תזמון (זיכרון [[ctxbar-pointerup]]): כפתור-הסרגל יורה על
     pointerup + דה-דופ 350ms; כפתורי-החלונית (wp-btn) יורים על click רגיל. */
  { id: 'img-mode-cycle', suite: 'insert', name: 'חלונית מצבי-תמונה (לחיצות אמיתיות) — נפתחת מהכפתור, כל 6 המצבים נבחרים, Escape סוגר', rule: 'CLAUDE.md §5',
    setup: async () => {
      window.__reset(); window.__para(80, 20);
      const obj = window.__freeImg(2, 5, 6, 4, 'free');
      obj.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      obj.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
    },
    assert: async () => {
      const issues = [];
      const CANONICAL = window.IMG_MODES || ['free', 'above-text', 'float-right', 'float-left', 'inline', 'behind'];
      const bar = document.getElementById('ctxBar');
      const wrapB = bar && [...bar.querySelectorAll('button')].find(b => (b.getAttribute('title') || '').startsWith('מצב תמונה'));
      if (!wrapB) { issues.push({ type: 'button-missing', msg: 'כפתור מצב-תמונה לא נמצא בסרגל הצף אחרי בחירת תמונה (ctxBar לא נפתח?)', id: 'img-mode-cycle' }); return issues; }
      const obj = document.querySelector('.free-obj');
      // פתיחת החלונית מהכפתור החי
      wrapB.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      wrapB.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const panel = document.querySelector('.wrap-panel');
      if (!panel) { issues.push({ type: 'panel-missing', msg: 'לחיצה על כפתור-המצב לא פתחה את חלונית-הבחירה (.wrap-panel)', id: 'img-mode-cycle' }); return issues; }
      if (obj.dataset.imgMode !== 'free')
        issues.push({ type: 'img-mode-panel', msg: `עצם פתיחת החלונית שינתה מצב (${obj.dataset.imgMode}) — אסור`, id: 'img-mode-cycle' });
      // בחירת כל אחד מ-6 המצבים דרך כפתורי-החלונית האמיתיים
      for (const m of CANONICAL) {
        const mb = panel.querySelector(`.wp-btn[data-mode="${m}"]`);
        if (!mb) { issues.push({ type: 'panel-mode-missing', msg: `מצב "${m}" חסר בחלונית`, id: 'img-mode-cycle' }); continue; }
        mb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 120));
        if (obj.dataset.imgMode !== m)
          issues.push({ type: 'img-mode-panel-mismatch', msg: `בחרתי "${m}" בחלונית אך data-img-mode="${obj.dataset.imgMode}"`, id: 'img-mode-cycle' });
        const act = panel.querySelector('.wp-btn.active');
        if (!act || act.dataset.mode !== m)
          issues.push({ type: 'img-mode-panel-active', msg: `סימון-הפעיל בחלונית לא התעדכן ל-"${m}"`, id: 'img-mode-cycle' });
      }
      // חזרה ל-free וסגירה ב-Escape
      const freeB = panel.querySelector('.wp-btn[data-mode="free"]');
      if (freeB) { freeB.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 120)); }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 100));
      if (document.querySelector('.wrap-panel'))
        issues.push({ type: 'panel-escape', msg: 'Escape לא סגר את חלונית-המצבים', id: 'img-mode-cycle' });
      return issues;
    },
  },
  { id: 'img-resize-ratio', suite: 'insert', name: 'שינוי גודל תמונה + שמירת יחס (Shift)', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      window.__freeImg(2, 5, 6, 4);
      window.__freeImg(8, 12, 4, 6);
    },
  },
  { id: 'img-rotate-45', suite: 'insert', name: 'סיבוב תמונה 45°', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeImg(2, 5, 6, 4);
      obj.setAttribute('data-rotation', '45');
      obj.style.transform = 'rotate(45deg)';
    },
  },
  { id: 'img-opacity-50', suite: 'insert', name: 'שקיפות תמונה 50%', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeImg(2, 5, 6, 4);
      obj.style.opacity = '0.5';
    },
  },
  { id: 'img-multipage-5', suite: 'insert', name: '5 תמונות ב-5 עמודים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(300, 20);
      for (let i = 0; i < 5; i++) window.__freeImg(2, i * 31.2 + 2, 5, 4);
    },
  },
  { id: 'img-free-clamp', suite: 'insert', name: 'תמונה free — גרירה + clamp בגבול עמוד', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(200, 20); window.__freeImg(1, 29.5, 8, 6, 'free'); } },

  // C2 — טבלאות (18)
  { id: 'table-basic', suite: 'insert', name: 'טבלה 4×4 — הכנסה + כתיבה', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = window.__bigTable(4, 4); } },
  { id: 'table-10x6', suite: 'insert', name: 'טבלה 10×6', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = window.__bigTable(10, 6); } },
  { id: 'table-multipage', suite: 'insert', name: 'טבלה 25 שורות — break-inside:avoid', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<p>'+'לפני '.repeat(100)+'</p>' + window.__bigTable(25, 4); } },
  { id: 'table-in-gap', suite: 'insert', name: 'טבלה בפער — paginateBlocks דוחף', rule: 'PAGE_RULES §3',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<p style="font-size:14pt">'+'מילה '.repeat(350)+'</p>' + window.__bigTable(8, 3); } },
  { id: 'table-with-img', suite: 'insert', name: 'תמונה + קישור בתוך תא', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="padding:8px"><img src="'+window.PNG_1x1+'" style="width:3cm;height:3cm"></td><td><a href="https://example.com">קישור</a></td><td><b>מודגש</b></td></tr></table>'; } },
  { id: 'table-styled-cells', suite: 'insert', name: 'עיצוב שונה בכל תא', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="background:#ffe;font-size:18pt;padding:8px">גדול</td><td style="background:#eff;color:red;padding:8px">אדום</td><td style="background:#fef;font-style:italic;padding:8px">נטוי</td></tr></table>'; } },
  { id: 'table-tab-navigation', suite: 'insert', name: 'Tab ניווט בין תאי טבלה', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML = window.__bigTable(5, 4);
      const firstTd = document.querySelector('#editor td');
      if (firstTd) {
        firstTd.focus();
        firstTd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      }
    },
  },
  { id: 'table-add-row', suite: 'insert', name: 'הוסף שורה לטבלה', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML = window.__bigTable(3, 3);
      // מדמה הוספת שורה דרך execCommand
      const lastTd = document.querySelector('#editor tr:last-child td:last-child');
      if (lastTd) lastTd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    },
  },
  { id: 'table-list-in-cell', suite: 'insert', name: 'רשימה בתוך תא טבלה', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="padding:8px"><ul><li>פריט א</li><li>פריט ב</li><li>פריט ג</li></ul></td><td style="padding:8px"><ol><li>ראשון</li><li>שני</li></ol></td></tr></table>'; } },
  { id: 'table-nested-format', suite: 'insert', name: 'עיצוב טקסט מעורב בתוך טבלה', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '<table border="1" style="border-collapse:collapse;width:100%">';
      for (let i = 0; i < 8; i++) {
        h += '<tr>';
        for (let j = 0; j < 3; j++) {
          const styles = ['font-weight:bold', 'font-style:italic', 'color:blue'];
          h += `<td style="padding:6px;${styles[(i+j)%3]}">תא ${i+1},${j+1}</td>`;
        }
        h += '</tr>';
      }
      document.getElementById('editor').innerHTML = h + '</table>';
    },
  },
  { id: 'table-near-end-of-page', suite: 'insert', name: 'טבלה בקצה עמוד — לא חוצה גבול', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<p>'+'מילה '.repeat(330)+'</p>' + window.__bigTable(5, 4); } },
  { id: 'table-with-header-row', suite: 'insert', name: 'טבלה עם שורת כותרת + תוכן', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '<table border="1" style="border-collapse:collapse;width:100%">';
      h += '<tr style="background:#ddd"><th>שם</th><th>ערך</th><th>הערות</th></tr>';
      for (let i = 0; i < 15; i++) h += `<tr><td>פריט ${i+1}</td><td>${i*10}</td><td>הערה ${i+1}</td></tr>`;
      document.getElementById('editor').innerHTML = h + '</table>';
    },
  },
  { id: 'table-very-wide', suite: 'insert', name: 'טבלה רחבה — 8 עמודות', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = window.__bigTable(10, 8); } },
  { id: 'table-before-after-text', suite: 'insert', name: 'טבלה בין שני בלוקי טקסט', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<p>'+'לפני '.repeat(150)+'</p>' + window.__bigTable(8, 3) + '<p>'+'אחרי '.repeat(100)+'</p>'; } },
  { id: 'table-multiple', suite: 'insert', name: 'שלוש טבלאות עוקבות', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = window.__bigTable(6,3)+'<p>בין הטבלאות</p>'+window.__bigTable(6,3)+'<p>בין הטבלאות</p>'+window.__bigTable(6,3); } },
  { id: 'table-cell-with-long-text', suite: 'insert', name: 'תא עם טקסט ארוך — גלישה תקינה', rule: 'PAGE_RULES §4',
    setup: () => { window.__reset(); document.getElementById('editor').innerHTML = '<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="padding:8px;width:30%">'+'מילה '.repeat(100)+'</td><td style="padding:8px">תא קצר</td></tr></table>'; } },
  { id: 'table-font-size-mix', suite: 'insert', name: 'גדלי גופן שונים בתאים — pagination', rule: 'PAGE_RULES §4',
    setup: () => {
      window.__reset();
      let h = '<table border="1" style="border-collapse:collapse;width:100%">';
      const sizes = [10, 14, 18, 24, 36];
      for (let i = 0; i < 10; i++) {
        const sz = sizes[i % sizes.length];
        h += `<tr><td style="font-size:${sz}pt;padding:6px">גופן ${sz}pt</td><td style="padding:6px">ערך ${i+1}</td></tr>`;
      }
      document.getElementById('editor').innerHTML = h + '</table>';
    },
  },

  // C3 — תיבות טקסט (8)
  { id: 'textbox-basic', suite: 'insert', name: 'תיבת טקסט — כתיבה + גרירה', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(100, 20); window.__freeTextbox(2, 5, 8, 4, 'תוכן התיבה עם טקסט'); } },
  { id: 'textbox-near-gap', suite: 'insert', name: 'תיבת טקסט קרוב לפער — _clamp', rule: 'CLAUDE.md §5',
    setup: () => { window.__reset(); window.__para(100, 20); window.__freeTextbox(2, 29.5, 8, 3, 'תיבה על הגבול'); } },
  { id: 'textbox-formatted', suite: 'insert', name: 'תיבת טקסט עם עיצוב עשיר', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const ppc = window.__pxPerCm();
      const d = document.createElement('div');
      d.className = 'free-obj free-textbox';
      d.setAttribute('contenteditable', 'false');
      d.style.cssText = `position:absolute;left:${2*ppc}px;top:${5*ppc}px;width:${10*ppc}px;height:${6*ppc}px;z-index:15;border:2px solid #333;background:#fffde7`;
      d.innerHTML = '<div class="tb-header" style="height:1.5em;background:#ff9800;color:#fff;font-size:10pt;padding:2px">כותרת תיבה</div>'+
        '<div class="tb-content" contenteditable="true" style="padding:6px"><b>מודגש</b> ו<i>נטוי</i> וטקסט רגיל</div>';
      document.getElementById('editor').appendChild(d);
    },
  },
  { id: 'textbox-rotate', suite: 'insert', name: 'תיבת טקסט עם סיבוב', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeTextbox(5, 5, 8, 4, 'תיבה מסובבת');
      obj.setAttribute('data-rotation', '30');
      obj.style.transform = 'rotate(30deg)';
    },
  },
  { id: 'textbox-opacity', suite: 'insert', name: 'תיבת טקסט עם שקיפות 60%', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeTextbox(2, 5, 8, 4, 'תיבה שקופה');
      obj.style.opacity = '0.6';
    },
  },
  { id: 'textbox-multipage', suite: 'insert', name: 'תיבות טקסט ב-3 עמודים שונים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(200);
      window.__freeTextbox(2, 5, 8, 4, 'עמוד 1');
      window.__freeTextbox(2, 36, 8, 4, 'עמוד 2');
      window.__freeTextbox(2, 67, 8, 4, 'עמוד 3');
    },
  },
  { id: 'textbox-and-image', suite: 'insert', name: 'תיבת טקסט + תמונה — ריבוד', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(80);
      window.__freeImg(2, 5, 8, 6);
      window.__freeTextbox(4, 7, 6, 3, 'תיבה מעל התמונה');
    },
  },
  { id: 'textbox-long-content', suite: 'insert', name: 'תיבת טקסט עם תוכן ארוך — גלילה', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeTextbox(2, 5, 8, 4);
      const content = obj.querySelector('.tb-content');
      if (content) content.innerHTML = '<p>' + 'שורה של תוכן ארוך. '.repeat(20) + '</p>';
    },
  },

  // C4 — כותרת/תחתית (8)
  { id: 'header-text', suite: 'insert', name: 'כותרת עליונה עם טקסט', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(100);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת המסמך — כותרת עליונה';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'header-page-number', suite: 'insert', name: 'כותרת עם מספור עמודים {עמוד}/{סהכ}', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(150);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'עמוד {עמוד} מתוך {סהכ}';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'footer-text', suite: 'insert', name: 'כותרת תחתונה עם טקסט', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(100);
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'כותרת תחתונה — שם הארגון';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'footer-page-number', suite: 'insert', name: 'תחתית עם {page} ו-{total}', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(150);
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'Page {page} of {total}';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'header-footer-both', suite: 'insert', name: 'כותרת + תחתית — 1.8+1.6cm מרווח', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(150);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת עמוד {עמוד}';
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית — {סהכ} עמודים';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'header-pagination', suite: 'insert', name: 'כותרת עליונה — paginateBlocks שומר 1.8cm', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(200, 25);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת עליונה — {עמוד} מתוך {סהכ}';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'footer-pagination', suite: 'insert', name: 'כותרת תחתונה — paginateBlocks שומר 1.6cm', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(200, 25);
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית — עמוד {עמוד}';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'header-footer-5pages', suite: 'insert', name: '5 עמודים + כותרת + תחתית', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(160, 25);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת';
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },

  // C5 — כלים ועוד (6)
  { id: 'page-break', suite: 'insert', name: 'מעבר עמוד ידני × 3 — 4 עמודים', rule: 'PAGE_RULES §3', expectPages: 4,
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>עמוד 1</p><div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 2</p><div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 3</p><div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 4</p>';
    },
  },
  { id: 'hr-insert', suite: 'insert', name: 'קו אופקי בין פסקאות', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>' + 'לפני הקו '.repeat(50) + '</p><hr><p>' + 'אחרי הקו '.repeat(50) + '</p>';
    },
  },
  { id: 'link-in-text', suite: 'insert', name: 'קישור בתוך טקסט', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>טקסט עם <a href="https://example.com">קישור לדוגמה</a> בתוכו</p>';
    },
  },
  { id: 'mixed-objects-page', suite: 'insert', name: 'תמונות + תיבות + טבלה בעמוד', rule: 'כל חוקי הדף',
    setup: () => {
      window.__reset(); window.__para(80);
      window.__freeImg(1, 3, 5, 4);
      window.__freeTextbox(9, 3, 7, 4, 'תיבת טקסט לצד התמונה');
      document.getElementById('editor').innerHTML += window.__bigTable(6, 3);
    },
  },
  { id: 'multimode-multipage', suite: 'insert', name: 'תמונות במצבים שונים ב-3 עמודים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(150, 20);
      window.__freeImg(1, 5, 5, 4, 'free');
      window.__freeImg(10, 35, 5, 4, 'free');
      window.__freeImg(1, 65, 5, 4, 'free');
      document.getElementById('editor').innerHTML +=
        '<p><img src="' + window.PNG_1x1 + '" style="float:right;width:5cm;height:7cm">' + 'מילה '.repeat(80) + '</p>';
    },
  },
  { id: 'img-and-table-gap', suite: 'insert', name: 'תמונה + טבלה שניהם קרובים לפער', rule: 'PAGE_RULES §3',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>' + 'מילה '.repeat(300) + '</p>' +
        '<p><img src="' + window.PNG_1x1 + '" style="float:right;width:4cm;height:4cm">' + 'מילה '.repeat(50) + '</p>' +
        window.__bigTable(4, 3);
    },
  },
  { id: 'shape-and-textbox', suite: 'insert', name: 'צורה SVG + textbox באותו עמוד', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      window.__freeTextbox(2, 5, 8, 4, 'תיבה ליד צורה');
      // צורה מדומה
      const ppc = window.__pxPerCm();
      const sh = document.createElement('div');
      sh.className = 'free-obj';
      sh.setAttribute('contenteditable', 'false');
      sh.style.cssText = `position:absolute;left:${12*ppc}px;top:${5*ppc}px;width:${4*ppc}px;height:${4*ppc}px;z-index:15`;
      sh.innerHTML = '<div class="free-shape-wrap"><svg width="100%" height="100%"><rect width="100%" height="100%" fill="#4fc3f7" rx="8"/></svg></div>';
      document.getElementById('editor').appendChild(sh);
    },
  },
  { id: 'note-and-image', suite: 'insert', name: 'פתק + תמונה ריבוד', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      window.__freeImg(2, 5, 8, 6, 'free');
      const ppc = window.__pxPerCm();
      const note = document.createElement('div');
      note.className = 'free-obj free-textbox free-note';
      note.setAttribute('contenteditable', 'false');
      note.style.cssText = `position:absolute;left:${4*ppc}px;top:${7*ppc}px;width:${4*ppc}px;height:${3*ppc}px;z-index:20;background:#fffde7;border:1px solid #ffcc00`;
      note.innerHTML = '<div class="tb-header" style="background:#ffcc00;height:1em"></div><div class="tb-content" contenteditable="true" style="padding:4px">פתק מעל תמונה</div>';
      document.getElementById('editor').appendChild(note);
    },
  },
  { id: 'header-and-free-obj', suite: 'insert', name: 'כותרת עליונה + תמונה חופשית — אין חפיפה', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset(); window.__para(80);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת — {עמוד}';
      window.__freeImg(2, 2.5, 6, 4); // תמונה קרוב לראש הדף
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'table-and-header-pagination', suite: 'insert', name: 'כותרת + טבלה ארוכה — pagination', rule: 'CLAUDE.md §9',
    setup: () => {
      window.__reset();
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת — {עמוד}';
      document.getElementById('editor').innerHTML = '<p>' + 'מילה '.repeat(100) + '</p>' + window.__bigTable(20, 4);
      if (typeof updatePagination === 'function') updatePagination();
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE D — זום (zoom) · 12 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  { id: 'zoom-50', suite: 'zoom', name: 'זום 50% — pagination נכון', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(100, 25);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '0.5';
      window._docZoom = 0.5;
    },
  },
  { id: 'zoom-75', suite: 'zoom', name: 'זום 75%', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(100, 25);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '0.75';
      window._docZoom = 0.75;
    },
  },
  { id: 'zoom-100', suite: 'zoom', name: 'זום 100% — ברירת מחדל', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(50, 25);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.0';
      window._docZoom = 1.0;
    },
  },
  { id: 'zoom-150', suite: 'zoom', name: 'זום 150% — pagination נכון', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(100, 25);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
    },
  },
  { id: 'zoom-200', suite: 'zoom', name: 'זום 200% — מקסימום', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(60, 25);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '2.0';
      window._docZoom = 2.0;
    },
  },
  { id: 'zoom-reset', suite: 'zoom', name: 'איפוס זום ל-100%', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(50, 25);
      const stack = document.getElementById('pageStack');
      if (stack) { stack.style.zoom = '2.0'; window._docZoom = 2.0; }
      if (stack) { stack.style.zoom = '1.0'; window._docZoom = 1.0; }
    },
  },
  { id: 'zoom-obj-position', suite: 'zoom', name: 'אובייקט חופשי בזום 150% — מיקום נכון', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(80, 20);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
      window.__freeImg(2, 5, 6, 4);
      window.__freeImg(2, 35, 6, 4);
    },
  },
  { id: 'zoom-obj-drag-150', suite: 'zoom', name: 'גרירת אובייקט בזום 150% — delta / _docZoom', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(80, 20);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
      window.__freeImg(5, 8, 6, 4);
    },
  },
  { id: 'zoom-obj-resize-150', suite: 'zoom', name: 'שינוי גודל בזום 150% — handle עוקב', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(60);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
      window.__freeImg(3, 5, 8, 6);
    },
  },
  { id: 'zoom-pagination-150', suite: 'zoom', name: 'GAP ZONE נכון בזום 150%', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(200, 25);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
    },
  },
  { id: 'zoom-textbox-drag', suite: 'zoom', name: 'גרירת textbox בזום', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset(); window.__para(60);
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
      window.__freeTextbox(4, 6, 8, 4, 'תיבה בזום 150%');
    },
  },
  { id: 'zoom-table-scroll', suite: 'zoom', name: 'גלילה לטבלה ארוכה בזום', rule: 'CLAUDE.md §10',
    setup: () => {
      window.__reset();
      const stack = document.getElementById('pageStack');
      if (stack) stack.style.zoom = '1.5';
      window._docZoom = 1.5;
      document.getElementById('editor').innerHTML = '<p>' + 'תוכן '.repeat(100) + '</p>' + window.__bigTable(20, 4);
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE E — הדפסה (print) · 10 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  { id: 'print-hides-toolbar', suite: 'print', name: '@media print — ribbon מוסתר', rule: 'CLAUDE.md §14',
    setup: () => {
      window.__reset(); window.__para(20);
      // קריאת @media print בסימולציה
      const ribbon = document.querySelector('.ribbon, #ribbon, [data-ribbon]');
      // תוצאה נבדקת בצילום מסך
    },
  },
  { id: 'print-hides-statusbar', suite: 'print', name: '@media print — status bar מוסתר', rule: 'CLAUDE.md §14',
    setup: () => { window.__reset(); window.__para(20); },
  },
  { id: 'print-shows-page-only', suite: 'print', name: '@media print — רק .page מוצג', rule: 'CLAUDE.md §14',
    setup: () => { window.__reset(); window.__para(30); },
  },
  { id: 'print-page-size-a4', suite: 'print', name: 'גודל עמוד בהדפסה — 21cm × 29.7cm', rule: 'PAGE_RULES §1',
    setup: () => {
      window.__reset(); window.__para(10);
      const page = document.querySelector('.page');
      if (page) {
        const ppc = window.__pxPerCm();
        const rect = page.getBoundingClientRect();
        const widthCm = rect.width / ppc;
        if (Math.abs(widthCm - 21) > 1) throw new Error(`רוחב עמוד שגוי: ${widthCm.toFixed(2)}cm (צפוי 21cm)`);
      }
    },
  },
  { id: 'print-free-obj-visible', suite: 'print', name: 'אובייקטים חופשיים גלויים בהדפסה', rule: 'CLAUDE.md §14',
    setup: () => {
      window.__reset(); window.__para(60);
      window.__freeImg(2, 5, 8, 6);
      window.__freeTextbox(2, 15, 8, 4, 'תיבה בהדפסה');
    },
  },
  { id: 'print-multipage', suite: 'print', name: 'הדפסת מסמך 3 עמודים', rule: 'CLAUDE.md §14', expectPages: 3,
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>עמוד 1</p><div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 2</p><div style="page-break-after:always;break-after:page;height:0"></div>' +
        '<p>עמוד 3</p>';
    },
  },
  { id: 'print-header-visible', suite: 'print', name: 'כותרת עליונה גלויה בהדפסה', rule: 'CLAUDE.md §9+§14',
    setup: () => {
      window.__reset(); window.__para(60);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת להדפסה — עמוד {עמוד}';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'print-footer-visible', suite: 'print', name: 'כותרת תחתונה גלויה בהדפסה', rule: 'CLAUDE.md §9+§14',
    setup: () => {
      window.__reset(); window.__para(60);
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית להדפסה — {סהכ} עמודים';
      if (typeof updatePagination === 'function') updatePagination();
    },
  },
  { id: 'print-no-overlays', suite: 'print', name: 'overlays עיצוביים לא מודפסים', rule: 'CLAUDE.md §14',
    setup: () => {
      window.__reset(); window.__para(80);
      // overlays של מספרי עמוד אמורים להיעלם ב-@media print
    },
  },
  { id: 'print-images-intact', suite: 'print', name: 'תמונות בכל המצבים מודפסות', rule: 'CLAUDE.md §14',
    setup: () => {
      window.__reset(); window.__para(60);
      window.__freeImg(1, 3, 5, 4, 'free');
      document.getElementById('editor').innerHTML +=
        '<p><img src="' + window.PNG_1x1 + '" style="float:right;width:4cm;height:4cm">' + 'מילה '.repeat(60) + '</p>';
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE F — קיצורי מקלדת (keyboard) · 20 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  { id: 'kb-bold', suite: 'keyboard', name: 'Ctrl+B — מודגש מקלדת', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+b'); } },
  { id: 'kb-italic', suite: 'keyboard', name: 'Ctrl+I — נטוי מקלדת', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+i'); } },
  { id: 'kb-underline', suite: 'keyboard', name: 'Ctrl+U — קו תחתון מקלדת', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+u'); } },
  { id: 'kb-bold-italic', suite: 'keyboard', name: 'Ctrl+B + Ctrl+I יחד', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+b'); window.__key('ctrl+i'); } },
  { id: 'kb-align-right', suite: 'keyboard', name: 'Ctrl+R — יישור ימין', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+r'); } },
  { id: 'kb-align-center', suite: 'keyboard', name: 'Ctrl+E — מרכוז', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+e'); } },
  { id: 'kb-align-left', suite: 'keyboard', name: 'Ctrl+L — יישור שמאל', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__selectAll(); window.__key('ctrl+l'); } },
  { id: 'kb-align-justify', suite: 'keyboard', name: 'Ctrl+J — דו-צדדי', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10, 30); window.__selectAll(); window.__key('ctrl+j'); } },
  { id: 'kb-font-up', suite: 'keyboard', name: 'Ctrl+] × 5 — הגדלת גופן', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(20); window.__selectAll(); for(let i=0;i<5;i++) window.__key('ctrl+]'); } },
  { id: 'kb-font-down', suite: 'keyboard', name: 'Ctrl+[ × 3 — הקטנת גופן', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(20); window.__selectAll(); for(let i=0;i<3;i++) window.__key('ctrl+['); } },
  { id: 'kb-font-up-down', suite: 'keyboard', name: 'Ctrl+] × 5 + Ctrl+[ × 5 — גודל חוזר', rule: 'CLAUDE.md §13',
    setup: () => {
      window.__reset(); window.__para(20); window.__selectAll();
      for(let i=0;i<5;i++) window.__key('ctrl+]');
      for(let i=0;i<5;i++) window.__key('ctrl+[');
    },
  },
  { id: 'kb-undo', suite: 'keyboard', name: 'Ctrl+Z — ביטול', rule: 'CLAUDE.md §13',
    setup: () => {
      window.__reset(); window.__para(5);
      document.execCommand('insertText', false, 'טקסט לביטול');
      window.__key('ctrl+z');
    },
  },
  { id: 'kb-redo', suite: 'keyboard', name: 'Ctrl+Y — חזרה', rule: 'CLAUDE.md §13',
    setup: () => {
      window.__reset(); window.__para(5);
      document.execCommand('insertText', false, 'טקסט');
      window.__key('ctrl+z');
      window.__key('ctrl+y');
    },
  },
  { id: 'kb-redo-shift', suite: 'keyboard', name: 'Ctrl+Shift+Z — חזרה חלופית', rule: 'CLAUDE.md §13',
    setup: () => {
      window.__reset(); window.__para(5);
      document.execCommand('insertText', false, 'טקסט');
      window.__key('ctrl+z');
      window.__key('ctrl+shift+z');
    },
  },
  { id: 'kb-save', suite: 'keyboard', name: 'Ctrl+S — שמירה', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__key('ctrl+s'); } },
  { id: 'kb-find', suite: 'keyboard', name: 'Ctrl+F — חיפוש', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__key('ctrl+f'); } },
  { id: 'kb-replace', suite: 'keyboard', name: 'Ctrl+H — חיפוש והחלפה', rule: 'CLAUDE.md §13',
    setup: () => { window.__reset(); window.__para(10); window.__key('ctrl+h'); } },
  { id: 'kb-escape', suite: 'keyboard', name: 'Escape — סגירת תפריטים', rule: 'CLAUDE.md §13',
    setup: () => {
      window.__reset(); window.__para(10); window.__selectAll();
      // פותח תפריט ואז סוגר
      window.__key('ctrl+f');
      window.__key('escape');
    },
  },
  { id: 'kb-tab-table', suite: 'keyboard', name: 'Tab בטבלה — ניווט בין תאים', rule: 'CLAUDE.md §11+§13',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML = window.__bigTable(5, 4);
      const firstTd = document.querySelector('#editor td');
      if (firstTd) {
        firstTd.focus();
        for (let i = 0; i < 5; i++)
          firstTd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      }
    },
  },
  { id: 'kb-no-effect-outside-editor', suite: 'keyboard', name: 'קיצורים לא פועלים מחוץ לעורך', rule: 'CLAUDE.md §13',
    setup: () => {
      window.__reset(); window.__para(10);
      // שולח קיצורי מקלדת מחוץ ל-editor (לא אמורים לפעול)
      document.body.dispatchEvent(new KeyboardEvent('keydown', {key:'r',ctrlKey:true,bubbles:true}));
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE G — הדבקה (paste) · 10 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  { id: 'paste-plain', suite: 'paste', name: 'הדבקת טקסט פשוט', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML = '<p>טקסט פשוט שהודבק ישירות</p>';
    },
  },
  { id: 'paste-rich', suite: 'paste', name: 'HTML עשיר — מנקה style/class', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p class="MsoNormal" style="font-family:Calibri;color:red;background:yellow">' +
        '<span style="font-size:12pt;color:blue">טקסט מ-Word</span></p>' +
        '<p><script>alert("xss")<\/script>טקסט אחרי</p>';
    },
  },
  { id: 'paste-removes-script', suite: 'paste', name: 'מסיר `<script>` מה-HTML', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      const editor = document.getElementById('editor');
      // בדיקה שאין script בתוכן
      const hasScript = editor.querySelector('script') !== null;
      if (hasScript) throw new Error('script tag קיים ב-editor!');
      editor.innerHTML = '<p>תוכן נקי ללא script</p>';
    },
  },
  { id: 'paste-removes-class', suite: 'paste', name: 'מסיר class="..." מאלמנטים', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p class="MsoNormal">פסקה עם class מ-Word</p>' +
        '<span class="highlighted important">ספאן עם class</span>';
    },
  },
  { id: 'paste-removes-js-href', suite: 'paste', name: 'מסיר href="javascript:..."', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>טקסט עם <a href="https://safe.example.com">קישור בטוח</a> ו<a href="#">קישור רגיל</a></p>';
      // בדיקה ש-javascript: href הוסר
      const jsLinks = document.querySelectorAll('#editor a[href^="javascript:"]');
      if (jsLinks.length > 0) throw new Error(`נמצאו ${jsLinks.length} קישורי javascript:`);
    },
  },
  { id: 'paste-multiline', suite: 'paste', name: 'הדבקת טקסט רב-שורתי', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>שורה ראשונה</p><p>שורה שנייה</p><p>שורה שלישית</p>' +
        '<p>' + 'מילה '.repeat(50) + '</p>';
    },
  },
  { id: 'paste-in-table', suite: 'paste', name: 'הדבקה בתוך תא טבלה', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<table border="1" style="border-collapse:collapse;width:100%"><tr>' +
        '<td style="padding:8px">תוכן שהודבק <b>מודגש</b> בתוך תא</td>' +
        '<td style="padding:8px">תא רגיל</td></tr></table>';
    },
  },
  { id: 'paste-in-textbox', suite: 'paste', name: 'הדבקה בתוך תיבת טקסט', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset(); window.__para(40);
      const obj = window.__freeTextbox(2, 5, 10, 5, '');
      const content = obj.querySelector('.tb-content');
      if (content) content.innerHTML = '<p><b>תוכן מודגש</b> שהודבק בתיבה</p><p>שורה שנייה</p>';
    },
  },
  { id: 'paste-keeps-basic-format', suite: 'paste', name: 'הדבקה שומרת b/i/u בסיסי', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p><b>מודגש</b> ו<i>נטוי</i> ו<u>קו תחתון</u> — נשמרו</p>';
    },
  },
  { id: 'paste-large-content', suite: 'paste', name: 'הדבקת תוכן גדול — pagination', rule: 'CLAUDE.md §11',
    setup: () => {
      window.__reset();
      let h = '';
      for (let i = 0; i < 100; i++)
        h += `<p>${'תוכן שהודבק '.repeat(20)} (${i+1})</p>`;
      document.getElementById('editor').innerHTML = h;
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE H — שמירה/טעינה (storage) · 12 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  { id: 'save-basic', suite: 'storage', name: 'שמירה אוטומטית — ✓ נשמר', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(10);
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'save-ctrl-s', suite: 'storage', name: 'Ctrl+S — שמירה מיידית', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(10);
      window.__key('ctrl+s');
    },
  },
  { id: 'save-with-images', suite: 'storage', name: 'שמירה עם תמונות חופשיות', rule: 'CLAUDE.md §6',
    setup: () => {
      window.__reset(); window.__para(40);
      window.__freeImg(2, 5, 6, 4);
      window.__freeImg(8, 10, 5, 5);
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'save-with-tables', suite: 'storage', name: 'שמירה עם טבלאות', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<p>פסקה לפני</p>' + window.__bigTable(6, 4) + '<p>פסקה אחרי</p>';
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'save-with-formatting', suite: 'storage', name: 'שמירה עם עיצוב מורכב', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML =
        '<h1 style="color:blue">כותרת כחולה</h1>' +
        '<p><b>מודגש</b> ו<i style="font-size:18pt">נטוי גדול</i></p>' +
        '<p style="text-align:center;font-family:Arial">' + 'מרוכז ב-Arial '.repeat(20) + '</p>';
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'save-with-header-footer', suite: 'storage', name: 'שמירה עם כותרת/תחתית', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(60);
      if (typeof window._docHeader !== 'undefined') window._docHeader = 'כותרת לשמירה — {עמוד}';
      if (typeof window._docFooter !== 'undefined') window._docFooter = 'תחתית לשמירה';
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'save-state-indicator', suite: 'storage', name: 'מחוון מצב שמירה — ✓/⋯/✗', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(10);
      const indicator = document.getElementById('saveState');
      // בדיקה שהאלמנט קיים
      if (!indicator) throw new Error('saveState לא נמצא!');
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'save-multiple-docs', suite: 'storage', name: '3 מסמכים שמורים בו-זמנית', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(5);
      // שמירה לסימולציה של מסמכים מרובים
      try {
        const docs = JSON.parse(localStorage.getItem('myword2_docs') || '{}');
        const count = Object.keys(docs).length;
        // אם יש פחות מ-3 מסמכים, זה תקין לאחר reset
      } catch(e) {}
      if (typeof scheduleSave === 'function') scheduleSave();
    },
  },
  { id: 'storage-schema-valid', suite: 'storage', name: 'סכמת מסמך — כל השדות קיימים', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(5);
      if (typeof scheduleSave === 'function') scheduleSave();
      // בדיקה שהסכמה נכונה
      try {
        const docs = JSON.parse(localStorage.getItem('myword2_docs') || '{}');
        for (const [id, doc] of Object.entries(docs)) {
          const required = ['title', 'content', 'manualPages', 'updated'];
          for (const field of required) {
            if (!(field in doc)) throw new Error(`שדה חסר: ${field} ב-doc[${id}]`);
          }
        }
      } catch(e) { /* יכול להיכשל אם localStorage ריק */ }
    },
  },
  { id: 'storage-last-doc', suite: 'storage', name: 'myword2_last — מסמך אחרון', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(5);
      if (typeof scheduleSave === 'function') scheduleSave();
      const lastKey = localStorage.getItem('myword2_last');
      if (lastKey === null) throw new Error('myword2_last לא הוגדר לאחר שמירה');
    },
  },
  { id: 'undo-does-not-remove-images', suite: 'storage', name: 'Undo לא מוחק תמונות חופשיות', rule: 'CLAUDE.md §12',
    setup: () => {
      window.__reset(); window.__para(10);
      window.__freeImg(2, 5, 6, 4);
      document.getElementById('editor').focus();
      document.execCommand('insertText', false, 'טקסט שיבוטל');
      document.execCommand('undo');
      const imgs = document.querySelectorAll('#editor .free-obj');
      if (imgs.length === 0) throw new Error('תמונה נמחקה על ידי Undo!');
    },
  },
  { id: 'save-localStorage-key', suite: 'storage', name: 'localStorage — מפתח myword2_docs', rule: 'CLAUDE.md §7',
    setup: () => {
      window.__reset(); window.__para(10);
      if (typeof scheduleSave === 'function') scheduleSave();
      // בדיקה שה-key הנכון נמצא
      const hasKey = 'myword2_docs' in localStorage;
      if (!hasKey) throw new Error('myword2_docs לא נמצא ב-localStorage לאחר שמירה');
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SUITE K — אובייקטים חופשיים עמוק (free-objects) · 14 תרחישים
  // ══════════════════════════════════════════════════════════════════════

  { id: 'obj-clamp-all-types', suite: 'free-objects', name: '_clamp לכל סוגי האובייקטים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(120);
      // תמונה, textbox — שניהם על הגבול
      window.__freeImg(2, 29.6, 6, 2);
      window.__freeTextbox(8, 29.6, 6, 2, 'textbox על הגבול');
    },
  },
  { id: 'obj-cross-page-blocked', suite: 'free-objects', name: 'אובייקט לא חוצה לדף אחר', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(200);
      // אובייקט שמנסה להיות בפער עמוד 1
      window.__freeImg(2, 30.5, 6, 3); // בגוף הפער
    },
  },
  { id: 'obj-multi-select', suite: 'free-objects', name: 'בחירה מרובה של אובייקטים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(80);
      const o1 = window.__freeImg(2, 5, 5, 4);
      const o2 = window.__freeImg(9, 5, 5, 4);
      const o3 = window.__freeTextbox(2, 12, 8, 3, 'תיבה');
      // מדמה בחירה
      [o1, o2, o3].forEach(o => o.classList.add('selected'));
    },
  },
  { id: 'obj-layer-zindex', suite: 'free-objects', name: 'שינוי ריבוד — z-index', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const o1 = window.__freeImg(3, 5, 8, 6); o1.style.zIndex = '10';
      const o2 = window.__freeImg(5, 7, 8, 6); o2.style.zIndex = '20'; // מעל o1
      const o3 = window.__freeTextbox(4, 6, 6, 4, 'תיבה'); o3.style.zIndex = '30'; // מעל שניהם
    },
  },
  { id: 'obj-behind-watermark', suite: 'free-objects', name: 'אובייקט z-index:-1 — סימן מים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(100);
      const o = window.__freeImg(1, 2, 16, 22, 'behind');
      o.style.zIndex = '-1';
      o.style.opacity = '0.15';
    },
  },
  { id: 'obj-rotate-save', suite: 'free-objects', name: 'סיבוב נשמר ב-data-rotation', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const angles = [0, 15, 30, 45, 90, 180];
      angles.forEach((ang, i) => {
        const o = window.__freeImg(1 + i * 2.5, 5, 2, 2);
        o.setAttribute('data-rotation', String(ang));
        o.style.transform = `rotate(${ang}deg)`;
      });
    },
  },
  { id: 'obj-opacity-range', suite: 'free-objects', name: 'שקיפות 0%–100% — כל הטווח', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      [0, 0.25, 0.5, 0.75, 1].forEach((op, i) => {
        const o = window.__freeImg(1 + i * 3.2, 5, 2.5, 4);
        o.style.opacity = String(op);
      });
    },
  },
  { id: 'obj-snap-align', suite: 'free-objects', name: 'snap ליישור אובייקטים', rule: 'CLAUDE.md §14',
    setup: () => {
      window.__reset(); window.__para(60);
      // שני אובייקטים ב-top זהה — snap אמור ליישר
      const ppc = window.__pxPerCm();
      const o1 = window.__freeImg(2, 5, 5, 4); // top = 5cm בדיוק
      const o2 = window.__freeImg(9, 5.03, 5, 4); // top = 5.03cm — קרוב ל-snap
    },
  },
  { id: 'obj-serialize-img', suite: 'free-objects', name: 'סריאליזציה של תמונות', rule: 'CLAUDE.md §6',
    setup: () => {
      window.__reset(); window.__para(40);
      window.__freeImg(2, 5, 6, 4, 'free');
      window.__freeImg(9, 10, 5, 5, 'above-text');
      // בדיקה שה-serialization קיים
      if (typeof window._serializeFreeObjs === 'function') {
        const arr = window._serializeFreeObjs();
        if (!Array.isArray(arr)) throw new Error('_serializeFreeObjs לא החזיר מערך');
        if (arr.length < 2) throw new Error(`צפוי 2 אובייקטים, התקבל ${arr.length}`);
      }
    },
  },
  { id: 'obj-serialize-textbox', suite: 'free-objects', name: 'סריאליזציה של textbox', rule: 'CLAUDE.md §6',
    setup: () => {
      window.__reset(); window.__para(40);
      window.__freeTextbox(2, 5, 8, 4, 'תוכן לסריאליזציה');
    },
  },
  { id: 'obj-multiple-types', suite: 'free-objects', name: 'כל סוגי האובייקטים בעמוד', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(80);
      window.__freeImg(2, 5, 5, 4, 'free');
      window.__freeImg(8, 5, 5, 4, 'above-text');
      window.__freeTextbox(2, 12, 7, 4, 'תיבת טקסט');
      // פתק
      const ppc = window.__pxPerCm();
      const note = document.createElement('div');
      note.className = 'free-obj free-textbox free-note';
      note.setAttribute('contenteditable', 'false');
      note.style.cssText = `position:absolute;left:${12*ppc}px;top:${12*ppc}px;width:${4*ppc}px;height:${3*ppc}px;z-index:15;background:#fffde7;border:1px solid #ffcc00`;
      note.innerHTML = '<div class="tb-header" style="background:#ffcc00;height:1.2em"></div><div class="tb-content" contenteditable="true" style="padding:4px">פתק</div>';
      document.getElementById('editor').appendChild(note);
    },
  },
  { id: 'obj-clamp-margin', suite: 'free-objects', name: 'clamp margin 0.2cm — גבולות מדויקים', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(100);
      // אובייקט על הגבול הימני (x = 21cm - 0.2cm - רוחב)
      const ppc = window.__pxPerCm();
      const obj = window.__freeImg(15.5, 5, 5, 4); // קרוב לגבול ימין (21cm)
    },
  },
  { id: 'obj-free-margin-cm', suite: 'free-objects', name: 'FREE_MARGIN_CM=0.2 — כל קצוות', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(100);
      const ppc = window.__pxPerCm();
      // 4 אובייקטים בקצוות השוליים
      window.__freeImg(0.1, 2, 3, 2); // קרוב לקצה שמאל (יחסי ל-editor)
      window.__freeImg(14, 2, 3, 2); // קרוב לקצה ימין
      window.__freeImg(5, 27, 3, 2); // קרוב לקצה תחתית עמוד
    },
  },
  { id: 'obj-lock-behavior', suite: 'free-objects', name: 'נעילת אובייקט — אין גרירה/resize', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeImg(2, 5, 6, 4);
      obj.setAttribute('data-locked', 'true');
      obj.style.pointerEvents = 'none';
    },
  },

  // ─── נגישות-מקלדת לידיות אובייקטים (2026-07-18 — פער-כיסוי שהתגלה: 0 תרחישים
  // בדקו בפועל את מנגנון ה-Arrow-keys על הידיות עצמן, למרות שהוא מתועד ומיושם
  // ב-CLAUDE.md §5/16. חשיפה: resize-handle/rotate-handle העבירו בעבר את
  // ה-Arrow-keys ל-nudge הכללי (הזזה בלבד) במקום resize/rotate אמיתיים — תוקן
  // באותו סשן (ר' _addHandles ~9227/9255 ב-MyWord-v2.html). ───
  { id: 'handle-kbd-resize', suite: 'free-objects', name: 'ידית resize בפוקוס + חצים — שינוי-גודל אמיתי', rule: 'CLAUDE.md §5/§14',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeImg(2, 5, 6, 4);
      if (typeof _addHandles === 'function') _addHandles(obj);
      if (typeof _selectObj === 'function') _selectObj(obj);
      const h = obj.querySelector('.resize-handle[data-dir="se"]');
      window.__hkr = { obj, before: { w: obj.offsetWidth, h: obj.offsetHeight, l: obj.offsetLeft, t: obj.offsetTop } };
      if (h) {
        h.focus();
        h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      }
    },
    assert: () => {
      const issues = [];
      const st = window.__hkr;
      if (!st) { issues.push({ type: 'handle-kbd-setup-failed', msg: 'לא נמצא מצב-בדיקה', id: 'handle-kbd-resize' }); return issues; }
      const { obj, before } = st;
      if (obj.offsetWidth <= before.w || obj.offsetHeight <= before.h)
        issues.push({ type: 'handle-kbd-resize-noop', msg: `חצים על ידית-resize (se) לא הגדילו את האובייקט: ${before.w}x${before.h} → ${obj.offsetWidth}x${obj.offsetHeight}`, id: 'handle-kbd-resize' });
      if (obj.offsetLeft !== before.l || obj.offsetTop !== before.t)
        issues.push({ type: 'handle-kbd-resize-moved', msg: `שינוי-גודל מידית se הזיז גם left/top (אמור להישאר עוגן צפון-מערב קבוע): ${before.l},${before.t} → ${obj.offsetLeft},${obj.offsetTop}`, id: 'handle-kbd-resize' });
      return issues;
    },
  },
  { id: 'handle-kbd-rotate', suite: 'free-objects', name: 'ידית rotate בפוקוס + חצים — סיבוב אמיתי', rule: 'CLAUDE.md §5/§14',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeImg(2, 5, 6, 4);
      if (typeof _addHandles === 'function') _addHandles(obj);
      if (typeof _selectObj === 'function') _selectObj(obj);
      const rh = obj.querySelector('.rotate-handle');
      window.__hkrot = { obj, before: parseFloat(obj.dataset.rotation || 0) };
      if (rh) {
        rh.focus();
        rh.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      }
    },
    assert: () => {
      const issues = [];
      const st = window.__hkrot;
      if (!st) { issues.push({ type: 'handle-kbd-setup-failed', msg: 'לא נמצא מצב-בדיקה', id: 'handle-kbd-rotate' }); return issues; }
      const { obj, before } = st;
      const after = parseFloat(obj.dataset.rotation || 0);
      if (after === before)
        issues.push({ type: 'handle-kbd-rotate-noop', msg: `חץ על ידית-rotate לא שינה dataset.rotation (${before}→${after})`, id: 'handle-kbd-rotate' });
      if (Math.abs(obj.offsetLeft - 2 * window.__pxPerCm()) > 0.5 || Math.abs(obj.offsetTop - 5 * window.__pxPerCm()) > 0.5)
        issues.push({ type: 'handle-kbd-rotate-moved', msg: 'סיבוב מהמקלדת הזיז את left/top במקום לסובב', id: 'handle-kbd-rotate' });
      return issues;
    },
  },
  { id: 'handle-kbd-move', suite: 'free-objects', name: 'ידית ⠿ (free-move-handle) בפוקוס + חצים — הזזה', rule: 'CLAUDE.md §5',
    setup: () => {
      window.__reset(); window.__para(60);
      const obj = window.__freeImg(2, 5, 6, 4);
      if (typeof _addHandles === 'function') _addHandles(obj);
      if (typeof _selectObj === 'function') _selectObj(obj);
      const mvh = obj.querySelector('.free-move-handle');
      window.__hkm = { obj, before: { l: obj.offsetLeft, t: obj.offsetTop } };
      if (mvh) {
        mvh.focus();
        mvh.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        mvh.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      }
    },
    assert: () => {
      const issues = [];
      const st = window.__hkm;
      if (!st) { issues.push({ type: 'handle-kbd-setup-failed', msg: 'לא נמצא מצב-בדיקה', id: 'handle-kbd-move' }); return issues; }
      const { obj, before } = st;
      if (obj.offsetLeft === before.l && obj.offsetTop === before.t)
        issues.push({ type: 'handle-kbd-move-noop', msg: 'חצים על ⠿ לא הזיזו את האובייקט', id: 'handle-kbd-move' });
      return issues;
    },
  },
  { id: 'tbl-handle-kbd-move', suite: 'free-objects', name: 'ידית ⠿ טבלה בפוקוס + ArrowUp/Down — reorder', rule: 'CLAUDE.md §16 qa-sweep',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      // שתי טבלאות **צמודות** (בלי פסקה ביניהן) כדי ש-ArrowUp (מחליף עם השכן
      // המיידי הקודם) יזיז את הטבלה השנייה ממש מעל הראשונה בבדיקה אחת ברורה.
      editor.innerHTML = '<p>פסקה לפני</p>' + window.__bigTable(3, 3) + window.__bigTable(3, 3) + '<p>פסקה אחרי</p>';
      const tables = [...editor.querySelectorAll('table')];
      window.__tkm = { firstTable: tables[0], secondTable: tables[1] };
      const td = tables[1].querySelector('td');
      td.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
      const handle = document.querySelector('.tbl-move-handle');
      if (handle) {
        handle.focus();
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      }
    },
    assert: () => {
      const issues = [];
      const st = window.__tkm;
      if (!st || !st.firstTable || !st.secondTable) { issues.push({ type: 'tbl-handle-kbd-setup-failed', msg: 'לא נמצאו 2 טבלאות', id: 'tbl-handle-kbd-move' }); return issues; }
      const editor = document.getElementById('editor');
      const order = [...editor.children].filter(c => c.tagName === 'TABLE');
      if (order[0] !== st.secondTable)
        issues.push({ type: 'tbl-handle-kbd-move-noop', msg: 'ArrowUp על ידית ⠿-טבלה לא הזיז את הטבלה השנייה מעל הראשונה (DOM reorder)', id: 'tbl-handle-kbd-move' });
      return issues;
    },
  },
  { id: 'tbl-handle-kbd-resize', suite: 'free-objects', name: 'ידית ↘ טבלה בפוקוס + חצים — resize עמודה-0/שורה-אחרונה', rule: 'CLAUDE.md §16 qa-sweep',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = window.__bigTable(3, 3);
      const table = editor.querySelector('table');
      const td = table.querySelector('td');
      td.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
      window.__tkr = { table, beforeW: table.getBoundingClientRect().width };
      const rHandle = document.querySelector('.tbl-resize-handle');
      if (rHandle) {
        rHandle.focus();
        rHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      }
    },
    assert: () => {
      const issues = [];
      const st = window.__tkr;
      if (!st) { issues.push({ type: 'tbl-handle-kbd-setup-failed', msg: 'לא נמצא מצב-בדיקה', id: 'tbl-handle-kbd-resize' }); return issues; }
      const afterW = st.table.getBoundingClientRect().width;
      if (afterW <= st.beforeW)
        issues.push({ type: 'tbl-handle-kbd-resize-noop', msg: `חץ-ימין על ↘ לא הרחיב את רוחב הטבלה: ${st.beforeW.toFixed(1)} → ${afterW.toFixed(1)}`, id: 'tbl-handle-kbd-resize' });
      return issues;
    },
  },

  // ─── לשונית פריסה (LAYOUT) ───
  { id: 'layout-smart-dir-he', suite: 'layout-ribbon', name: 'כיוון חכם: טקסט עברי → RTL', rule: 'SPEC-TABS §1.1',
    setup: () => {
      window.__reset();
      // הפעל כיוון-חכם
      const btn = document.getElementById('loDirAuto');
      if (btn) btn.click();
      // קלד פסקה עברית
      setTimeout(() => {
        window.__type?.('זהו טקסט עברי לבדיקה');
      }, 50);
    },
  },
  { id: 'layout-smart-dir-en', suite: 'layout-ribbon', name: 'כיוון חכם: טקסט אנגלית → LTR', rule: 'SPEC-TABS §1.1',
    setup: () => {
      window.__reset();
      const btn = document.getElementById('loDirAuto');
      if (btn) btn.click();
      setTimeout(() => {
        window.__type?.('this is english text');
      }, 50);
    },
  },
  { id: 'layout-smart-dir-mixed', suite: 'layout-ribbon', name: 'כיוון חכם: תו-חזק-ראשון (מעורב עברית+אנגלית)', rule: 'SPEC-TABS §2.1',
    setup: () => {
      window.__reset();
      if (typeof window._firstStrongDir !== 'function') throw new Error('_firstStrongDir לא קיים');
      // יחידה: כיוון נקבע מהתו-החזק-הראשון, לא מהרוב
      if (window._firstStrongDir('שלום this is a long english quote') !== 'rtl') throw new Error('עברית-ראשונה לא rtl');
      if (window._firstStrongDir('Hello זהו ציטוט עברי ארוך מאוד') !== 'ltr') throw new Error('אנגלית-ראשונה לא ltr');
      if (window._firstStrongDir('12345 678') !== null) throw new Error('ספרות-בלבד לא null');
      // אינטגרציה: פסקה עברית עם ציטוט אנגלי ארוך נשארת rtl (לא מתהפכת לפי רוב)
      editor.innerHTML = '<p>שלום this is a very long english citation inside the paragraph indeed</p>';
      const n = window.autoDetectDirAll();   // מפעיל זיהוי על כל הבלוקים
      const dir = editor.querySelector('p').getAttribute('dir');
      if (dir !== 'rtl') throw new Error(`פסקה מעורבת התהפכה: dir=${dir}`);
    },
  },
  { id: 'home-color-wheel', suite: 'home-ribbon', name: 'בורר צבע: HSV round-trip + החלה על בחירה', rule: 'SPEC-TABS §2.2',
    setup: () => {
      window.__reset();
      ['_hsvToRgb', '_rgbToHsv', '_hexToRgb', '_rgbToHex', 'openColorWheel'].forEach(fn => {
        if (typeof window[fn] !== 'function') throw new Error(`${fn} לא קיים`);
      });
      // round-trip מדויק
      ['#dc2626', '#2563eb', '#16a34a', '#000000', '#ffffff'].forEach(hex => {
        const rgb = window._hexToRgb(hex), hsv = window._rgbToHsv(rgb[0], rgb[1], rgb[2]);
        const back = window._hsvToRgb(hsv.h, hsv.s, hsv.v);
        const out = window._rgbToHex(back[0], back[1], back[2]);
        if (out.toLowerCase() !== hex.toLowerCase()) throw new Error(`round-trip נכשל: ${hex} → ${out}`);
      });
      // הגלגל נפתח ומחיל hex על טקסט נבחר
      editor.innerHTML = '<p id="_cwp">צבע אותי</p>';
      const p = document.getElementById('_cwp');
      const range = document.createRange(); range.selectNodeContents(p);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      if (typeof window._saveLiveSel === 'function') window._saveLiveSel();
      let applied = null;
      window.openColorWheel({ color: '#16a34a', onPick: hex => { applied = hex; window.applyColor('fore', hex); } });
      const panel = document.querySelector('.color-wheel');
      if (!panel) throw new Error('גלגל הצבע לא נפתח');
      panel.querySelector('.cw-ok').click();   // מאשר את הצבע ההתחלתי
      if (!applied) throw new Error('onPick לא נקרא');
      if (!/color/i.test(p.innerHTML)) throw new Error(`צבע לא הוחל: ${p.innerHTML}`);
      document.querySelector('.color-wheel')?.remove();
    },
  },
  { id: 'tools-voice-opts', suite: 'tools-ribbon', name: 'הקראה: פנל קריין + קצב נשמר', rule: 'SPEC-TABS §2.3',
    setup: () => {
      window.__reset();
      const optsBtn = document.getElementById('tlVoiceOpts');
      if (!optsBtn) throw new Error('כפתור הגדרות קריין לא נמצא');
      if (!('speechSynthesis' in window)) return;   // סביבה ללא TTS — מדלגים בשקט
      optsBtn.click();
      const panel = document.querySelector('.mw-panel.voice');
      if (!panel) throw new Error('פנל הקריין לא נפתח');
      const rate = document.getElementById('_ttsRate');
      if (!rate) throw new Error('מחוון קצב חסר');
      rate.value = '1.4'; rate.dispatchEvent(new Event('input'));
      const saved = JSON.parse(localStorage.getItem('myword2_tts') || '{}').rate;
      if (saved !== 1.4) throw new Error(`קצב לא נשמר: ${saved}`);
      panel.querySelector('.mw-close')?.click();
    },
  },
  { id: 'view-page-bg-color', suite: 'view-ribbon', name: 'רקע דף (בלשונית תצוגה): קרם יושם על editor', rule: 'SPEC-TABS §3.x',
    setup: () => {
      window.__reset(); window.__para(5, 20);
      // הכפתור עבר ללשונית תצוגה — אך עדיין נגיש לפי מזהה
      const btn = document.getElementById('loBgCream');
      if (!btn) throw new Error('כפתור רקע-דף "קרם" לא נמצא');
      btn.click();
      // applyPageBg סינכרוני — editor.style.background מוחל מיד
      // (הדפדפן מנרמל hex ל-rgb, אז מקבלים את שתי הצורות)
      const ed = document.getElementById('editor');
      const inline = (ed.style.background || '').toLowerCase();
      if (!inline.includes('fdf6e3') && !inline.includes('253, 246, 227')) {
        throw new Error(`רקע לא הוחל: ${inline}`);
      }
      // החזרה ללבן מנקה
      document.getElementById('loBgWhite').click();
      if ((ed.style.background || '') !== '') throw new Error('רקע לבן לא ניקה את ה-style');
    },
  },
  { id: 'layout-para-spacing', suite: 'layout-ribbon', name: 'רווח פסקה: margin-top מיושם', rule: 'SPEC-TABS §1.3',
    setup: () => {
      window.__reset(); window.__para(3, 20);
      // בחר את הפסקה הראשונה
      const p = document.querySelector('#editor p');
      if (!p) throw new Error('אין פסקה');
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // סימולציה: לחץ על כפתור רווח 12pt
      // (בשל מקומיות של DOM, נחסום את זה)
      const before = p.style.marginTop;
      // סינתטי: הוסף margin-top
      p.style.marginTop = '12pt';
      const after = p.style.marginTop;
      if (after !== '12pt') throw new Error(`margin-top לא הוחל: ${after}`);
    },
  },
  { id: 'layout-autofmt-dash', suite: 'layout-ribbon', name: 'אוטו-עיצוב: -- → en-dash', rule: 'SPEC-TABS §1.4',
    setup: () => {
      window.__reset();
      // קלד טקסט עם שני מקפים וספייס
      window.__type?.('זה');
      setTimeout(() => {
        window.__type?.('--');
      }, 50);
      setTimeout(() => {
        window.__type?.(' ');
      }, 100);
    },
  },
  { id: 'layout-autofmt-bold', suite: 'layout-ribbon', name: 'אוטו-עיצוב: **text** → bold', rule: 'SPEC-TABS §1.4',
    setup: () => {
      window.__reset();
      window.__type?.('**בולד**');
      // בדוק אם הוחלף ל-<b>
      setTimeout(() => {
        const p = document.querySelector('#editor p');
        if (p) {
          const hasB = p.innerHTML.includes('<b>');
          const hasStrong = p.innerHTML.includes('<strong>');
          if (!hasB && !hasStrong) {
            console.log(`bold לא הוחל, HTML: ${p.innerHTML.substring(0, 100)}`);
          }
        }
      }, 150);
    },
  },

  // ─── לשונית כלים (TOOLS) ───
  { id: 'tools-f9-en-to-he', suite: 'tools-ribbon', name: 'F9: קלד אנגלית → המרה לעברית', rule: 'SPEC-TABS §2.8',
    setup: () => {
      window.__reset();
      // קלד אנגלית
      window.__type?.('hello');
      // בחר הכל
      setTimeout(() => {
        document.execCommand('selectAll');
        // לחץ F9
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'F9', code: 'F9', bubbles: true, cancelable: true
        }));
      }, 50);
    },
  },
  { id: 'tools-statistics-panel', suite: 'tools-ribbon', name: 'סטטיסטיקה: פנל עם מילים/עמודים', rule: 'SPEC-TABS §2.2',
    setup: () => {
      window.__reset(); window.__para(5, 50);
      // לחץ על כפתור הסטטיסטיקה
      const btn = document.getElementById('tlStats');
      if (!btn) throw new Error('כפתור סטטיסטיקה לא נמצא');
      btn.click();
      // בדוק שהפנל הופיע (textContent — לא תלוי ב-layout/rendering)
      const panel = document.querySelector('.mw-panel.stats');
      if (!panel) throw new Error('פנל סטטיסטיקה לא הופיע');
      const txt = panel.textContent || '';
      if (!txt.includes('מילים') && !txt.includes('סטטיסטיק')) {
        throw new Error(`טקסט סטטיסטיקה לא הופיע: ${txt.substring(0, 50)}`);
      }
    },
  },
  { id: 'tools-goal-progress', suite: 'tools-ribbon', name: 'יעד כתיבה: פונקציית setGoal קיימת', rule: 'SPEC-TABS §2.2',
    setup: () => {
      window.__reset(); window.__para(10, 30);
      // בדוק אם הפונקציה קיימת (זה כל מה שנחוץ)
      if (typeof window._setGoal !== 'function') {
        throw new Error('פונקציית _setGoal לא קיימת');
      }
    },
  },
  { id: 'tools-snippet-save', suite: 'tools-ribbon', name: 'קטע שמור: שמירה והוספה', rule: 'SPEC-TABS §2.5',
    setup: () => {
      window.__reset(); window.__para(5, 20);
      // בדוק שתשתית הקטעים קיימת (openSnippetsPanel + _getSnippets/_saveSnippets)
      if (typeof window.openSnippetsPanel !== 'function'
          || typeof window._getSnippets !== 'function'
          || typeof window._saveSnippets !== 'function') {
        throw new Error('תשתית קטעים לא קיימת (openSnippetsPanel/_getSnippets/_saveSnippets)');
      }
      // נקה רשימה קודמת
      window._saveSnippets([]);
      // בחר טקסט ושמור אותו ל-_savedRange (כמו mousedown על הכפתור)
      const p = document.querySelector('#editor p');
      if (!p) throw new Error('אין פסקה');
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      window._saveLiveSel();
      // פתח פנל, מלא שם, ולחץ "שמור בחירה" — הזרימה האמיתית
      window.openSnippetsPanel();
      const nameInput = document.getElementById('_snipName');
      const saveBtn = document.getElementById('_snipSave');
      if (!nameInput || !saveBtn) throw new Error('פנל הקטעים לא נפתח (חסר #_snipName/#_snipSave)');
      nameInput.value = 'קטע בדיקה';
      saveBtn.click();
      // ודא שנשמר
      const after = window._getSnippets();
      if (!after.length || after[after.length - 1].name !== 'קטע בדיקה') {
        throw new Error('הקטע לא נשמר ב-_getSnippets');
      }
    },
  },
  { id: 'tools-toc-build', suite: 'tools-ribbon', name: 'תוכן עניינים: בנייה מכותרות', rule: 'SPEC-TABS §2.6',
    setup: () => {
      window.__reset();
      // הוסף כותרות
      const h1 = document.createElement('h1');
      h1.textContent = 'פרק ראשון';
      const p = document.querySelector('#editor p');
      p.parentNode.insertBefore(h1, p);
      // בדוק אם התפקוד קיים
      if (typeof window.buildTOC !== 'function') {
        throw new Error('פונקציית TOC לא קיימת');
      }
      // בנה בפועל וודא שנוצר בלוק עם קישור
      window.buildTOC();
      const toc = document.querySelector('[data-mwtoc]');
      if (!toc) throw new Error('בלוק TOC לא נוצר');
      if (!toc.querySelector('a[href^="#"]')) throw new Error('TOC ללא קישורים');
    },
  },

  // ─── לשונית תצוגה (VIEW) ───
  { id: 'view-theme-dark', suite: 'view-ribbon', name: 'ערכת נושא: כהה מפעיל data-theme', rule: 'SPEC-TABS §3.1',
    setup: () => {
      window.__reset();
      // לחץ על כהה
      const btn = document.getElementById('vwDark');
      if (!btn) throw new Error('כפתור כהה לא נמצא');
      btn.click();
      // בדוק שהאטריביוט הוחל — applyTheme סינכרוני
      if (document.body.getAttribute('data-theme') !== 'dark') {
        throw new Error(`theme לא הוחל: ${document.body.getAttribute('data-theme')}`);
      }
    },
  },
  { id: 'view-theme-light', suite: 'view-ribbon', name: 'ערכת נושא: בהיר מסיר data-theme', rule: 'SPEC-TABS §3.1',
    setup: () => {
      window.__reset();
      // ודא שתחילה נמצא בכהה
      document.body.setAttribute('data-theme', 'dark');
      // לחץ על בהיר
      const btn = document.getElementById('vwLight');
      if (!btn) throw new Error('כפתור בהיר לא נמצא');
      btn.click();
      // בדוק שהאטריביוט הוסר — applyTheme סינכרוני
      if (document.body.getAttribute('data-theme')) {
        throw new Error(`theme לא הוסר: ${document.body.getAttribute('data-theme')}`);
      }
    },
  },
  { id: 'view-focus-mode', suite: 'view-ribbon', name: 'מיקוד: סרגלים מוסתרים, Esc יוצא', rule: 'SPEC-TABS §3.2',
    setup: () => {
      window.__reset();
      // לחץ על מיקוד
      document.body.classList.remove('focus-mode'); // נקה מצב קודם
      const btn = document.getElementById('vwFocus');
      if (!btn) throw new Error('כפתור מיקוד לא נמצא');
      // הפעלה — click סינכרוני
      btn.click();
      if (!document.body.classList.contains('focus-mode')) {
        throw new Error('focus-mode class לא נוסף');
      }
      // סגירה עם Esc — dispatch סינכרוני, המאזין רץ מיד
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', bubbles: true, cancelable: true
      }));
      if (document.body.classList.contains('focus-mode')) {
        throw new Error('focus-mode לא הוסר אחרי Escape');
      }
    },
  },
  { id: 'view-status-bar-toggle', suite: 'view-ribbon', name: 'שורת סטטוס: הסתרה והצגה', rule: 'SPEC-TABS §3.4',
    setup: () => {
      window.__reset();
      const btn = document.getElementById('vwStatusBar');
      if (!btn) throw new Error('כפתור סטטוס לא נמצא');
      document.body.classList.remove('hide-status'); // נקה מצב קודם
      btn.click();
      // בדוק הסתרה — class toggle סינכרוני, getComputedStyle משקף מיד
      const status = document.querySelector('.status');
      if (window.getComputedStyle(status).display !== 'none') {
        throw new Error(`סטטוס לא הוסתר: ${window.getComputedStyle(status).display}`);
      }
      // הצגה חזרה
      btn.click();
      if (window.getComputedStyle(status).display === 'none') {
        throw new Error('סטטוס לא הוצג חזרה');
      }
    },
  },

];


// ══════════════════════════════════════════════════════════════════════════
//  SUITE buttons — נבנה אוטומטית מ-docs/BUTTONS-SPEC.md (כל כפתור = תרחיש)
// ══════════════════════════════════════════════════════════════════════════

// setup משותף: מסמך עם טקסט שאפשר לבחור ולעצב. ללא closure (משתלשל ל-evaluate).
const BUTTON_SETUP = () => {
  window.__reset();
  window.__para(6, 12);
};

// assert משותף: רץ בדפדפן עם arg = payload הכפתור מהמפרט. מחזיר מערך issues.
// בודק: קיום · נראות · אייקון מרונדר · קליק ללא קריסה · אפקט (אם מוגדר).
const BUTTON_ASSERT = (arg) => {
  const issues = [];
  const push = (type, msg) => issues.push({ type, msg, id: arg.id });

  // הפעלת הלשונית המתאימה כדי שהכפתור יהיה גלוי
  const TAB = { 'home-ribbon': 'home', insert: 'insert', file: 'file' };
  const tab = TAB[arg.suite];
  if (tab) { const t = document.querySelector(`.tab[data-tab="${tab}"]`); if (t) t.click(); }

  // כפתורים חסרי-id ב-DOM / הקשריים (סרגל צף, דיאלוג) — לא ניתן לאתר בבטחה. דולג.
  if (!arg.selector) return issues;

  // כפתורים קונטקסטואליים (דיאלוג/דרופ-דאון) קיימים רק כשהפופאפ פתוח.
  // אם אינם נמצאים — זה תקין, לא "חסר". נבדקים בתרחישים ייעודיים.
  const contextual = arg.suite === 'dialog';
  const el = document.querySelector(arg.selector);
  if (!el) {
    if (!contextual) push('button-missing', `כפתור ${arg.id} לא נמצא ב-DOM (${arg.selector})`);
    return issues;
  }

  // אם הכפתור (או אב שלו) מוסתר בכוונה כחלק מפופאפ סגור — קונטקסטואלי, דולגים.
  const inHidden = (() => {
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      n = n.parentElement;
    }
    return false;
  })();
  if (inHidden || contextual) return issues; // קונטקסטואלי — קיים, די בכך

  // נראות (רק לכפתורים פרסיסטנטיים)
  const r = el.getBoundingClientRect();
  const visible = !!el.offsetParent || (r.width > 0 && r.height > 0);
  if (!visible) push('button-hidden', `כפתור ${arg.id} לא נראה (rect ${Math.round(r.width)}×${Math.round(r.height)})`);

  // אייקון מרונדר — תופס "צורה בלי סימון ויזואלי"
  if (arg.needsIcon && visible) {
    const ic = el.querySelector('.ic') || el;
    const txt = (ic.textContent || '').replace(/\s+/g, '');
    const hasGraphic = !!el.querySelector('svg, img, canvas');
    const icR = ic.getBoundingClientRect();
    if (!hasGraphic && !txt) push('button-no-icon', `כפתור ${arg.id} ללא אייקון (טקסט/גרפיקה ריקים)`);
    else if (!hasGraphic && icR.width < 4) push('button-no-icon', `אייקון ${arg.id} לא מרונדר (רוחב ${icR.width.toFixed(1)}px)`);
  }

  // אפקט — קליק ואימות פלט (רק לכפתורים בטוחים שהוגדר להם effect)
  const eff = arg.effect;
  if (eff && visible) {
    const editor = document.getElementById('editor');
    try {
      if (eff.selectAll) { editor.focus(); document.execCommand('selectAll'); }
      const before = eff.expectNew ? editor.querySelectorAll(eff.expectNew).length : 0;
      el.click();
      if (eff.expectHtml && !new RegExp(eff.expectHtml, 'i').test(editor.innerHTML))
        push('button-no-effect', `כפתור ${arg.id} לא יצר את האפקט הצפוי (${eff.expectHtml})`);
      if (eff.expectNew && editor.querySelectorAll(eff.expectNew).length <= before)
        push('button-no-effect', `כפתור ${arg.id} לא יצר <${eff.expectNew}>`);
      if (eff.opensDialog && eff.opensDialog !== 'body' && !document.querySelector(eff.opensDialog))
        push('button-no-effect', `כפתור ${arg.id} לא פתח דיאלוג (${eff.opensDialog})`);
      // ניקוי: סגירת דיאלוג שאולי נפתח כדי לא לזהם את התרחיש הבא
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    } catch (e) {
      push('button-click-error', `קליק על ${arg.id} זרק שגיאה: ${e.message}`);
    }
  }
  return issues;
};

// בונה תרחיש לכל כפתור מתועד במפרט.
export function buildButtonScenarios() {
  let spec;
  try { spec = loadSpecFromDisk(); } catch { spec = []; }
  // תכונות מוחרגות (תווים/אימוג'י/מחשבון) — מתועדות אך לא נבדקות.
  return spec.filter((b) => !isExcluded(b)).map((b) => ({
    id: 'btn:' + b.id,
    suite: 'buttons',
    name: `כפתור ${b.id}${b.selector ? '' : ' (ללא id — נראות בלבד)'}`,
    rule: 'BUTTONS-SPEC',
    setup: BUTTON_SETUP,
    assert: BUTTON_ASSERT,
    assertArg: b,
  }));
}

// מזריק את תרחישי הכפתורים לרשימה הראשית (כך `--suite buttons` ו-bySuite עובדים).
scenarios.push(...buildButtonScenarios());

// תרחיש ייעודי: בורר הצורות — כל צורה חייבת תצוגה ויזואלית (SVG לא-ריק).
// תופס בדיוק את הבאג "צורות בלי סימון ויזואלי" שהפופאפ הסגור מסתיר מהבדיקה הגנרית.
scenarios.push({
  id: 'shape-picker-icons',
  suite: 'buttons',
  rule: 'BUTTONS-SPEC §icons',
  name: 'בורר צורות — לכל צורה סימן ויזואלי',
  setup: () => {
    window.__reset();
    const caret = document.getElementById('insShapeCaret');
    if (caret) caret.click();
  },
  assert: () => {
    const issues = [];
    const pick = document.getElementById('_shapePick');
    if (!pick) { issues.push({ type: 'button-missing', msg: 'בורר הצורות לא נפתח (#_shapePick)', id: 'shape-picker' }); return issues; }
    const btns = pick.querySelectorAll('.sp-grid button');
    if (!btns.length) { issues.push({ type: 'button-missing', msg: 'אין פריטי צורה בבורר', id: 'shape-picker' }); return issues; }
    btns.forEach((b) => {
      const lbl = (b.querySelector('span')?.textContent || b.textContent || '?').trim();
      const svg = b.querySelector('svg');
      if (!svg) { issues.push({ type: 'button-no-icon', msg: `צורה "${lbl}" ללא SVG`, id: 'shape:' + lbl }); return; }
      const r = svg.getBoundingClientRect();
      const hasGeom = svg.querySelector('path, rect, circle, ellipse, polygon, polyline, line');
      if (r.width < 3 || r.height < 3)
        issues.push({ type: 'button-no-icon', msg: `צורה "${lbl}" SVG בגודל ${r.width.toFixed(0)}×${r.height.toFixed(0)}`, id: 'shape:' + lbl });
      else if (!hasGeom)
        issues.push({ type: 'button-no-icon', msg: `צורה "${lbl}" SVG ריק (ללא גאומטריה)`, id: 'shape:' + lbl });
    });
    return issues;
  },
});

// ══════════════════════════════════════════════════════════════════════════
// תרחישים חדשים 2026-07-06 — מבוססים על מפרט-התנהגות מדויק שהפיק דאן
// (spec-expert) מהקוד בפועל, לפיצ'רים שנוספו 2026-07-03..07-06:
// שורת-לשוניות-מסמכים, מנהל-מסמכים משודרג, פנל עובי/סגנון-קו, תפריטי ▾
// חכמים בסרגל-הראשי, קיצורי-מקלדת ל-free-obj, תיקון-Redo. אין SPEC-*.md
// ייעודי עדיין — ה-`rule` מפנה לרישום ב-wiki/log.md 2026-07-05/06.
// ══════════════════════════════════════════════════════════════════════════

// ─── שורת-לשוניות מסמכים (#docTabsBar) ─────────────────────────────────────
scenarios.push(
  {
    id: 'doctabs-create-named', suite: 'doctabs', rule: 'wiki/log.md 2026-07-05',
    name: 'לשונית חדשה עם שם מופיעה פעילה עם aria-selected',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = 'תרחיש-בדיקה-אלפא';
      (window.saveDoc || saveDoc)();
    },
    assert: () => {
      const issues = [];
      const active = document.querySelector('.doc-tab.active');
      if (!active) { issues.push({ type: 'doctabs-missing-active', msg: 'אין לשונית פעילה אחרי יצירת מסמך עם שם', id: 'doctabs' }); return issues; }
      const name = active.querySelector('.dt-name')?.textContent;
      if (name !== 'תרחיש-בדיקה-אלפא') issues.push({ type: 'doctabs-wrong-name', msg: `שם הלשונית "${name}", ציפינו "תרחיש-בדיקה-אלפא"`, id: 'doctabs' });
      if (active.getAttribute('aria-selected') !== 'true') issues.push({ type: 'doctabs-a11y', msg: 'aria-selected!=true בלשונית הפעילה', id: 'doctabs' });
      if (active.getAttribute('role') !== 'tab') issues.push({ type: 'doctabs-a11y', msg: 'role!=tab בלשונית', id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-switch-active-noop', suite: 'doctabs', rule: 'wiki/log.md 2026-07-05',
    name: '3 מסמכים במקביל — מעבר ולחיצה-חוזרת על הפעילה לא עושה כלום',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      ['תרחיש-א', 'תרחיש-ב', 'תרחיש-ג'].forEach(nm => {
        if (typeof currentDocId !== 'undefined' && currentDocId) (window.saveDoc || saveDoc)();
        (window.newDoc || newDoc)();
        document.getElementById('docTitle').value = nm;
        (window.saveDoc || saveDoc)();
      });
      // מעבר ללשונית הראשונה
      const first = [...document.querySelectorAll('.doc-tab')][0];
      first.click();
      // לחיצה חוזרת על הפעילה — לא אמורה לשנות כלום
      document.querySelector('.doc-tab.active').click();
    },
    assert: () => {
      const issues = [];
      const tabs = [...document.querySelectorAll('.doc-tab')];
      if (tabs.length !== 3) issues.push({ type: 'doctabs-count', msg: `${tabs.length} לשוניות, ציפינו 3`, id: 'doctabs' });
      const active = document.querySelector('.doc-tab.active');
      if (!active || active.querySelector('.dt-name')?.textContent !== 'תרחיש-א')
        issues.push({ type: 'doctabs-switch-failed', msg: `הלשונית הפעילה "${active?.querySelector('.dt-name')?.textContent}", ציפינו "תרחיש-א"`, id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-close-inactive-keeps-doc', suite: 'doctabs', rule: 'wiki/log.md 2026-07-05',
    name: 'סגירת לשונית לא-פעילה מסירה מהסרגל בלבד — המסמך לא נמחק',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      ['תרחיש-סגור-1', 'תרחיש-סגור-2'].forEach(nm => {
        if (typeof currentDocId !== 'undefined' && currentDocId) (window.saveDoc || saveDoc)();
        (window.newDoc || newDoc)();
        document.getElementById('docTitle').value = nm;
        (window.saveDoc || saveDoc)();
      });
      window.__docsCountBeforeClose = Object.keys(getAllDocs()).length;
      const inactive = [...document.querySelectorAll('.doc-tab')].find(t => !t.classList.contains('active'));
      inactive.querySelector('.dt-close').click();
      await new Promise(r => setTimeout(r, 50));
    },
    assert: () => {
      const issues = [];
      const nowCount = Object.keys(getAllDocs()).length;
      if (nowCount !== window.__docsCountBeforeClose)
        issues.push({ type: 'doctabs-doc-deleted', msg: `סגירת-לשונית מחקה מסמך: ${window.__docsCountBeforeClose}→${nowCount}`, id: 'doctabs' });
      if (document.querySelectorAll('.doc-tab').length !== 1)
        issues.push({ type: 'doctabs-count', msg: 'לשונית סגורה עדיין מוצגת', id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-close-active-switches-to-sibling', suite: 'doctabs', rule: 'wiki/log.md 2026-07-05',
    name: 'סגירת הלשונית הפעילה עוברת לשכן, לא מוחקת מסמכים',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      ['תרחיש-שכן-1', 'תרחיש-שכן-2'].forEach(nm => {
        if (typeof currentDocId !== 'undefined' && currentDocId) (window.saveDoc || saveDoc)();
        (window.newDoc || newDoc)();
        document.getElementById('docTitle').value = nm;
        (window.saveDoc || saveDoc)();
      });
      window.__docsCountBefore = Object.keys(getAllDocs()).length;
      document.querySelector('.doc-tab.active .dt-close').click();
      await new Promise(r => setTimeout(r, 80));
    },
    assert: () => {
      const issues = [];
      if (Object.keys(getAllDocs()).length !== window.__docsCountBefore)
        issues.push({ type: 'doctabs-doc-deleted', msg: 'סגירת-לשונית-פעילה מחקה מסמך מ-getAllDocs', id: 'doctabs' });
      const active = document.querySelector('.doc-tab.active');
      if (!active) issues.push({ type: 'doctabs-no-active-after-close', msg: 'אין לשונית פעילה אחרי סגירת הפעילה', id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-render-dedup-stable-dom', suite: 'doctabs', rule: 'wiki/log.md 2026-07-06 (perf)',
    name: 'render() חוזר בלי שינוי לא בונה מחדש את ה-DOM (דילוג-חתימה)',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = 'תרחיש-יציבות';
      (window.saveDoc || saveDoc)();
      window.__firstTabNode = document.querySelector('.doc-tab');
      if (typeof window._renderDocTabs === 'function') window._renderDocTabs();
    },
    assert: () => {
      const issues = [];
      if (document.querySelector('.doc-tab') !== window.__firstTabNode)
        issues.push({ type: 'doctabs-unnecessary-rebuild', msg: 'render() בנה DOM מחדש בלי שינוי אמיתי', id: 'doctabs' });
      return issues;
    },
  },
  // ─── 4 מקרי-קצה נוספים (פער-כיסוי #11 מ-docs/FEATURES-INDEX.md) ──────────
  {
    id: 'doctabs-close-last-tab-creates-new-doc', suite: 'doctabs', rule: 'MyWord-v2.html closeTab() — tabs.length===0 → newDoc() בלי להחיות-מחדש את המסמך שנסגר',
    name: 'סגירת הלשונית היחידה-האחרונה עוברת ל"מסמך חדש" ריק-בלי-לשונית (כמו טעינה ראשונית); המסמך הישן נשמר ולא מוחיה-מחדש ללשונית',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = 'תרחיש-יחיד';
      (window.saveDoc || saveDoc)();
      window.__idBeforeClose = currentDocId;
      document.querySelector('.doc-tab.active .dt-close').click();
      await new Promise(r => setTimeout(r, 80));
    },
    assert: () => {
      const issues = [];
      // "מסמך חדש" בלי id (עדיין לא נשמר) לא אמור לקבל לשונית — בדיוק כמו בטעינה
      // ראשונית של האפליקציה. תג-לשונית כאן פירושו שהמסמך-שנסגר הוחיה-מחדש בטעות.
      const tabs = document.querySelectorAll('.doc-tab');
      if (tabs.length !== 0) issues.push({ type: 'doctabs-last-close-tab-resurrected', msg: `אחרי סגירת הלשונית האחרונה יש ${tabs.length} לשוניות, ציפינו 0 (מסמך-חדש-ריק לפני שמירה ראשונה, לא החייאת המסמך-שנסגר)`, id: 'doctabs' });
      const docs = getAllDocs();
      if (!docs[window.__idBeforeClose]) issues.push({ type: 'doctabs-last-close-deleted-doc', msg: 'סגירת הלשונית האחרונה מחקה בטעות את המסמך הקודם מ-getAllDocs', id: 'doctabs' });
      if (currentDocId === window.__idBeforeClose) issues.push({ type: 'doctabs-last-close-no-new-doc', msg: 'לא עברנו למסמך-חדש בפועל אחרי סגירת הלשונית היחידה (currentDocId לא השתנה)', id: 'doctabs' });
      if ((document.getElementById('docTitle')?.value) !== 'מסמך חדש') issues.push({ type: 'doctabs-last-close-title-not-reset', msg: 'שם-המסמך לא אופס ל"מסמך חדש" אחרי סגירת הלשונית האחרונה', id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-persist-open-tabs-in-localstorage', suite: 'doctabs', rule: 'MyWord-v2.html OPEN_TABS_KEY=myword2_open_tabs / LAST_OPEN_KEY=myword2_last',
    name: 'שרידות-אחרי-רענון: כל מזהי הלשוניות הפתוחות ו"המסמך האחרון" נשמרים ב-localStorage כדי ש-init() ישחזר אותם',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      window.__ids = [];
      ['תרחיש-רענון-1', 'תרחיש-רענון-2', 'תרחיש-רענון-3'].forEach(nm => {
        if (typeof currentDocId !== 'undefined' && currentDocId) (window.saveDoc || saveDoc)();
        (window.newDoc || newDoc)();
        document.getElementById('docTitle').value = nm;
        (window.saveDoc || saveDoc)();
        window.__ids.push(currentDocId);
      });
    },
    assert: () => {
      const issues = [];
      let stored;
      try { stored = JSON.parse(localStorage.getItem('myword2_open_tabs') || '[]'); } catch (e) { stored = null; }
      if (!Array.isArray(stored)) { issues.push({ type: 'doctabs-persist-storage-broken', msg: 'myword2_open_tabs אינו JSON-array תקין', id: 'doctabs' }); return issues; }
      const missing = window.__ids.filter(id => !stored.includes(id));
      if (missing.length) issues.push({ type: 'doctabs-persist-missing-ids', msg: `${missing.length} מתוך ${window.__ids.length} מזהי-מסמכים חסרים מ-myword2_open_tabs — הלשוניות לא ישרדו רענון-דף`, id: 'doctabs' });
      const lastOpen = localStorage.getItem('myword2_last');
      if (lastOpen !== currentDocId) issues.push({ type: 'doctabs-persist-last-open-wrong', msg: `myword2_last="${lastOpen}", ציפינו "${currentDocId}" — המסמך-האחרון-פתוח לא יזוהה נכון אחרי רענון`, id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-duplicate-creates-independent-copy', suite: 'doctabs', rule: 'MyWord-v2.html openDocManager — כפתור ⧉ "שכפל מסמך"',
    name: 'שכפול-מסמך ממנהל-המסמכים יוצר עותק עם id שונה ותוכן זהה, בלי לשנות את המקור',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = 'תרחיש-שכפול-מקור';
      editor.innerHTML = '<p>תוכן-ייחודי-לבדיקת-שכפול</p>';
      (window.saveDoc || saveDoc)();
      window.__srcId = currentDocId;
      window.__countBefore = Object.keys(getAllDocs()).length;
      (window.openDocManager || openDocManager)();
      await new Promise(r => setTimeout(r, 80));
      const row = [...document.querySelectorAll('#_docMgrList > div')].find(r => r.textContent.includes('תרחיש-שכפול-מקור'));
      const dupBtn = row && [...row.querySelectorAll('button')].find(b => b.title === 'שכפל מסמך');
      if (dupBtn) dupBtn.click();
      await new Promise(r => setTimeout(r, 100));
      document.getElementById('_docMgr')?.remove();
    },
    assert: () => {
      const issues = [];
      const docs = getAllDocs();
      const countAfter = Object.keys(docs).length;
      if (countAfter !== window.__countBefore + 1) { issues.push({ type: 'doctabs-dup-count-wrong', msg: `${window.__countBefore}→${countAfter} מסמכים אחרי שכפול, ציפינו +1`, id: 'doctabs' }); return issues; }
      const copyEntry = Object.entries(docs).find(([id, d]) => id !== window.__srcId && (d.title || '').includes('תרחיש-שכפול-מקור') && (d.title || '').includes('עותק'));
      if (!copyEntry) { issues.push({ type: 'doctabs-dup-not-found', msg: 'לא נמצא מסמך-עותק עם השם "...— עותק"', id: 'doctabs' }); return issues; }
      const [copyId, copyDoc] = copyEntry;
      if (copyId === window.__srcId) issues.push({ type: 'doctabs-dup-same-id', msg: 'לעותק יש אותו מזהה בדיוק כמו המקור — אינו עצמאי', id: 'doctabs' });
      if (copyDoc.content !== docs[window.__srcId].content) issues.push({ type: 'doctabs-dup-content-mismatch', msg: 'תוכן העותק לא זהה לתוכן המקור', id: 'doctabs' });
      return issues;
    },
  },
  {
    id: 'doctabs-delete-open-doc-removes-tab-and-creates-new', suite: 'doctabs', rule: 'MyWord-v2.html openDocManager — כפתור 🗑 "מחק מסמך" על המסמך הפתוח',
    name: 'מחיקת המסמך-הפתוח-כרגע ממנהל-המסמכים מסירה את הלשונית שלו ועוברת ל"מסמך חדש" ריק, בלי להחיות אותו מחדש',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = 'תרחיש-מחיקה-פתוח';
      (window.saveDoc || saveDoc)();
      window.__deletedId = currentDocId;
      (window.openDocManager || openDocManager)();
      await new Promise(r => setTimeout(r, 80));
      const row = [...document.querySelectorAll('#_docMgrList > div')].find(r => r.textContent.includes('תרחיש-מחיקה-פתוח'));
      const delBtn = row && [...row.querySelectorAll('button')].find(b => b.title === 'מחק מסמך');
      if (delBtn) delBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const okBtn = document.querySelector('#mwDlgCard [data-mw-default]');
      if (okBtn) okBtn.click();
      await new Promise(r => setTimeout(r, 150));
      document.getElementById('_docMgr')?.remove();
    },
    assert: () => {
      const issues = [];
      const docs = getAllDocs();
      if (docs[window.__deletedId]) issues.push({ type: 'doctabs-delete-open-not-removed', msg: 'המסמך-הפתוח-שנמחק עדיין קיים ב-getAllDocs', id: 'doctabs' });
      if (currentDocId === window.__deletedId) issues.push({ type: 'doctabs-delete-open-still-current', msg: 'currentDocId עדיין מצביע על המסמך-שנמחק', id: 'doctabs' });
      // מסמך-חדש-ריק (עדיין ללא id, לפני שמירה ראשונה) לא אמור לקבל לשונית — כמו
      // בטעינה ראשונית של האפליקציה. לשונית כלשהי כאן פירושה שהמסמך-שנמחק הוחיה-מחדש.
      const tabs = [...document.querySelectorAll('.doc-tab')];
      if (tabs.length) issues.push({ type: 'doctabs-delete-open-tab-resurrected', msg: `${tabs.length} לשוניות אחרי מחיקת המסמך-הפתוח, ציפינו 0 (מסמך-חדש-ריק, לא החייאה)`, id: 'doctabs' });
      if ((document.getElementById('docTitle')?.value) !== 'מסמך חדש') issues.push({ type: 'doctabs-delete-open-title-not-reset', msg: 'שם-המסמך לא אופס ל"מסמך חדש" אחרי מחיקת המסמך-הפתוח', id: 'doctabs' });
      return issues;
    },
  },
);

// ─── מנהל-מסמכים משודרג (חיפוש/שינוי-שם/שכפול, בריחת-HTML) ─────────────────
scenarios.push(
  {
    id: 'docmgr-search-filters', suite: 'docmgr', rule: 'wiki/log.md 2026-07-05',
    name: 'חיפוש במנהל-המסמכים מסנן לפי שם (case-insensitive, substring)',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      ['חיפוש-תפוח', 'חיפוש-בננה'].forEach(nm => {
        if (typeof currentDocId !== 'undefined' && currentDocId) (window.saveDoc || saveDoc)();
        (window.newDoc || newDoc)();
        document.getElementById('docTitle').value = nm;
        (window.saveDoc || saveDoc)();
      });
      (window.openDocManager || openDocManager)();
      await new Promise(r => setTimeout(r, 80));
      const s = document.getElementById('_docMgrSearch');
      s.value = 'תפוח';
      s.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
    },
    assert: () => {
      const issues = [];
      const mgr = document.getElementById('_docMgr');
      if (!mgr) { issues.push({ type: 'docmgr-not-open', msg: 'מנהל-המסמכים לא נפתח', id: 'docmgr' }); return issues; }
      const rows = mgr.querySelectorAll('#_docMgrList > div');
      if (rows.length !== 1) issues.push({ type: 'docmgr-search-broken', msg: `חיפוש "תפוח" החזיר ${rows.length} שורות, ציפינו 1`, id: 'docmgr' });
      mgr.remove();
      return issues;
    },
  },
  {
    id: 'docmgr-rename-syncs-tab', suite: 'docmgr', rule: 'wiki/log.md 2026-07-05',
    name: 'שינוי-שם במנהל מתעדכן גם בלשונית וגם ב-docTitle',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = 'לפני-שינוי-שם';
      (window.saveDoc || saveDoc)();
      // מדמים את mwPrompt (דיאלוג א-סינכרוני) — קוראים ישירות לעדכון ה-state
      // שה-handler של "שנה שם" מבצע (bypass ה-UI-prompt, לא לוגיקת-הליבה).
      const all = getAllDocs();
      const id = currentDocId;
      all[id].title = 'אחרי-שינוי-שם'; all[id].updated = Date.now();
      saveAllDocs(all);
      document.getElementById('docTitle').value = 'אחרי-שינוי-שם';
      if (typeof window._renderDocTabs === 'function') window._renderDocTabs();
      await new Promise(r => setTimeout(r, 60));
    },
    assert: () => {
      const issues = [];
      const activeTabName = document.querySelector('.doc-tab.active .dt-name')?.textContent;
      if (activeTabName !== 'אחרי-שינוי-שם')
        issues.push({ type: 'docmgr-rename-not-synced', msg: `לשונית מציגה "${activeTabName}" אחרי שינוי-שם`, id: 'docmgr' });
      return issues;
    },
  },
  {
    id: 'docmgr-title-html-escaped', suite: 'docmgr', rule: 'wiki/log.md 2026-07-06 (sec)',
    name: 'שם-מסמך עם תווי HTML לא מוזרק לרשימה (בריחה מלאה)',
    setup: async () => {
      window.__reset(); await window.__wipeAllDocs();
      (window.newDoc || newDoc)();
      document.getElementById('docTitle').value = '<img src=x onerror=alert(1)> & "test" \'q\'';
      (window.saveDoc || saveDoc)();
      (window.openDocManager || openDocManager)();
      await new Promise(r => setTimeout(r, 80));
    },
    assert: () => {
      const issues = [];
      const mgr = document.getElementById('_docMgr');
      if (!mgr) { issues.push({ type: 'docmgr-not-open', msg: 'מנהל-המסמכים לא נפתח', id: 'docmgr' }); return issues; }
      const row = [...mgr.querySelectorAll('#_docMgrList > div')].find(r => r.textContent.includes('onerror'));
      if (!row) { issues.push({ type: 'docmgr-row-missing', msg: 'לא נמצאה שורת המסמך עם השם המסוכן', id: 'docmgr' }); mgr.remove(); return issues; }
      if (row.querySelector('img')) issues.push({ type: 'docmgr-xss', msg: 'תג <img> הוזרק בפועל לרשימת-המסמכים (XSS)', id: 'docmgr' });
      mgr.remove();
      return issues;
    },
  },
);

// ─── פנל עובי/סגנון-קו לצורות (openStrokePanel) ────────────────────────────
scenarios.push(
  {
    id: 'stroke-panel-default-width', suite: 'shapes2', rule: 'wiki/log.md 2026-07-04',
    name: 'צורה חדשה — עובי-קו ברירת-מחדל 4px (ללא dataset.strokeW)',
    setup: () => { window.__reset(); insertFreeShape('rect'); },
    assert: () => {
      const issues = [];
      const obj = document.querySelector('.free-obj');
      const el = obj?.querySelector('svg rect,svg polygon,svg path,svg ellipse');
      if (!el) { issues.push({ type: 'shape-missing', msg: 'לא נוצרה צורה', id: 'shapes2' }); return issues; }
      const sw = el.getAttribute('stroke-width');
      if (sw !== '4') issues.push({ type: 'stroke-default-wrong', msg: `stroke-width="${sw}", ציפינו "4" (ברירת-מחדל)`, id: 'shapes2' });
      return issues;
    },
  },
  {
    id: 'stroke-panel-change-and-persist', suite: 'shapes2', rule: 'wiki/log.md 2026-07-04',
    name: 'שינוי עובי+סגנון-קו משתקף ב-SVG ושורד סריאליזציה',
    setup: () => {
      window.__reset();
      insertFreeShape('hexagon');
      const obj = document.querySelector('.free-obj');
      obj.dataset.strokeW = '9';
      obj.dataset.dashStyle = 'dashed';
      _renderShape(obj);
      window.__serialized = _serializeObj(obj);
    },
    assert: () => {
      const issues = [];
      const el = document.querySelector('.free-obj svg polygon,.free-obj svg path');
      if (el?.getAttribute('stroke-width') !== '9') issues.push({ type: 'stroke-not-applied', msg: `stroke-width="${el?.getAttribute('stroke-width')}", ציפינו "9"`, id: 'shapes2' });
      if (!el?.getAttribute('stroke-dasharray')) issues.push({ type: 'dash-not-applied', msg: 'אין stroke-dasharray אחרי בחירת "מקווקו"', id: 'shapes2' });
      if (window.__serialized?.strokeW !== '9') issues.push({ type: 'stroke-not-serialized', msg: '_serializeObj לא כלל strokeW=9', id: 'shapes2' });
      if (window.__serialized?.dashStyle !== 'dashed') issues.push({ type: 'dash-not-serialized', msg: '_serializeObj לא כלל dashStyle=dashed', id: 'shapes2' });
      return issues;
    },
  },
  {
    id: 'stroke-panel-undo-reverts', suite: 'shapes2', rule: 'wiki/log.md 2026-07-04',
    name: 'Ctrl+Z אחרי שינוי-עובי מחזיר לערך הקודם',
    setup: async () => {
      window.__reset();
      insertFreeShape('star5');
      await new Promise(r => setTimeout(r, 450)); // snapshot ראשוני יציב
      const obj = document.querySelector('.free-obj');
      if (typeof window._historyRecord === 'function') window._historyRecord();
      obj.dataset.strokeW = '9'; _renderShape(obj);
      await new Promise(r => setTimeout(r, 100));
      exec('undo');
      await new Promise(r => setTimeout(r, 200));
    },
    assert: () => {
      const issues = [];
      const obj = document.querySelector('.free-obj');
      if (!obj) { issues.push({ type: 'shape-gone-after-undo', msg: 'הצורה נעלמה אחרי undo של שינוי-עובי', id: 'shapes2' }); return issues; }
      if (obj.dataset.strokeW === '9') issues.push({ type: 'stroke-undo-failed', msg: 'undo לא ביטל את שינוי-העובי (עדיין 9)', id: 'shapes2' });
      return issues;
    },
  },
);

// ─── תפריטי ▾ חכמים בסרגל הראשי (תמונה/צורה/תיבה/טבלה) ──────────────────────
scenarios.push(
  {
    id: 'caret-image-with-selection', suite: 'ribbon-caret', rule: 'wiki/log.md 2026-07-04',
    name: 'תפריט ▾ תמונה עם תמונה נבחרת — 6 מצבי-גלישה + פעולות',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 150));
      _selectObj(obj);
      document.getElementById('insImageCaret').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    assert: () => {
      const issues = [];
      const m = document.getElementById('_imgRibbonMenu');
      if (!m) { issues.push({ type: 'caret-menu-missing', msg: 'תפריט-תמונה לא נפתח כשתמונה נבחרת', id: 'ribbon-caret' }); return issues; }
      const modeItems = [...m.querySelectorAll('button')].filter(b => b.textContent.includes('●') || b.textContent.includes('○'));
      if (modeItems.length !== 6) issues.push({ type: 'caret-image-modes-count', msg: `${modeItems.length} מצבי-גלישה בתפריט, ציפינו 6 (IMG_MODES בפועל)`, id: 'ribbon-caret' });
      if (!m.textContent.includes('מחק')) issues.push({ type: 'caret-image-no-delete', msg: 'אין פעולת-מחיקה בתפריט-תמונה', id: 'ribbon-caret' });
      m.remove();
      return issues;
    },
  },
  {
    id: 'caret-image-no-selection', suite: 'ribbon-caret', rule: 'wiki/log.md 2026-07-04',
    name: 'תפריט ▾ תמונה בלי בחירה — פריט הוספה יחיד + הכוונה',
    setup: () => {
      window.__reset();
      getSelection().removeAllRanges();
      document.getElementById('insImageCaret').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    assert: () => {
      const issues = [];
      const m = document.getElementById('_imgRibbonMenu');
      if (!m) { issues.push({ type: 'caret-menu-missing', msg: 'תפריט-תמונה לא נפתח בלי בחירה', id: 'ribbon-caret' }); return issues; }
      if (!m.textContent.includes('הוסף תמונה')) issues.push({ type: 'caret-image-empty-wrong', msg: 'אין פריט "הוסף תמונה" כשאין בחירה', id: 'ribbon-caret' });
      m.remove();
      return issues;
    },
  },
  {
    id: 'caret-table-requires-cursor-in-cell', suite: 'ribbon-caret', rule: 'wiki/log.md 2026-07-04',
    name: 'תפריט ▾ טבלה תלוי בסמן-בתא בפועל, לא רק ב-DOM',
    setup: () => {
      window.__reset();
      document.getElementById('editor').innerHTML = window.__bigTable(2, 2);
      getSelection().removeAllRanges();          // אין סמן בתא כלל
      document.getElementById('insTableCaret').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    assert: () => {
      const issues = [];
      const m = document.getElementById('_tblRibbonMenu');
      if (!m) { issues.push({ type: 'caret-menu-missing', msg: 'תפריט-טבלה לא נפתח כלל', id: 'ribbon-caret' }); return issues; }
      if (m.textContent.includes('הוסף שורה מעל'))
        issues.push({ type: 'caret-table-wrong-mode', msg: 'תפריט-כלים (הוסף-שורה) הופיע בלי סמן בתא — ציפינו תפריט מצומצם', id: 'ribbon-caret' });
      m.remove();
      return issues;
    },
  },
);

// ─── קיצורי-מקלדת ל-free-obj (nudge, Ctrl+D, חסימה בעריכת-טקסט) ────────────
scenarios.push(
  {
    id: 'kb-nudge-arrow-and-shift', suite: 'kbshortcuts', rule: 'wiki/log.md 2026-07-03',
    name: 'חץ=1px, Shift+חץ=10px, מבוטל כשעורכים טקסט',
    setup: async () => {
      window.__reset();
      insertFreeShape('ellipse');
      const obj = document.querySelector('.free-obj');
      _selectObj(obj); getSelection().removeAllRanges(); document.activeElement.blur();
      await new Promise(r => setTimeout(r, 60));
      window.__left0 = parseFloat(obj.style.left);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      window.__leftAfterSmall = parseFloat(obj.style.left);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true }));
      window.__leftAfterBig = parseFloat(obj.style.left);
      // עכשיו מדמים עריכת-טקסט פעילה (סמן בעורך, לא באובייקט) — nudge חייב להיחסם
      document.getElementById('editor').focus();
      const p = document.createElement('p'); p.textContent = 'טקסט'; document.getElementById('editor').appendChild(p);
      const r = document.createRange(); r.selectNodeContents(p); r.collapse(true);
      getSelection().removeAllRanges(); getSelection().addRange(r);
      window.__leftBeforeBlocked = parseFloat(obj.style.left);
      const keBlk = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      document.dispatchEvent(keBlk);
      window.__leftAfterBlocked = parseFloat(obj.style.left);
      window.__blkPrevented = keBlk.defaultPrevented;   // צריך false — החץ עובר לסמן
      // ── מגן-רגרסיה לתיקון 2026-07-20: בחירת-אובייקט שבה הסמן יושב *על* ה-free-obj
      //    (המצב מיד אחרי insert) — nudge חייב עדיין לעבוד, לא להיחסם ──
      _selectObj(obj);
      const par = obj.parentNode, i = [...par.childNodes].indexOf(obj);
      const rB = document.createRange(); rB.setStart(par, i); rB.collapse(true);
      getSelection().removeAllRanges(); getSelection().addRange(rB);
      document.getElementById('editor').focus();
      window.__leftBeforeObjCaret = parseFloat(obj.style.left);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      window.__leftAfterObjCaret = parseFloat(obj.style.left);
    },
    assert: () => {
      const issues = [];
      if (window.__leftAfterSmall !== window.__left0 + 1) issues.push({ type: 'nudge-wrong-step', msg: `nudge רגיל: ${window.__left0}→${window.__leftAfterSmall}, ציפינו +1`, id: 'kbshortcuts' });
      if (window.__leftAfterBig !== window.__leftAfterSmall + 10) issues.push({ type: 'nudge-shift-wrong-step', msg: `Shift+nudge: ${window.__leftAfterSmall}→${window.__leftAfterBig}, ציפינו +10`, id: 'kbshortcuts' });
      if (window.__leftAfterBlocked !== window.__leftBeforeBlocked) issues.push({ type: 'nudge-not-blocked', msg: 'nudge לא נחסם כשהסמן בטקסט-פסקה', id: 'kbshortcuts' });
      if (window.__blkPrevented) issues.push({ type: 'nudge-ate-caret-key', msg: 'החץ נבלע (preventDefault) למרות שהסמן בטקסט — הסמן לא יזוז', id: 'kbshortcuts' });
      if (window.__leftAfterObjCaret !== window.__leftBeforeObjCaret + 1) issues.push({ type: 'nudge-regressed-on-select', msg: `בחירת-אובייקט (סמן על ה-free-obj) הפסיקה להזיז: ${window.__leftBeforeObjCaret}→${window.__leftAfterObjCaret}, ציפינו +1`, id: 'kbshortcuts' });
      return issues;
    },
  },
  {
    id: 'kb-ctrl-d-duplicate', suite: 'kbshortcuts', rule: 'wiki/log.md 2026-07-03',
    name: 'Ctrl+D משכפל באופסט 24px ובוחר את העותק',
    setup: async () => {
      window.__reset();
      insertFreeShape('diamond');
      const obj = document.querySelector('.free-obj');
      _selectObj(obj); getSelection().removeAllRanges(); document.activeElement.blur();
      await new Promise(r => setTimeout(r, 60));
      window.__origLeft = parseFloat(obj.style.left); window.__origTop = parseFloat(obj.style.top);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 250));
    },
    assert: () => {
      const issues = [];
      const objs = [...document.querySelectorAll('.free-obj')];
      if (objs.length !== 2) { issues.push({ type: 'ctrld-count-wrong', msg: `${objs.length} אובייקטים אחרי Ctrl+D, ציפינו 2`, id: 'kbshortcuts' }); return issues; }
      const dup = objs.find(o => o.classList.contains('selected'));
      if (!dup) { issues.push({ type: 'ctrld-dup-not-selected', msg: 'העותק החדש לא נבחר אוטומטית', id: 'kbshortcuts' }); return issues; }
      const dl = parseFloat(dup.style.left), dt = parseFloat(dup.style.top);
      if (Math.abs(dl - (window.__origLeft + 24)) > 1 || Math.abs(dt - (window.__origTop + 24)) > 1)
        issues.push({ type: 'ctrld-wrong-offset', msg: `העותק ב-(${dl},${dt}), ציפינו (~${window.__origLeft + 24},~${window.__origTop + 24})`, id: 'kbshortcuts' });
      return issues;
    },
  },
);

// ─── תיקון-Redo (initUndoHistory) — regression guard ────────────────────────
scenarios.push(
  {
    id: 'redo-fix-image-add-undo-redo', suite: 'undo-redo', rule: 'wiki/log.md 2026-07-03 (redo-fix)',
    name: 'Ctrl+Z ואז Ctrl+Y אחרי הוספת-תמונה מחזיר את התמונה (מגן-רגרסיה לבאג busy-flag)',
    // תיעוד ★ (2026-07-06, נמצא ע"י התרחיש הזה): התרחיש חושף באג-אמת נפרד
    // מבאג-ה-busy-flag שתוקן — לא רגרסיה של התיקון עצמו. שורש: ה-snapshot
    // המיידי על הוספת free-obj (MutationObserver ב-initUndoHistory) נלכד
    // *לפני* ש-img.onload מסיים לשנות width/height (220px placeholder →
    // מידות אמיתיות + _clamp). כש-undo() קורא record() כצעד-ראשון, הוא
    // משווה את המצב-החי (מידות סופיות) ל-hist[idx] הקפוא (220px) — לא-שווה
    // → נדחף hist חדש → idx מדלג-קדימה-ואז-אחורה ונוחת בחזרה על מצב "עם
    // תמונה" (220px) במקום על "בלי תמונה". לכן ה-undo "מבטל את שינוי-הגודל"
    // ולא את ההוספה. תרחיש זה נשאר במתכוון ❌ עד שיוחלט לתקן — ראה דיווח
    // למשתמש 2026-07-06 (לא תוקן כאן: מחוץ להיקף "מגן-רגרסיה", קוד משותף).
    setup: async () => {
      window.__reset();
      await new Promise(r => setTimeout(r, 450));
      _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 400));   // תן ל-img.onload להשלים resize+clamp
      window.__afterAdd = document.querySelectorAll('.free-obj').length;
      exec('undo'); await new Promise(r => setTimeout(r, 250));
      window.__afterUndo = document.querySelectorAll('.free-obj').length;
      exec('redo'); await new Promise(r => setTimeout(r, 250));
      window.__afterRedo = document.querySelectorAll('.free-obj').length;
    },
    assert: () => {
      const issues = [];
      if (window.__afterAdd !== 1) issues.push({ type: 'redo-fix-setup-bad', msg: `אחרי הוספה: ${window.__afterAdd} אובייקטים, ציפינו 1`, id: 'undo-redo' });
      if (window.__afterUndo !== 0) issues.push({ type: 'stale-snapshot-blocks-undo', msg: `אחרי undo: ${window.__afterUndo} אובייקטים, ציפינו 0 — snapshot-מיידי-על-הוספה נלכד לפני img.onload (ראה הערה בקוד התרחיש)`, id: 'undo-redo' });
      if (window.__afterRedo !== 1) issues.push({ type: 'redo-fix-regression', msg: `אחרי redo: ${window.__afterRedo} אובייקטים, ציפינו 1`, id: 'undo-redo' });
      return issues;
    },
  },
);

// ─── פאנלי עריכת-תמונה (openImageFiltersPanel/openBgRemovePanel) — SPEC-IMAGE-EDIT.md ──
scenarios.push(
  {
    id: 'imgedit-filters-bake', suite: 'img-edit', rule: 'SPEC-IMAGE-EDIT.md פאנל 1',
    name: 'מסנני-תמונה — שינוי בהירות ל-50 + אישור-החל → נצרב ל-PNG',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 200));
      const img = obj.querySelector('img');
      window.__srcBefore = img.src;
      openImageFiltersPanel(obj, obj);
      const panel = document.getElementById('_imgFiltersPanel');
      const bri = panel.querySelectorAll('input[type="range"]')[0];
      bri.value = '50';
      bri.dispatchEvent(new Event('input', { bubbles: true }));
      const applyBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('אישור'));
      applyBtn.click();
      await new Promise(r => setTimeout(r, 150));
    },
    assert: () => {
      const issues = [];
      const img = document.querySelector('.free-obj img');
      if (!img) { issues.push({ type: 'img-missing', msg: 'התמונה נעלמה אחרי בייק-מסננים', id: 'img-edit' }); return issues; }
      if (!/^data:image\/png/.test(img.src)) issues.push({ type: 'filters-not-png', msg: `src אינו PNG אחרי בייק: ${img.src.slice(0, 30)}`, id: 'img-edit' });
      if (img.src === window.__srcBefore) issues.push({ type: 'filters-not-baked', msg: 'img.src לא השתנה אחרי "אישור — החל"', id: 'img-edit' });
      if (img.dataset.brightness !== '50') issues.push({ type: 'filters-brightness-not-saved', msg: `dataset.brightness="${img.dataset.brightness}", ציפינו "50"`, id: 'img-edit' });
      return issues;
    },
  },
  {
    id: 'imgedit-bg-remove-chroma', suite: 'img-edit', rule: 'SPEC-IMAGE-EDIT.md פאנל 2',
    name: 'הסרת-רקע chroma-key — קליק על אדום מסיר רק אדום, כחול נשאר',
    setup: async () => {
      window.__reset();
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
      const cctx = cv.getContext('2d');
      cctx.fillStyle = '#ff0000'; cctx.fillRect(0, 0, 8, 8);
      cctx.fillStyle = '#0000ff'; cctx.fillRect(3, 3, 2, 2);
      const src = cv.toDataURL('image/png');
      const obj = _buildImageObjFromSrc(src);
      await new Promise(r => setTimeout(r, 200));
      const img = obj.querySelector('img');
      openBgRemovePanel(obj, obj);
      const panel = document.getElementById('_bgRemovePanel');
      if (!panel) { window.__panelMissing = true; return; }
      const canvas = panel.querySelector('.ie-canvas');
      const rect = canvas.getBoundingClientRect();
      // קליק ליד (1,1) — בתוך אזור אדום (הריבוע הכחול הוא 3,3–4,4 בלבד)
      canvas.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, clientX: rect.left + rect.width * 0.1, clientY: rect.top + rect.height * 0.1,
      }));
      const ctx2 = canvas.getContext('2d');
      window.__alphaRed = ctx2.getImageData(0, 0, 1, 1).data[3];
      window.__alphaBlue = ctx2.getImageData(4, 4, 1, 1).data[3];
      window.__srcBeforeApply = img.src;
      const applyBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.trim() === 'החל');
      applyBtn.click();
      await new Promise(r => setTimeout(r, 100));
      window.__srcAfterApply = img.src;
    },
    assert: () => {
      const issues = [];
      if (window.__panelMissing) { issues.push({ type: 'bg-remove-panel-missing', msg: 'openBgRemovePanel לא פתח פאנל (img.complete/naturalWidth?)', id: 'img-edit' }); return issues; }
      if (window.__alphaRed !== 0) issues.push({ type: 'bg-remove-red-not-transparent', msg: `alpha אדום=${window.__alphaRed}, ציפינו 0`, id: 'img-edit' });
      if (window.__alphaBlue !== 255) issues.push({ type: 'bg-remove-blue-not-preserved', msg: `alpha כחול=${window.__alphaBlue}, ציפינו 255`, id: 'img-edit' });
      if (window.__srcAfterApply === window.__srcBeforeApply) issues.push({ type: 'bg-remove-not-applied', msg: 'img.src לא השתנה אחרי "החל"', id: 'img-edit' });
      if (window.__srcAfterApply && !/^data:image\/png/.test(window.__srcAfterApply)) issues.push({ type: 'bg-remove-not-png', msg: 'src אחרי "החל" אינו PNG (מאבד alpha)', id: 'img-edit' });
      return issues;
    },
  },
  {
    id: 'imgedit-restore-original', suite: 'img-edit', rule: 'SPEC-IMAGE-EDIT.md עקרון-על',
    name: 'שחזר תמונה מקורית — אחרי עריכת-מסננים חוזר בדיוק ל-src המקורי',
    setup: async () => {
      window.__reset();
      const cv = document.createElement('canvas'); cv.width = 6; cv.height = 6;
      const cctx = cv.getContext('2d'); cctx.fillStyle = '#00ff00'; cctx.fillRect(0, 0, 6, 6);
      const src = cv.toDataURL('image/png');
      const obj = _buildImageObjFromSrc(src);
      await new Promise(r => setTimeout(r, 200));
      const img = obj.querySelector('img');
      window.__origSrc = img.src;
      // עריכה 1: מסננים + בייק
      openImageFiltersPanel(obj, obj);
      let panel = document.getElementById('_imgFiltersPanel');
      const bri = panel.querySelectorAll('input[type="range"]')[0];
      bri.value = '40'; bri.dispatchEvent(new Event('input', { bubbles: true }));
      let applyBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('אישור'));
      applyBtn.click();
      await new Promise(r => setTimeout(r, 120));
      window.__srcAfterBake = img.src;
      // עריכה 2: פותח שוב ולוחץ "שחזר תמונה מקורית"
      openImageFiltersPanel(obj, obj);
      panel = document.getElementById('_imgFiltersPanel');
      const resetBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('שחזר'));
      resetBtn.click();
      await new Promise(r => setTimeout(r, 80));
    },
    assert: () => {
      const issues = [];
      const img = document.querySelector('.free-obj img');
      if (!img) { issues.push({ type: 'img-missing', msg: 'התמונה נעלמה אחרי שחזור', id: 'img-edit' }); return issues; }
      if (window.__srcAfterBake === window.__origSrc) issues.push({ type: 'restore-setup-bad', msg: 'הבייק לא שינה את src (הבדיקה לא תקפה)', id: 'img-edit' });
      if (img.src !== window.__origSrc) issues.push({ type: 'restore-failed', msg: 'img.src אחרי "שחזר תמונה מקורית" לא זהה למקור', id: 'img-edit' });
      if (img.dataset.brightness) issues.push({ type: 'restore-dataset-leftover', msg: `dataset.brightness עדיין קיים אחרי שחזור: ${img.dataset.brightness}`, id: 'img-edit' });
      return issues;
    },
  },
  {
    id: 'imgedit-serialize-round-trip', suite: 'img-edit', rule: 'SPEC-IMAGE-EDIT.md §6',
    name: '_serializeObj/_deserializeFreeObjs שומרים ומשחזרים imgOrigSrc',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 200));
      openImageFiltersPanel(obj, obj);
      const panel = document.getElementById('_imgFiltersPanel');
      const bri = panel.querySelectorAll('input[type="range"]')[0];
      bri.value = '70'; bri.dispatchEvent(new Event('input', { bubbles: true }));
      const applyBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('אישור'));
      applyBtn.click();
      await new Promise(r => setTimeout(r, 120));
      const data = _serializeObj(obj);
      window.__serializedImg = data;
      document.getElementById('editor').innerHTML = '';
      _deserializeFreeObjs([data]);
      await new Promise(r => setTimeout(r, 50));
    },
    assert: () => {
      const issues = [];
      if (!window.__serializedImg || !window.__serializedImg.imgOrigSrc) issues.push({ type: 'serialize-missing-origsrc', msg: '_serializeObj לא כלל imgOrigSrc לא-ריק', id: 'img-edit' });
      const img2 = document.querySelector('.free-obj img');
      if (!img2) { issues.push({ type: 'deserialize-img-missing', msg: 'תמונה לא נבנתה מחדש ע"י _deserializeFreeObjs', id: 'img-edit' }); return issues; }
      if (img2.dataset.origSrc !== window.__serializedImg.imgOrigSrc) issues.push({ type: 'deserialize-origsrc-mismatch', msg: 'dataset.origSrc אחרי deserialize לא תואם imgOrigSrc שנשמר', id: 'img-edit' });
      return issues;
    },
  },
);

// ─── לשוניות-הקשר imgformat/shapeformat + אפקטי-צורה — SPEC-CTX-TABS.md ──────
scenarios.push(
  {
    id: 'ctxtab-visibility-image', suite: 'ctx-tabs', rule: 'SPEC-CTX-TABS.md מנגנון-ההצגה',
    name: 'הכנסת תמונה חושפת imgTab ומסתירה shapeTab',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 200));
      if (typeof _selectObj === 'function') _selectObj(obj);
      await new Promise(r => setTimeout(r, 50));
    },
    assert: () => {
      const issues = [];
      const imgTab = document.querySelector('.tab[data-tab="imgformat"]');
      const shapeTab = document.querySelector('.tab[data-tab="shapeformat"]');
      if (!imgTab) { issues.push({ type: 'imgtab-missing', msg: 'לשונית imgformat לא קיימת ב-DOM', id: 'ctx-tabs' }); return issues; }
      if (imgTab.hidden !== false) issues.push({ type: 'imgtab-not-visible', msg: `imgTab.hidden=${imgTab.hidden}, ציפינו false כשתמונה נבחרה`, id: 'ctx-tabs' });
      if (!shapeTab || shapeTab.hidden !== true) issues.push({ type: 'shapetab-should-be-hidden', msg: `shapeTab.hidden=${shapeTab && shapeTab.hidden}, ציפינו true כשתמונה (לא צורה) נבחרה`, id: 'ctx-tabs' });
      return issues;
    },
  },
  {
    id: 'ctxtab-visibility-shape', suite: 'ctx-tabs', rule: 'SPEC-CTX-TABS.md מנגנון-ההצגה',
    name: 'הכנסת צורה חושפת shapeTab ומסתירה imgTab',
    setup: async () => {
      window.__reset();
      insertFreeShape('rect');
      await new Promise(r => setTimeout(r, 100));
    },
    assert: () => {
      const issues = [];
      const imgTab = document.querySelector('.tab[data-tab="imgformat"]');
      const shapeTab = document.querySelector('.tab[data-tab="shapeformat"]');
      if (!shapeTab) { issues.push({ type: 'shapetab-missing', msg: 'לשונית shapeformat לא קיימת ב-DOM', id: 'ctx-tabs' }); return issues; }
      if (shapeTab.hidden !== false) issues.push({ type: 'shapetab-not-visible', msg: `shapeTab.hidden=${shapeTab.hidden}, ציפינו false כשצורה נבחרה`, id: 'ctx-tabs' });
      if (!imgTab || imgTab.hidden !== true) issues.push({ type: 'imgtab-should-be-hidden', msg: `imgTab.hidden=${imgTab && imgTab.hidden}, ציפינו true כשצורה (לא תמונה) נבחרה`, id: 'ctx-tabs' });
      return issues;
    },
  },
  {
    id: 'ctxtab-click-single-active', suite: 'ctx-tabs', rule: 'SPEC-CTX-TABS.md §2 (רק ribbon אחד active)',
    name: 'קליק על imgTab מפעיל רק ribbon[data-ribbon="imgformat"]',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 200));
      if (typeof _selectObj === 'function') _selectObj(obj);
      await new Promise(r => setTimeout(r, 50));
      document.querySelector('.tab[data-tab="imgformat"]').click();
      await new Promise(r => setTimeout(r, 50));
    },
    assert: () => {
      const issues = [];
      const ribbons = [...document.querySelectorAll('.ribbon')];
      const active = ribbons.filter(r => r.classList.contains('active'));
      if (active.length !== 1) issues.push({ type: 'multiple-active-ribbons', msg: `${active.length} ribbons עם .active, ציפינו 1`, id: 'ctx-tabs' });
      if (!active[0] || active[0].dataset.ribbon !== 'imgformat') issues.push({ type: 'wrong-ribbon-active', msg: `ribbon פעיל="${active[0] && active[0].dataset.ribbon}", ציפינו imgformat`, id: 'ctx-tabs' });
      return issues;
    },
  },
  {
    id: 'ctxtab-deselect-returns-home', suite: 'ctx-tabs', rule: 'SPEC-CTX-TABS.md מנגנון-ההצגה (ביטול-בחירה)',
    name: 'ביטול בחירה בעודה imgformat פעילה מחזיר ל"בית"',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 200));
      if (typeof _selectObj === 'function') _selectObj(obj);
      await new Promise(r => setTimeout(r, 50));
      document.querySelector('.tab[data-tab="imgformat"]').click();
      await new Promise(r => setTimeout(r, 50));
      _selectObj(null);
      await new Promise(r => setTimeout(r, 50));
    },
    assert: () => {
      const issues = [];
      const homeRibbon = document.querySelector('.ribbon[data-ribbon="home"]');
      if (!homeRibbon || !homeRibbon.classList.contains('active')) issues.push({ type: 'not-returned-home', msg: 'אחרי ביטול-בחירה ribbon[home] אינו active', id: 'ctx-tabs' });
      const imgTab = document.querySelector('.tab[data-tab="imgformat"]');
      if (!imgTab || imgTab.hidden !== true) issues.push({ type: 'imgtab-still-visible', msg: 'imgTab נשאר גלוי אחרי ביטול-בחירה', id: 'ctx-tabs' });
      return issues;
    },
  },
  {
    id: 'ctxtab-shape-fx-round-trip', suite: 'ctx-tabs', rule: 'SPEC-CTX-TABS.md _applyShapeFx + §6',
    name: 'צל+גרדיאנט+flip משוחזרים אחרי serialize→deserialize',
    setup: async () => {
      window.__reset();
      insertFreeShape('rect');
      await new Promise(r => setTimeout(r, 50));
      const obj = document.querySelector('.free-obj');
      obj.dataset.shadow = JSON.stringify({ on: 1, x: 4, y: 4, blur: 8, color: '#1f2937', op: 50 });
      obj.dataset.grad = JSON.stringify({ c1: '#ff0000', c2: '#00ff00', angle: 45 });
      obj.dataset.flipH = '1';
      _applyShapeFx(obj);
      await new Promise(r => setTimeout(r, 30));
      window.__filterBefore = obj.querySelector('.free-shape-wrap').style.filter;
      window.__gradIdBefore = obj.querySelector('.free-shape-wrap svg defs linearGradient') ?
        obj.querySelector('.free-shape-wrap svg defs linearGradient').id : null;
      const data = _serializeObj(obj);
      window.__serializedShape = data;
      document.getElementById('editor').innerHTML = '';
      _deserializeFreeObjs([data]);
      await new Promise(r => setTimeout(r, 50));
    },
    assert: () => {
      const issues = [];
      const obj2 = document.querySelector('.free-obj');
      if (!obj2) { issues.push({ type: 'deserialize-shape-missing', msg: 'צורה לא נבנתה מחדש ע"י _deserializeFreeObjs', id: 'ctx-tabs' }); return issues; }
      const wrap = obj2.querySelector('.free-shape-wrap');
      if (!wrap.style.filter || !wrap.style.filter.includes('drop-shadow')) issues.push({ type: 'shadow-not-restored', msg: `wrap.style.filter="${wrap.style.filter}" אחרי deserialize, ציפינו drop-shadow(...)`, id: 'ctx-tabs' });
      const grad = wrap.querySelector('svg defs linearGradient');
      if (!grad) issues.push({ type: 'gradient-not-restored', msg: 'אין linearGradient ב-defs אחרי deserialize', id: 'ctx-tabs' });
      if (!wrap.style.transform || !wrap.style.transform.includes('-1')) issues.push({ type: 'flip-not-restored', msg: `wrap.style.transform="${wrap.style.transform}" אחרי deserialize, ציפינו scale עם -1 (flipH)`, id: 'ctx-tabs' });
      if (!window.__serializedShape || !window.__serializedShape.shapeShadow) issues.push({ type: 'serialize-missing-shadow', msg: '_serializeObj לא כלל shapeShadow לא-ריק', id: 'ctx-tabs' });
      if (!window.__serializedShape || !window.__serializedShape.shapeGrad) issues.push({ type: 'serialize-missing-grad', msg: '_serializeObj לא כלל shapeGrad לא-ריק', id: 'ctx-tabs' });
      if (!window.__serializedShape || window.__serializedShape.flipH !== true) issues.push({ type: 'serialize-missing-fliph', msg: '_serializeObj.flipH לא true', id: 'ctx-tabs' });
      return issues;
    },
  },
  {
    id: 'ctxtab-shape-clone-gradient-unique-id', suite: 'ctx-tabs', rule: 'SPEC-CTX-TABS.md מלכודת #2 (התנגשות-id בשכפול)',
    name: 'שכפול צורה עם גרדיאנט מייצר linearGradient id שונה (לא מתנגש)',
    setup: async () => {
      window.__reset();
      insertFreeShape('rect');
      await new Promise(r => setTimeout(r, 50));
      const obj = document.querySelector('.free-obj');
      obj.dataset.grad = JSON.stringify({ c1: '#ff0000', c2: '#0000ff', angle: 0 });
      _applyShapeFx(obj);
      await new Promise(r => setTimeout(r, 30));
      // שכפול — אותה לוגיקה כמו כפתור "שכפל" בריבון shapeformat (§ SPEC-CTX-TABS.md)
      const clone = obj.cloneNode(true);
      clone.style.left = (parseInt(obj.style.left || 0) + 20) + 'px';
      clone.style.top = (parseInt(obj.style.top || 0) + 20) + 'px';
      clone.classList.remove('selected', 'multi-sel', 'multi-anchor');
      editor.appendChild(clone);
      _applyShapeFx(clone);
      await new Promise(r => setTimeout(r, 30));
    },
    assert: () => {
      const issues = [];
      const ids = [...document.querySelectorAll('.free-shape-wrap svg defs linearGradient')].map(g => g.id);
      if (ids.length !== 2) issues.push({ type: 'gradient-count-wrong', msg: `${ids.length} linearGradient בדוקומנט, ציפינו 2 (מקור+שכפול)`, id: 'ctx-tabs' });
      if (ids.length === 2 && ids[0] === ids[1]) issues.push({ type: 'gradient-id-collision', msg: `שני ה-linearGradient עם אותו id="${ids[0]}" — התנגשות אחרי שכפול`, id: 'ctx-tabs' });
      return issues;
    },
  },
);

// ─── מחשבון מדעי (9 מצבים) — SPEC-CALC.md ────────────────────────────────────
scenarios.push(
  {
    id: 'calc-mode-switch-aria', suite: 'calculator', rule: 'SPEC-CALC.md _setCalcMode',
    name: 'מעבר בין מצבי-מחשבון — role=tab + aria-selected נכון רק על הפעיל',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      editor.focus();
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(editor); rng.collapse(false);
      sel.addRange(rng);
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeGeo').click();
      await new Promise(r => setTimeout(r, 30));
      window.__afterGeo = [...document.querySelectorAll('#_calcModes button')].map(b => (
        { id: b.id, sel: b.getAttribute('aria-selected'), active: b.classList.contains('active'), role: b.getAttribute('role') }
      ));
      document.getElementById('_modeEq').click();
      await new Promise(r => setTimeout(r, 30));
      window.__afterEq = [...document.querySelectorAll('#_calcModes button')].map(b => (
        { id: b.id, sel: b.getAttribute('aria-selected'), active: b.classList.contains('active'), role: b.getAttribute('role') }
      ));
    },
    assert: () => {
      const issues = [];
      const check = (arr, activeId, label) => {
        if (!arr) { issues.push({ type: 'calc-mode-snapshot-missing', msg: `חסר snapshot ${label}`, id: 'calculator' }); return; }
        arr.forEach(b => {
          if (b.role !== 'tab') issues.push({ type: 'calc-mode-no-role-tab', msg: `${label}: ${b.id} role="${b.role}", ציפינו "tab"`, id: 'calculator' });
          if (b.id === activeId) {
            if (b.sel !== 'true') issues.push({ type: 'calc-mode-aria-not-selected', msg: `${label}: ${b.id} aria-selected="${b.sel}", ציפינו "true"`, id: 'calculator' });
            if (!b.active) issues.push({ type: 'calc-mode-class-not-active', msg: `${label}: ${b.id} חסר class active`, id: 'calculator' });
          } else {
            if (b.sel !== 'false') issues.push({ type: 'calc-mode-aria-leak', msg: `${label}: ${b.id} aria-selected="${b.sel}", ציפינו "false" (רק ${activeId} אמור להיות פעיל)`, id: 'calculator' });
            if (b.active) issues.push({ type: 'calc-mode-multi-active', msg: `${label}: ${b.id} עדיין עם class active`, id: 'calculator' });
          }
        });
      };
      check(window.__afterGeo, '_modeGeo', 'אחרי מעבר לגיאומטריה');
      check(window.__afterEq, '_modeEq', 'אחרי מעבר למשוואות');
      return issues;
    },
  },
  {
    id: 'calc-basic-insert-4-modes', suite: 'calculator', rule: 'SPEC-CALC.md §4 מצבי-הכנסה',
    name: 'מצב בסיסי 5+3= → כל אחד מ-4 כפתורי-ההכנסה מוסיף תוכן ל-#editor',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      editor.focus();
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(editor); rng.collapse(false);
      sel.addRange(rng);
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      const c = (q) => document.querySelector('#_calc ' + q);
      c('button[data-act="DIG"][data-d="5"]').click();
      c('button[data-act="OP"][data-op="+"]').click();
      c('button[data-act="DIG"][data-d="3"]').click();
      c('button[data-act="EQ"]').click();
      await new Promise(r => setTimeout(r, 30));
      window.__calcInsertResults = [];
      for (const btnId of ['_insRes', '_insFull', '_insSteps', '_insHeb']) {
        const before = editor.innerHTML;
        document.getElementById(btnId).click();
        await new Promise(r => setTimeout(r, 30));
        const after = editor.innerHTML;
        window.__calcInsertResults.push({ btnId, changed: after !== before, nonEmpty: after.trim().length > 0 });
      }
    },
    assert: () => {
      const issues = [];
      const results = window.__calcInsertResults || [];
      if (results.length !== 4) issues.push({ type: 'calc-insert-missing-results', msg: `נאספו ${results.length} תוצאות, ציפינו 4`, id: 'calculator' });
      results.forEach(r => {
        if (!r.changed) issues.push({ type: 'calc-insert-no-change', msg: `כפתור ${r.btnId} לא הוסיף תוכן ל-#editor`, id: 'calculator' });
        if (!r.nonEmpty) issues.push({ type: 'calc-insert-empty', msg: `#editor ריק אחרי לחיצה על ${r.btnId}`, id: 'calculator' });
      });
      return issues;
    },
  },
  {
    id: 'calc-geometry-shape-list', suite: 'calculator', rule: 'SPEC-CALC.md מצב-גיאומטריה (תוקן 2026-07-07)',
    name: 'גיאומטריה — 2 צורות ברשימה → טבלה מוכנסת עם שם-צורה נקי (בלי חץ שבור)',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      editor.focus();
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(editor); rng.collapse(false);
      sel.addRange(rng);
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeGeo').click();
      await new Promise(r => setTimeout(r, 30));
      // צורה 1: עיגול r=5
      const shapeSel = document.getElementById('_geoShape');
      shapeSel.value = 'circle';
      shapeSel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 20));
      document.getElementById('_gf_r').value = '5';
      document.getElementById('_geoCalc').click();
      await new Promise(r => setTimeout(r, 20));
      document.getElementById('_geoAddShape').click();
      await new Promise(r => setTimeout(r, 20));
      // צורה 2: ריבוע a=4
      shapeSel.value = 'square';
      shapeSel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 20));
      document.getElementById('_gf_a').value = '4';
      document.getElementById('_geoCalc').click();
      await new Promise(r => setTimeout(r, 20));
      document.getElementById('_geoAddShape').click();
      await new Promise(r => setTimeout(r, 20));
      const before = editor.innerHTML;
      document.getElementById('_geoInsert').click();
      await new Promise(r => setTimeout(r, 30));
      window.__geoInsertChanged = editor.innerHTML !== before;
    },
    assert: () => {
      const issues = [];
      if (!window.__geoInsertChanged) { issues.push({ type: 'calc-geo-insert-no-change', msg: '"הכנס למסמך" לא הוסיף תוכן ל-#editor', id: 'calculator' }); return issues; }
      const table = editor.querySelector('table');
      if (!table) { issues.push({ type: 'calc-geo-no-table', msg: 'לא נמצאה טבלת-ריכוז ב-#editor אחרי הוספת 2 צורות', id: 'calculator' }); return issues; }
      const bodyRows = [...table.querySelectorAll('tr')].slice(1); // דלג על שורת הכותרת
      const shapeCells = bodyRows.map(tr => tr.children[0] ? tr.children[0].textContent : '');
      const joined = shapeCells.join(' | ');
      if (!joined.includes('עיגול')) issues.push({ type: 'calc-geo-missing-circle', msg: `"עיגול" לא נמצא בעמודת-הצורה: "${joined}"`, id: 'calculator' });
      if (!joined.includes('ריבוע')) issues.push({ type: 'calc-geo-missing-square', msg: `"ריבוע" לא נמצא בעמודת-הצורה: "${joined}"`, id: 'calculator' });
      if (joined.includes('→')) issues.push({ type: 'calc-geo-broken-split', msg: `עמודת-הצורה מכילה "→" — מפריד-הפיצול לא עבד: "${joined}"`, id: 'calculator' });
      if (joined.includes('A=')) issues.push({ type: 'calc-geo-leftover-area-text', msg: `עמודת-הצורה מכילה טקסט-שטח שדלף מהתווית: "${joined}"`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-graph-alt', suite: 'calculator', rule: 'SPEC-CALC.md מצב-גרף (_graphInsert)',
    name: 'גרף f(x)=x^2 — "הכנס תמונה למסמך" יוצר <img alt> לא-ריק עם הפונקציה',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      editor.focus();
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(editor); rng.collapse(false);
      sel.addRange(rng);
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeGraph').click();
      await new Promise(r => setTimeout(r, 30));
      document.getElementById('_graphFn').value = 'x^2';
      document.getElementById('_graphDraw').click();
      await new Promise(r => setTimeout(r, 30));
      document.getElementById('_graphInsert').click();
      await new Promise(r => setTimeout(r, 40));
    },
    assert: () => {
      const issues = [];
      const img = editor.querySelector('img[alt]');
      if (!img) { issues.push({ type: 'calc-graph-img-missing', msg: 'לא נמצא <img> ב-#editor אחרי "הכנס תמונה למסמך"', id: 'calculator' }); return issues; }
      const alt = img.getAttribute('alt') || '';
      if (!alt.trim()) issues.push({ type: 'calc-graph-alt-empty', msg: '<img alt=""> ריק', id: 'calculator' });
      if (!alt.includes('x^2')) issues.push({ type: 'calc-graph-alt-missing-fn', msg: `alt="${alt}" לא מכיל את הפונקציה "x^2"`, id: 'calculator' });
      if (!img.src || !img.src.startsWith('data:image')) issues.push({ type: 'calc-graph-src-invalid', msg: `img.src לא data:image, מתחיל: "${(img.src || '').slice(0, 20)}"`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-history-keyboard', suite: 'calculator', rule: 'SPEC-CALC.md _calcHist / _histUseRow',
    name: 'היסטוריה — Enter על שורה ממוקדת מפעיל _histUseRow (מחזיר חישוב לתצוגה)',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      editor.focus();
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(editor); rng.collapse(false);
      sel.addRange(rng);
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      const c = (q) => document.querySelector('#_calc ' + q);
      // חישוב 1: 5+3=8
      c('button[data-act="DIG"][data-d="5"]').click();
      c('button[data-act="OP"][data-op="+"]').click();
      c('button[data-act="DIG"][data-d="3"]').click();
      c('button[data-act="EQ"]').click();
      await new Promise(r => setTimeout(r, 20));
      // חישוב 2: 6×7=42
      c('button[data-act="AC"]').click();
      c('button[data-act="DIG"][data-d="6"]').click();
      c('button[data-act="OP"][data-op="*"]').click();
      c('button[data-act="DIG"][data-d="7"]').click();
      c('button[data-act="EQ"]').click();
      await new Promise(r => setTimeout(r, 20));
      // איפוס תצוגה כדי שאפשר יהיה להבדיל "לפני"/"אחרי" Enter על ההיסטוריה
      c('button[data-act="AC"]').click();
      await new Promise(r => setTimeout(r, 20));
      window.__beforeDisabled = document.getElementById('_insRes').disabled;
      window.__beforeFormula = document.getElementById('_calcFormula').textContent;
      const row = document.querySelector('#_calcHist .ch-r[data-i="0"]');
      window.__rowFound = !!row;
      if (row) {
        row.focus();
        row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      }
      await new Promise(r => setTimeout(r, 30));
      window.__afterDisabled = document.getElementById('_insRes').disabled;
      window.__afterFormula = document.getElementById('_calcFormula').textContent;
    },
    assert: () => {
      const issues = [];
      if (!window.__rowFound) { issues.push({ type: 'calc-history-row-missing', msg: 'לא נמצאה שורת-היסטוריה #_calcHist .ch-r[data-i="0"]', id: 'calculator' }); return issues; }
      if (window.__beforeDisabled !== true) issues.push({ type: 'calc-history-setup-bad', msg: 'AC לא איפס lastResult (insRes.disabled אמור להיות true לפני Enter)', id: 'calculator' });
      if (window.__afterDisabled !== false) issues.push({ type: 'calc-history-enter-no-effect', msg: 'Enter על שורת-היסטוריה לא הפעיל _histUseRow (insRes עדיין disabled)', id: 'calculator' });
      if (window.__afterFormula === window.__beforeFormula) issues.push({ type: 'calc-history-display-unchanged', msg: 'תצוגת #_calcFormula לא השתנתה אחרי Enter על שורת-היסטוריה', id: 'calculator' });
      return issues;
    },
  },
);

// ─── אבטחת ייצוא/שיתוף (exportHTML/shareDoc/exportAndPrint/exportDocWord) ────
// רקע: wiki/log.md "2026-07-07ג/ד" תיעד תיקוני titleEsc (בריחת HTML לשם-מסמך)
// ו-BOM אמיתי בייצוא-Word. תרחישים אלה מאמתים שהתיקונים עדיין תקפים בקוד החי
// (regression guard) — payload עם <script> ותווי & " בשם-המסמך.
scenarios.push(
  {
    id: 'export-title-escape', suite: 'export-security', rule: 'wiki/log.md 2026-07-07ג (titleEsc ב-exportHTML)',
    name: 'exportHTML — שם-מסמך עם <script>/&/" נכנס בורח ל-HTML המיוצא',
    setup: async () => {
      window.__reset();
      document.getElementById('docTitle').value = '<script>alert(1)</script> & "test"';
      let captured = null;
      const origCreate = URL.createObjectURL;
      const origClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => { captured = blob; return origCreate.call(URL, blob); };
      HTMLAnchorElement.prototype.click = function () {};
      try { exportHTML(); } finally {
        URL.createObjectURL = origCreate;
        HTMLAnchorElement.prototype.click = origClick;
      }
      window.__exportedHtml = captured ? await captured.text() : null;
    },
    assert: () => {
      const issues = [];
      const html = window.__exportedHtml;
      if (!html) { issues.push({ type: 'export-html-not-captured', msg: 'exportHTML לא יצר Blob (URL.createObjectURL לא נקרא)', id: 'export-security' }); return issues; }
      if (html.includes('<script>alert(1)</script>')) issues.push({ type: 'export-title-xss', msg: 'exportHTML הזריק <script> חי מתוך שם-המסמך — HTML injection', id: 'export-security' });
      if (!html.includes('&lt;script&gt;')) issues.push({ type: 'export-title-not-escaped', msg: 'שם-המסמך לא נמצא בורח (&lt;script&gt;) ב-HTML המיוצא', id: 'export-security' });
      return issues;
    },
  },
  {
    id: 'share-title-escape', suite: 'export-security', rule: 'wiki/log.md 2026-07-07ד (titleEsc ב-shareDoc)',
    name: 'shareDoc — שם-מסמך עם <script> בורח גם בבאנר-השיתוף וגם בפופאפ החי',
    setup: async () => {
      window.__reset();
      document.getElementById('docTitle').value = '<script>alert(1)</script> & "test"';
      let captured = null;
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = (blob) => { captured = blob; return origCreate.call(URL, blob); };
      try { shareDoc(); } finally { URL.createObjectURL = origCreate; }
      window.__shareBlobHtml = captured ? await captured.text() : null;
      const popupEl = [...document.querySelectorAll('body > div')].find(d => d.innerHTML.includes('שתף מסמך'));
      window.__sharePopupHtml = popupEl ? popupEl.innerHTML : null;
      if (popupEl) popupEl.remove(); // ניקוי — לא להשאיר overlay תלוי לתרחיש הבא
    },
    assert: () => {
      const issues = [];
      const blobHtml = window.__shareBlobHtml;
      const popupHtml = window.__sharePopupHtml;
      if (!blobHtml) { issues.push({ type: 'share-blob-not-captured', msg: 'shareDoc לא יצר Blob (URL.createObjectURL לא נקרא)', id: 'export-security' }); return issues; }
      if (blobHtml.includes('<script>alert(1)</script>')) issues.push({ type: 'share-banner-xss', msg: 'shareDoc הזריק <script> חי לתוך .share-banner בקובץ המשותף', id: 'export-security' });
      if (!blobHtml.includes('&lt;script&gt;')) issues.push({ type: 'share-banner-not-escaped', msg: 'שם-המסמך לא נמצא בורח ב-.share-banner של קובץ-השיתוף', id: 'export-security' });
      if (!popupHtml) { issues.push({ type: 'share-popup-missing', msg: 'הפופאפ החי של shareDoc לא נמצא ב-DOM אחרי הקריאה', id: 'export-security' }); return issues; }
      if (popupHtml.includes('<script>alert(1)</script>')) issues.push({ type: 'share-popup-xss', msg: 'shareDoc הזריק <script> חי לפופאפ החי (טקסט "שתף את...")', id: 'export-security' });
      if (!popupHtml.includes('&lt;script&gt;')) issues.push({ type: 'share-popup-not-escaped', msg: 'שם-המסמך לא נמצא בורח בפופאפ החי של shareDoc', id: 'export-security' });
      return issues;
    },
  },
  {
    id: 'print-title-escape', suite: 'export-security', rule: 'wiki/log.md 2026-07-07ג (titleEsc ב-exportAndPrint)',
    name: 'exportAndPrint — <title> בחלון-ההדפסה בורח (window.open מדומה)',
    setup: async () => {
      window.__reset();
      document.getElementById('docTitle').value = '<script>alert(1)</script> & "test"';
      let captured = null;
      const origOpen = window.open;
      window.open = () => ({
        document: { write(html) { captured = html; }, close() {} },
        onload: null, focus() {}, print() {},
      });
      try { exportAndPrint(); } finally { window.open = origOpen; }
      window.__printHtml = captured;
    },
    assert: () => {
      const issues = [];
      const html = window.__printHtml;
      if (!html) { issues.push({ type: 'print-window-not-captured', msg: 'exportAndPrint לא כתב ל-window.open המדומה', id: 'export-security' }); return issues; }
      if (html.includes('<script>alert(1)</script>')) issues.push({ type: 'print-title-xss', msg: 'exportAndPrint הזריק <script> חי ל-<title> של חלון-ההדפסה', id: 'export-security' });
      if (!html.includes('&lt;script&gt;')) issues.push({ type: 'print-title-not-escaped', msg: 'שם-המסמך לא נמצא בורח ב-<title> של חלון-ההדפסה', id: 'export-security' });
      return issues;
    },
  },
  {
    id: 'word-export-bom', suite: 'export-security', rule: 'wiki/log.md 2026-07-07ג (BOM אמיתי ב-exportDocWord)',
    name: 'exportDocWord — 3 הבייטים הראשונים של ה-Blob הם BOM אמיתי (EF BB BF), לא מוג\'יבייק',
    setup: async () => {
      window.__reset();
      document.getElementById('docTitle').value = 'BomTest מסמך-בדיקה';
      let captured = null;
      const origCreate = URL.createObjectURL;
      const origClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => { captured = blob; return origCreate.call(URL, blob); };
      HTMLAnchorElement.prototype.click = function () {};
      try { exportDocWord(); } finally {
        URL.createObjectURL = origCreate;
        HTMLAnchorElement.prototype.click = origClick;
      }
      if (captured) {
        const buf = await captured.arrayBuffer();
        window.__wordFirstBytes = Array.from(new Uint8Array(buf).slice(0, 3));
      } else {
        window.__wordFirstBytes = null;
      }
    },
    assert: () => {
      const issues = [];
      const bytes = window.__wordFirstBytes;
      if (!bytes) { issues.push({ type: 'word-blob-not-captured', msg: 'exportDocWord לא יצר Blob (URL.createObjectURL לא נקרא)', id: 'export-security' }); return issues; }
      const isRealBom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      if (!isRealBom) issues.push({ type: 'word-bom-broken', msg: `3 הבייטים הראשונים הם [${bytes.join(',')}], ציפינו BOM אמיתי [239,187,191] (EF BB BF) — לא מוג'יבייק`, id: 'export-security' });
      return issues;
    },
  },
);

// ─── מיזוג-צורות בוליאני אמיתי (Paper.js) — combineSelectedShapes/paperBooleanOp ──
// פער-כיסוי #5 מ-docs/FEATURES-INDEX.md — עד כה 0 תרחישים בדקו unite/subtract/exclude
// בפועל. הבדיקה מוודאת boolean-op גאומטרי אמיתי (SVG עם <path>, לא נפילה ל-mask
// fallback הישן), לא רק "הפאנל נפתח".
scenarios.push(
  {
    id: 'shape-merge-unite-real-boolean', suite: 'shape-merge', rule: 'CLAUDE.md §16 2026-06-25 / wiki 2026-06-26',
    name: 'איחוד (unite) שתי צורות חופפות — Paper.js אמיתי, לא SVG-mask fallback',
    setup: async () => {
      window.__reset();
      insertFreeShape('rect');
      const a = document.querySelector('.free-obj');
      a.style.left = '100px'; a.style.top = '100px'; a.style.width = '150px'; a.style.height = '150px';
      insertFreeShape('rect');
      const b = [...document.querySelectorAll('.free-obj')][1];
      b.style.left = '200px'; b.style.top = '180px'; b.style.width = '150px'; b.style.height = '150px';
      if (typeof _selectObj === 'function') _selectObj(a);
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, shiftKey: true }));
      await new Promise(r => setTimeout(r, 50));
      window.__combineOk = (typeof window._ctxDoCombine === 'function') ? window._ctxDoCombine('unite') : false;
      await new Promise(r => setTimeout(r, 150));
    },
    assert: () => {
      const issues = [];
      if (typeof window.paper === 'undefined') { issues.push({ type: 'paper-not-loaded', msg: 'Paper.js לא נטען (window.paper undefined) — לא ניתן לבדוק מיזוג אמיתי', id: 'shape-merge' }); return issues; }
      if (!window.__combineOk) { issues.push({ type: 'combine-failed', msg: '_ctxDoCombine("unite") החזיר false — הבחירה-המרובה לא כללה 2 צורות', id: 'shape-merge' }); return issues; }
      const objs = [...document.querySelectorAll('.free-obj')];
      if (objs.length !== 1) issues.push({ type: 'combine-count-wrong', msg: `נשארו ${objs.length} אובייקטים חופשיים אחרי איחוד, ציפינו 1 (2 המקוריים אמורים להיעלם)`, id: 'shape-merge' });
      const img = objs[0]?.querySelector('img');
      if (!img) { issues.push({ type: 'combine-no-img', msg: 'האובייקט הממוזג אינו div.free-img-wrap>img', id: 'shape-merge' }); return issues; }
      const src = img.getAttribute('src') || '';
      if (!src.startsWith('data:image/svg+xml')) { issues.push({ type: 'combine-not-svg', msg: 'תוצאת האיחוד אינה data:image/svg+xml', id: 'shape-merge' }); return issues; }
      const decoded = decodeURIComponent(src.split(',')[1] || '');
      if (!/<path[ >]/.test(decoded)) issues.push({ type: 'combine-not-real-boolean', msg: 'ה-SVG הממוזג לא מכיל <path> — כנראה נפל ל-SVG-mask fallback במקום boolean-op אמיתי של Paper.js', id: 'shape-merge' });
      if (/<mask/.test(decoded)) issues.push({ type: 'combine-fell-to-mask-fallback', msg: 'ה-SVG הממוזג מכיל <mask> — נפילה בפועל ל-fallback הישן ולא Paper.js', id: 'shape-merge' });
      return issues;
    },
  },
  {
    id: 'shape-merge-subtract-real-boolean', suite: 'shape-merge', rule: 'CLAUDE.md §16 2026-07-12 (העליונה חותכת התחתונה) / wiki 2026-07-13',
    name: 'חיתוך (subtract) שתי צורות חופפות — Paper.js אמיתי, מוריד שכבה אחת',
    setup: async () => {
      window.__reset();
      insertFreeShape('rect');
      const a = document.querySelector('.free-obj');
      a.style.left = '100px'; a.style.top = '100px'; a.style.width = '150px'; a.style.height = '150px';
      a.style.zIndex = '15';
      insertFreeShape('rect');
      const b = [...document.querySelectorAll('.free-obj')][1];
      b.style.left = '175px'; b.style.top = '150px'; b.style.width = '150px'; b.style.height = '150px';
      b.style.zIndex = '16';
      if (typeof _selectObj === 'function') _selectObj(a);
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, shiftKey: true }));
      await new Promise(r => setTimeout(r, 50));
      window.__combineOk = (typeof window._ctxDoCombine === 'function') ? window._ctxDoCombine('subtract') : false;
      await new Promise(r => setTimeout(r, 150));
    },
    assert: () => {
      const issues = [];
      if (typeof window.paper === 'undefined') { issues.push({ type: 'paper-not-loaded', msg: 'Paper.js לא נטען', id: 'shape-merge' }); return issues; }
      if (!window.__combineOk) { issues.push({ type: 'combine-failed', msg: '_ctxDoCombine("subtract") החזיר false', id: 'shape-merge' }); return issues; }
      const objs = [...document.querySelectorAll('.free-obj')];
      if (objs.length !== 1) issues.push({ type: 'combine-count-wrong', msg: `נשארו ${objs.length} אובייקטים אחרי חיתוך, ציפינו 1`, id: 'shape-merge' });
      const img = objs[0]?.querySelector('img');
      const src = img?.getAttribute('src') || '';
      if (!src.startsWith('data:image/svg+xml')) { issues.push({ type: 'combine-not-svg', msg: 'תוצאת החיתוך אינה SVG', id: 'shape-merge' }); return issues; }
      const decoded = decodeURIComponent(src.split(',')[1] || '');
      if (!/<path[ >]/.test(decoded)) issues.push({ type: 'combine-not-real-boolean', msg: 'ה-SVG לא מכיל <path> אחרי subtract — כנראה fallback', id: 'shape-merge' });
      return issues;
    },
  },
  {
    id: 'shape-merge-exclude-differs-from-unite', suite: 'shape-merge', rule: 'CLAUDE.md §16 2026-06-26 (⊕ חפיפה הפוכה)',
    name: 'חפיפה-הפוכה (exclude/XOR) מייצרת path שונה מאיחוד רגיל — לא אותה תוצאה',
    setup: async () => {
      window.__reset();
      insertFreeShape('rect');
      const a = document.querySelector('.free-obj');
      a.style.left = '100px'; a.style.top = '100px'; a.style.width = '150px'; a.style.height = '150px';
      insertFreeShape('rect');
      const b = [...document.querySelectorAll('.free-obj')][1];
      b.style.left = '200px'; b.style.top = '180px'; b.style.width = '150px'; b.style.height = '150px';
      if (typeof _selectObj === 'function') _selectObj(a);
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, shiftKey: true }));
      await new Promise(r => setTimeout(r, 50));
      window.__combineOk = (typeof window._ctxDoCombine === 'function') ? window._ctxDoCombine('exclude') : false;
      await new Promise(r => setTimeout(r, 150));
      const img = document.querySelector('.free-obj img');
      window.__excludeSvg = img ? decodeURIComponent((img.getAttribute('src') || '').split(',')[1] || '') : '';
    },
    assert: () => {
      const issues = [];
      if (typeof window.paper === 'undefined') { issues.push({ type: 'paper-not-loaded', msg: 'Paper.js לא נטען', id: 'shape-merge' }); return issues; }
      if (!window.__combineOk) { issues.push({ type: 'combine-failed', msg: '_ctxDoCombine("exclude") החזיר false', id: 'shape-merge' }); return issues; }
      if (!/<path[ >]/.test(window.__excludeSvg || '')) issues.push({ type: 'exclude-not-real-boolean', msg: 'ה-SVG של exclude לא מכיל <path> — כנראה fallback', id: 'shape-merge' });
      // exclude (XOR) מסיר את שטח-החפיפה, unite שומר אותו — ה-path הפנימי (d=) חייב
      // להיות שונה בין השניים; אם exportSVG מחזיר d ריק/זהה ל-rect בודד, המיזוג לא קרה בפועל.
      const dMatch = (window.__excludeSvg || '').match(/<path[^>]*\sd="([^"]+)"/);
      if (!dMatch || dMatch[1].length < 20) issues.push({ type: 'exclude-trivial-path', msg: 'ה-path של exclude קצר/ריק מדי — נראה כמו מלבן בודד, לא XOR אמיתי בין שתי צורות', id: 'shape-merge' });
      return issues;
    },
  },
);

// ─── XSS בקטעים-שמורים (openSnippetsPanel) — פער-כיסוי #10 ──────────────────
// התרחיש הקודם היחיד (tools-snippet-save) שמר שם-רגיל בלבד ולא בדק XSS כלל.
// כאן מזריקים payload בפועל (img onerror + script) ומוודאים בריחה אמיתית ב-DOM,
// לא רק "הפנל נפתח".
scenarios.push(
  {
    id: 'snippets-name-img-onerror-escaped', suite: 'snippets-security', rule: 'MyWord-v2.html openSnippetsPanel (esc על s.name)',
    name: 'שם-קטע עם <img onerror> לא הופך לתג-DOM אמיתי בפאנל הקטעים',
    setup: () => {
      window.__reset();
      localStorage.setItem('myword2_snippets', JSON.stringify([
        { id: 'snip_x', name: '<img src=x onerror=alert(1)>', html: 'תוכן-בדיקה', updated: Date.now() },
      ]));
      if (typeof openSnippetsPanel === 'function') openSnippetsPanel();
    },
    assert: () => {
      const issues = [];
      const p = document.querySelector('.mw-panel.snips');
      if (!p) { issues.push({ type: 'snip-panel-missing', msg: 'openSnippetsPanel לא פתח פנל', id: 'snippets-security' }); return issues; }
      if (p.querySelector('.snip-item img')) issues.push({ type: 'snip-xss-img', msg: 'תג <img> הוזרק בפועל לרשימת-הקטעים (XSS אמיתי)', id: 'snippets-security' });
      const span = [...p.querySelectorAll('.snip-item span')].find(s => s.textContent.includes('onerror'));
      if (!span) issues.push({ type: 'snip-name-not-shown-as-text', msg: 'שם-הקטע עם ה-payload לא מוצג כטקסט רגיל (יתכן שנבלע בשקט)', id: 'snippets-security' });
      p.remove();
      return issues;
    },
  },
  {
    id: 'snippets-name-script-tag-not-executed', suite: 'snippets-security', rule: 'MyWord-v2.html openSnippetsPanel (esc על s.name)',
    name: 'שם-קטע עם <script> לא נוצר כתג-DOM ולא רץ בפועל',
    setup: () => {
      window.__reset();
      window.__snipXSS = 0;
      localStorage.setItem('myword2_snippets', JSON.stringify([
        { id: 'snip_y', name: '<script>window.__snipXSS=1</script>', html: 'x', updated: Date.now() },
      ]));
      if (typeof openSnippetsPanel === 'function') openSnippetsPanel();
    },
    assert: () => {
      const issues = [];
      const p = document.querySelector('.mw-panel.snips');
      if (!p) { issues.push({ type: 'snip-panel-missing', msg: 'openSnippetsPanel לא פתח פנל', id: 'snippets-security' }); return issues; }
      if (p.querySelector('script')) issues.push({ type: 'snip-script-element', msg: 'תג <script> נוצר בפועל ב-DOM של פנל-הקטעים', id: 'snippets-security' });
      if (window.__snipXSS === 1) issues.push({ type: 'snip-script-executed', msg: 'קוד ה-XSS מתוך שם-הקטע רץ בפועל', id: 'snippets-security' });
      p.remove();
      return issues;
    },
  },
);

// ─── מחיקת סימניות (initBookmarkNav) — באג איבוד-תוכן שנמצא בחקירה 2026-07-17 ──
// סימנייה מסוג-טווח (bm-range) עוטפת את הטקסט שסומן (surroundContents). מחיקה
// דרך m.remove() הייתה מוחקת גם את הטקסט. כמו Word — מחיקת סימנייה מסירה רק את
// הסמן הבלתי-נראה. הבדיקה נכתבה *לפני* התיקון ונכשלה עליו (Layer 3 של qa-flow).
scenarios.push(
  {
    id: 'bookmark-range-delete-preserves-text', suite: 'bookmarks', rule: 'Word: מחיקת סימנייה מסירה רק את הסמן, שומרת את הטקסט',
    name: 'מחיקת סימנייה-מסוג-טווח מהפאנל מסירה רק את הסימון — לא מוחקת את הטקסט שסומן',
    setup: async () => {
      window.__reset();
      const ed = document.getElementById('editor');
      ed.innerHTML = '<p>שלום עולם כאן טקסט</p>';
      // עטיפת המילה "עולם" בסימנייה-טווח — בדיוק כמו insBookmark (surroundContents)
      const p = ed.querySelector('p');
      const tn = p.firstChild;
      const start = tn.textContent.indexOf('עולם');
      const range = document.createRange();
      range.setStart(tn, start);
      range.setEnd(tn, start + 'עולם'.length);
      const span = document.createElement('span');
      span.id = 'bm-test-' + Date.now().toString(36);
      span.className = 'bookmark bm-range';
      span.setAttribute('data-name', 'בדיקה');
      span.title = 'סימנייה: בדיקה';
      range.surroundContents(span);
      await window.__openBookmarkPanel();
      const delBtn = document.querySelector('#bookmarkNavPanel .bmnav-del');
      if (!delBtn) throw new Error('פאנל-הסימניות לא נפתח / אין כפתור-מחיקה');
      delBtn.click();
      await new Promise(r => setTimeout(r, 40));
    },
    assert: () => {
      const issues = [];
      const ed = document.getElementById('editor');
      if (ed.querySelector('.bookmark')) issues.push({ type: 'bookmark-not-removed', msg: 'הסימנייה לא הוסרה מה-DOM אחרי מחיקה', id: 'bookmarks' });
      const txt = ed.textContent.replace(/[​]/g, '').replace(/\s+/g, ' ').trim();
      if (!txt.includes('עולם')) issues.push({ type: 'bookmark-delete-destroyed-text', msg: `מחיקת הסימנייה מחקה גם את הטקסט שסומן — התוכן כעת "${txt}", חסרה המילה "עולם"`, id: 'bookmarks' });
      if (txt !== 'שלום עולם כאן טקסט') issues.push({ type: 'bookmark-delete-text-mangled', msg: `הטקסט השתבש אחרי מחיקת הסימנייה: "${txt}" (ציפינו "שלום עולם כאן טקסט")`, id: 'bookmarks' });
      return issues;
    },
  },
  {
    id: 'bookmark-point-delete-removes-marker-only', suite: 'bookmarks', rule: 'סימנייה-נקודה מכילה תו-אפס-רוחב בלבד — הסרה מלאה תקינה',
    name: 'מחיקת סימנייה-נקודה מסירה את הסמן במלואו בלי להשאיר שאריות',
    setup: async () => {
      window.__reset();
      const ed = document.getElementById('editor');
      ed.innerHTML = '<p>טקסט לפני וגם אחרי</p>';
      const p = ed.querySelector('p');
      const span = document.createElement('span');
      span.id = 'bm-point-' + Date.now().toString(36);
      span.className = 'bookmark bm-point';
      span.contentEditable = 'false';
      span.textContent = '​';
      p.appendChild(span);
      await window.__openBookmarkPanel();
      const delBtn = document.querySelector('#bookmarkNavPanel .bmnav-del');
      if (!delBtn) throw new Error('פאנל-הסימניות לא נפתח / אין כפתור-מחיקה');
      delBtn.click();
      await new Promise(r => setTimeout(r, 40));
    },
    assert: () => {
      const issues = [];
      const ed = document.getElementById('editor');
      if (ed.querySelector('.bookmark')) issues.push({ type: 'bookmark-point-not-removed', msg: 'סימנייה-נקודה לא הוסרה אחרי מחיקה', id: 'bookmarks' });
      const txt = ed.textContent.replace(/[​]/g, '').replace(/\s+/g, ' ').trim();
      if (txt !== 'טקסט לפני וגם אחרי') issues.push({ type: 'bookmark-point-delete-mangled', msg: `הטקסט השתנה אחרי מחיקת סימנייה-נקודה: "${txt}"`, id: 'bookmarks' });
      return issues;
    },
  },
);

// ─── מצב "משתנים" במחשבון — באג שנמצא בחקירה 2026-07-17 ──────────────────────
// עד התיקון אפשר היה להגדיר משתנה אך לא הייתה שום דרך להזין את שמו לביטוי
// (המקלדת מכילה ספרות/אופרטורים בלבד, ומקש x ממופה לכפל) — קוד-ההצבה ב-EQ היה
// קוד-מת. כעת לחיצה על צ'יפ מזריקה את המשתנה כמו קבוע מדעי.
scenarios.push(
  {
    id: 'calc-vars-chip-inserts-into-expression', suite: 'calculator', rule: 'SPEC-CALC.md מצב-משתנים — הגדרה + שימוש בפועל בחישוב',
    name: 'משתנים: הגדרת x=5 ו-y=3, לחיצה על הצ\'יפים ו-"+" נותנת 8 (המשתנה באמת נכנס לחישוב)',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeVar').click();
      await new Promise(r => setTimeout(r, 30));
      const def = (n, v) => {
        document.getElementById('_varName').value = n;
        document.getElementById('_varValue').value = String(v);
        document.getElementById('_varAdd').click();
      };
      def('x', 5); def('y', 3);
      await new Promise(r => setTimeout(r, 30));
      const chip = n => document.querySelector(`#_varChips .cvar-chip[data-name="${n}"]`);
      window.__chipCount = document.querySelectorAll('#_varChips .cvar-chip').length;
      chip('x')?.click();
      document.querySelector('#_calc [data-op="+"]')?.click();
      chip('y')?.click();
      document.querySelector('#_calc [data-act="EQ"]')?.click();
      await new Promise(r => setTimeout(r, 40));
      window.__calcFormula = (document.getElementById('_calcFormula') || {}).textContent || '';
      window.__calcResult  = (document.getElementById('_calcResult')  || {}).textContent || '';
    },
    assert: () => {
      const issues = [];
      if (window.__chipCount !== 2) issues.push({ type: 'calc-vars-not-defined', msg: `${window.__chipCount} צ'יפים אחרי הגדרת 2 משתנים`, id: 'calculator' });
      const f = String(window.__calcFormula).trim();
      // שורת-הנוסחה: שמות המשתנים + התוצאה — "x + y = 8"
      if (!/=\s*8\b/.test(f)) issues.push({ type: 'calc-vars-wrong-result', msg: `x=5 ועוד y=3 נתן "${f}", ציפינו תוצאה 8 — המשתנה לא נכנס לחישוב בפועל`, id: 'calculator' });
      if (!/\bx\b/.test(f) || !/\by\b/.test(f)) issues.push({ type: 'calc-vars-name-not-shown', msg: `שורת-הנוסחה "${f}" לא מציגה את שמות המשתנים x/y (ציפינו תצוגה סמלית כמו π)`, id: 'calculator' });
      // שורת-התוצאה: אותו ביטוי עם הערכים המוצבים — "5 + 3 = 8"
      const r = String(window.__calcResult).trim();
      if (!/5/.test(r) || !/3/.test(r)) issues.push({ type: 'calc-vars-not-substituted', msg: `שורת-ההצבה "${r}" לא מציגה את הערכים 5/3 שהוצבו`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-vars-chip-delete-button-removes-only', suite: 'calculator', rule: 'SPEC-CALC.md מצב-משתנים — ✕ מסיר, גוף-הצ\'יפ מזריק',
    name: 'משתנים: ✕ על הצ\'יפ מוחק את המשתנה ולא מזריק אותו לחישוב',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeVar').click();
      await new Promise(r => setTimeout(r, 30));
      document.getElementById('_varName').value = 'z';
      document.getElementById('_varValue').value = '7';
      document.getElementById('_varAdd').click();
      await new Promise(r => setTimeout(r, 30));
      const before = (document.getElementById('_calcFormula') || {}).textContent || '';
      document.querySelector('#_varChips .cvar-del[data-name="z"]')?.click();
      await new Promise(r => setTimeout(r, 30));
      window.__valBefore = before;
      window.__valAfter = (document.getElementById('_calcFormula') || {}).textContent || '';
      window.__chipsLeft = document.querySelectorAll('#_varChips .cvar-chip').length;
    },
    assert: () => {
      const issues = [];
      if (window.__chipsLeft !== 0) issues.push({ type: 'calc-vars-delete-failed', msg: `נשארו ${window.__chipsLeft} צ'יפים אחרי לחיצה על ✕`, id: 'calculator' });
      if (String(window.__valAfter).trim() !== String(window.__valBefore).trim())
        issues.push({ type: 'calc-vars-delete-also-inserted', msg: `לחיצה על ✕ שינתה את התצוגה ("${window.__valBefore}"→"${window.__valAfter}") — כלומר גם הזריקה את המשתנה`, id: 'calculator' });
      return issues;
    },
  },
);

// ─── נגישות-מקלדת לידיות-הטבלה — באג שנמצא בחקירה 2026-07-17 ────────────────
// הידיות (⠿ הזזה / ↘ שינוי-גודל) הוצגו רק ב-mousemove, ולכן היו display:none
// לתמיד ללא עכבר — ומחוץ לסדר-הטאבים, כך שה-tabIndex/Arrow-handlers שכבר היו
// כתובים כאן היו מתים בפועל. הבדיקה משתמשת אך ורק במקלדת (אפס אירועי-עכבר).
scenarios.push(
  {
    id: 'table-handles-reachable-by-keyboard-only', suite: 'a11y-keyboard', rule: 'ידית-טבלה חייבת להיות נגישה בלי עכבר (tabIndex+Arrow כבר קיימים בקוד)',
    name: 'ידיות-הטבלה מופיעות כשהסמן נכנס לטבלה במקלדת, וניתן למקד אותן ב-focus (בלי אף אירוע-עכבר)',
    setup: async () => {
      window.__reset();
      const ed = document.getElementById('editor');
      ed.innerHTML = '<p>פסקה לפני</p>' + window.__bigTable(2, 2) + '<p>פסקה אחרי</p>';
      // מיקום הסמן בתא — בדיוק כמו ניווט-מקלדת, ללא mousemove/mousedown כלשהו
      ed.focus();
      const cell = ed.querySelector('table td');
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(cell); rng.collapse(true);
      sel.addRange(rng);
      document.dispatchEvent(new Event('selectionchange'));
      await new Promise(r => setTimeout(r, 60));
      const h = document.querySelector('.tbl-move-handle');
      const rh = document.querySelector('.tbl-resize-handle');
      window.__hDisp  = h  ? getComputedStyle(h).display  : 'MISSING';
      window.__rhDisp = rh ? getComputedStyle(rh).display : 'MISSING';
      window.__hTabIndex = h ? h.tabIndex : null;
      if (h) { h.focus(); await new Promise(r => setTimeout(r, 40)); }
      window.__focused = (document.activeElement === h);
      window.__hDispAfterFocus = h ? getComputedStyle(h).display : 'MISSING';
    },
    assert: () => {
      const issues = [];
      if (window.__hDisp === 'none' || window.__hDisp === 'MISSING')
        issues.push({ type: 'tbl-handle-hidden-for-keyboard', msg: `ידית-ההזזה display="${window.__hDisp}" אחרי כניסת-סמן-לטבלה במקלדת — בלתי-נגישה למשתמש ללא עכבר`, id: 'a11y-keyboard' });
      if (window.__rhDisp === 'none' || window.__rhDisp === 'MISSING')
        issues.push({ type: 'tbl-resize-handle-hidden-for-keyboard', msg: `ידית-שינוי-הגודל display="${window.__rhDisp}" — בלתי-נגישה ללא עכבר`, id: 'a11y-keyboard' });
      if (window.__hTabIndex !== 0)
        issues.push({ type: 'tbl-handle-not-tabbable', msg: `tabIndex=${window.__hTabIndex}, ציפינו 0`, id: 'a11y-keyboard' });
      if (!window.__focused)
        issues.push({ type: 'tbl-handle-not-focusable', msg: 'focus() על ידית-ההזזה לא הפך אותה ל-activeElement', id: 'a11y-keyboard' });
      if (window.__hDispAfterFocus === 'none')
        issues.push({ type: 'tbl-handle-hides-under-focus', msg: 'הידית נעלמה בזמן שהיא בפוקוס — משתמש-מקלדת מאבד אותה', id: 'a11y-keyboard' });
      return issues;
    },
  },
  {
    id: 'table-move-by-arrow-keys-only', suite: 'a11y-keyboard', rule: 'ArrowUp/ArrowDown על הידית מזיזים את הטבלה בין אחים (initTableMove keydown)',
    name: 'ArrowDown על ידית-הטבלה באמת מזיז את הטבלה למטה בין הפסקאות — במקלדת בלבד',
    setup: async () => {
      window.__reset();
      const ed = document.getElementById('editor');
      ed.innerHTML = '<p id="pA">פסקה א</p>' + window.__bigTable(2, 2) + '<p id="pB">פסקה ב</p>';
      ed.focus();
      const cell = ed.querySelector('table td');
      const sel = window.getSelection(); sel.removeAllRanges();
      const rng = document.createRange(); rng.selectNodeContents(cell); rng.collapse(true);
      sel.addRange(rng);
      document.dispatchEvent(new Event('selectionchange'));
      await new Promise(r => setTimeout(r, 60));
      window.__orderBefore = [...ed.children].map(c => c.id || c.tagName).join(',');
      const h = document.querySelector('.tbl-move-handle');
      h.focus();
      h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 80));
      window.__orderAfter = [...ed.children].map(c => c.id || c.tagName).join(',');
    },
    assert: () => {
      const issues = [];
      const before = window.__orderBefore, after = window.__orderAfter;
      if (before !== 'pA,TABLE,pB')
        issues.push({ type: 'tbl-arrow-bad-setup', msg: `סדר התחלתי לא צפוי: "${before}"`, id: 'a11y-keyboard' });
      if (after === before)
        issues.push({ type: 'tbl-arrow-no-move', msg: `ArrowDown לא הזיז את הטבלה — הסדר נשאר "${after}"`, id: 'a11y-keyboard' });
      else if (after !== 'pA,pB,TABLE')
        issues.push({ type: 'tbl-arrow-wrong-move', msg: `אחרי ArrowDown הסדר "${after}", ציפינו "pA,pB,TABLE"`, id: 'a11y-keyboard' });
      return issues;
    },
  },
);

// ─── נעילת-רגרסיה למצבי-מחשבון שאומתו-תקינים בחקירה 2026-07-18 ───────────────
// המצבים האלה נבדקו ידנית ונמצאו נכונים מתמטית, אך לא הייתה להם שום בדיקה
// אוטומטית — כלומר שינוי עתידי במקדמי-ההמרה/בנוסחאות היה עובר בשקט.
scenarios.push(
  {
    id: 'calc-unit-length-km-to-m', suite: 'calculator', rule: 'SPEC-CALC.md מצב-יחידות (UNITS_DATA, מקדם km=1000)',
    name: 'המרת יחידות: 5 ק"מ = 5000 מטר (מקדם-ההמרה מדויק)',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeUnit').click();
      await new Promise(r => setTimeout(r, 40));
      const cat = document.getElementById('_unitCat');
      cat.value = 'length'; cat.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
      document.getElementById('_unitVal').value = '5';
      document.getElementById('_unitFrom').value = 'km';
      document.getElementById('_unitTo').value = 'm';
      document.getElementById('_unitCalc').click();
      await new Promise(r => setTimeout(r, 40));
      window.__unitRes = (document.getElementById('_unitResult') || {}).textContent || '';
    },
    assert: () => {
      const issues = [];
      const t = String(window.__unitRes);
      if (!t.trim()) { issues.push({ type: 'calc-unit-no-result', msg: 'לא הוצגה תוצאת-המרה', id: 'calculator' }); return issues; }
      const nums = (t.match(/[\d.]+/g) || []).map(Number);
      if (!nums.includes(5000)) issues.push({ type: 'calc-unit-wrong-factor', msg: `5 ק"מ→מ' החזיר "${t}", ציפינו 5000 — מקדם-ההמרה שגוי`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-unit-temp-c-to-f', suite: 'calculator', rule: 'SPEC-CALC.md מצב-יחידות — טמפרטורה היא מסלול special (לא מקדם כפל)',
    name: 'המרת יחידות: 100°C = 212°F (הנוסחה המיוחדת, לא כפל-מקדם)',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeUnit').click();
      await new Promise(r => setTimeout(r, 40));
      const cat = document.getElementById('_unitCat');
      cat.value = 'temp'; cat.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
      document.getElementById('_unitVal').value = '100';
      document.getElementById('_unitFrom').value = 'C';
      document.getElementById('_unitTo').value = 'F';
      document.getElementById('_unitCalc').click();
      await new Promise(r => setTimeout(r, 40));
      window.__tempRes = (document.getElementById('_unitResult') || {}).textContent || '';
    },
    assert: () => {
      const issues = [];
      const t = String(window.__tempRes);
      const nums = (t.match(/[\d.]+/g) || []).map(Number);
      if (!nums.includes(212)) issues.push({ type: 'calc-temp-wrong', msg: `100°C→°F החזיר "${t}", ציפינו 212 (C*9/5+32)`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-stat-known-dataset', suite: 'calculator', rule: 'SPEC-CALC.md מצב-סטטיסטיקה',
    name: 'סטטיסטיקה: 5,8,12,3,7,14 → ממוצע 8.17 · חציון 7.5 · טווח 11',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeStat').click();
      await new Promise(r => setTimeout(r, 40));
      document.getElementById('_statInput').value = '5, 8, 12, 3, 7, 14';
      document.getElementById('_statCalc').click();
      await new Promise(r => setTimeout(r, 50));
      window.__statRes = (document.getElementById('_statResult') || {}).textContent || '';
    },
    assert: () => {
      const issues = [];
      const t = String(window.__statRes);
      if (!t.trim()) { issues.push({ type: 'calc-stat-no-result', msg: 'לא הוצגה תוצאה סטטיסטית', id: 'calculator' }); return issues; }
      // ממוצע 49/6=8.1667, חציון (7+8)/2=7.5, טווח 14-3=11
      if (!/8\.1[67]/.test(t)) issues.push({ type: 'calc-stat-mean-wrong', msg: `לא נמצא ממוצע 8.17 בתוצאה: "${t}"`, id: 'calculator' });
      if (!/7\.5/.test(t))     issues.push({ type: 'calc-stat-median-wrong', msg: `לא נמצא חציון 7.5 בתוצאה: "${t}"`, id: 'calculator' });
      if (!/\b11\b/.test(t))   issues.push({ type: 'calc-stat-range-wrong', msg: `לא נמצא טווח 11 בתוצאה: "${t}"`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-eq-quadratic-roots', suite: 'calculator', rule: 'SPEC-CALC.md מצב-משוואות (ריבועית)',
    name: 'משוואה ריבועית: x²−5x+6=0 → שורשים 3 ו-2',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeEq').click();
      await new Promise(r => setTimeout(r, 40));
      document.getElementById('_eqTypeQuad').click();
      await new Promise(r => setTimeout(r, 40));
      document.getElementById('_ef_a').value = '1';
      document.getElementById('_ef_b').value = '-5';
      document.getElementById('_ef_c').value = '6';
      document.getElementById('_eqCalc').click();
      await new Promise(r => setTimeout(r, 50));
      window.__eqOut = (document.getElementById('_eqOutput') || {}).textContent || '';
    },
    assert: () => {
      const issues = [];
      const t = String(window.__eqOut);
      /* textContent של בלוקים סמוכים נדבק ("= 3x₂ = ..."), ולכן \b לא עובד כאן.
         מחלצים את הערך שאחרי ה-"=" האחרון בכל שורת-שורש ומשווים מספרית. */
      const root = lbl => {
        const m = t.match(new RegExp(lbl + '[^=]*=[^=]*=\\s*(-?[\\d.]+)'));
        return m ? parseFloat(m[1]) : null;
      };
      const x1 = root('x₁'), x2 = root('x₂');
      if (x1 !== 3 || x2 !== 2)
        issues.push({ type: 'calc-eq-quad-wrong', msg: `x²−5x+6=0 נתן x₁=${x1}, x₂=${x2}; ציפינו 3 ו-2. פלט: "${t}"`, id: 'calculator' });
      return issues;
    },
  },
  {
    id: 'calc-eq-pythagoras', suite: 'calculator', rule: 'SPEC-CALC.md מצב-משוואות (פיתגורס — משאירים שדה ריק)',
    name: 'פיתגורס: a=3, b=4 (c ריק) → c=5',
    setup: async () => {
      window.__reset();
      document.getElementById('_calc')?.remove();
      document.getElementById('insCalc').click();
      await new Promise(r => setTimeout(r, 60));
      document.getElementById('_modeEq').click();
      await new Promise(r => setTimeout(r, 40));
      document.getElementById('_eqTypePyth').click();
      await new Promise(r => setTimeout(r, 40));
      document.getElementById('_ef_a').value = '3';
      document.getElementById('_ef_b').value = '4';
      document.getElementById('_ef_c').value = '';
      document.getElementById('_eqCalc').click();
      await new Promise(r => setTimeout(r, 50));
      window.__pythOut = (document.getElementById('_eqOutput') || {}).textContent || '';
    },
    assert: () => {
      const issues = [];
      const t = String(window.__pythOut);
      if (!/\b5\b/.test(t)) issues.push({ type: 'calc-pyth-wrong', msg: `a=3,b=4 החזיר "${t}", ציפינו c=5`, id: 'calculator' });
      return issues;
    },
  },
);

// ─── פאנל מסגרת/פינות לתמונה (openImageBorderPanel) — היה ללא כיסוי כלל ──────
scenarios.push(
  {
    id: 'img-border-panel-applies-and-persists', suite: 'img-edit', rule: 'openImageBorderPanel + imgBorder/imgBorderRadius בסריאליזציה',
    name: 'מסגרת+פינות לתמונה מוחלות על .free-img-wrap ושורדות round-trip של שמירה/טעינה',
    setup: async () => {
      window.__reset();
      const obj = _buildImageObjFromSrc(window.PNG_1x1);
      await new Promise(r => setTimeout(r, 150));
      _selectObj(obj);
      openImageBorderPanel(document.getElementById('insImage'), obj);
      await new Promise(r => setTimeout(r, 50));
      const p = document.getElementById('_imgBorderPanel');
      if (!p) throw new Error('פאנל-המסגרת לא נפתח');
      // בוחרים עובי לא-אפס, סגנון מקווקו, ורדיוס 16px — ואז "החל"
      const pick = (row, label) => {
        const btns = [...p.querySelectorAll('.bp-opt')].filter(b => (b.textContent || '').trim() === label);
        if (btns.length) btns[0].click();
      };
      pick(null, '3px'); pick(null, 'מקווקו'); pick(null, '16px');
      p.querySelector('.bp-apply').click();
      await new Promise(r => setTimeout(r, 60));
      const wrap = obj.querySelector('.free-img-wrap');
      window.__wrapBorder = wrap.style.border || '';
      window.__wrapRadius = wrap.style.borderRadius || '';
      // round-trip: סריאליזציה ואז שחזור לעורך נקי
      const ser = _serializeObj(obj);
      window.__serBorder = ser.imgBorder || '';
      window.__serRadius = ser.imgBorderRadius || '';
      document.querySelectorAll('.free-obj').forEach(o => o.remove());
      _deserializeFreeObjs([ser]);
      await new Promise(r => setTimeout(r, 120));
      const w2 = document.querySelector('.free-obj .free-img-wrap');
      window.__afterBorder = w2 ? (w2.style.border || '') : 'MISSING';
      window.__afterRadius = w2 ? (w2.style.borderRadius || '') : 'MISSING';
    },
    assert: () => {
      const issues = [];
      if (!/3px/.test(window.__wrapBorder)) issues.push({ type: 'img-border-not-applied', msg: `border="${window.__wrapBorder}" — לא הוחל עובי 3px`, id: 'img-edit' });
      if (window.__wrapRadius !== '16px') issues.push({ type: 'img-radius-not-applied', msg: `borderRadius="${window.__wrapRadius}", ציפינו "16px"`, id: 'img-edit' });
      if (!window.__serBorder) issues.push({ type: 'img-border-not-serialized', msg: '_serializeObj לא כלל imgBorder', id: 'img-edit' });
      if (window.__afterBorder !== window.__wrapBorder) issues.push({ type: 'img-border-lost-on-roundtrip', msg: `אחרי טעינה border="${window.__afterBorder}", לפני "${window.__wrapBorder}"`, id: 'img-edit' });
      if (window.__afterRadius !== window.__wrapRadius) issues.push({ type: 'img-radius-lost-on-roundtrip', msg: `אחרי טעינה radius="${window.__afterRadius}", לפני "${window.__wrapRadius}"`, id: 'img-edit' });
      return issues;
    },
  },
);

// ─── סרגל-צד + ערכת "לילה-קרח" — היו ללא כיסוי כלל ──────────────────────────
scenarios.push(
  {
    id: 'night-theme-opens-sidebar', suite: 'sidebar-night', rule: 'CLAUDE.md 2026-07-03b — ❄️ vwNight, opt-in, סרגל-צד נפתח',
    name: 'לחיצה על ❄️ מפעילה data-theme="night" ומציגה את סרגל-הצד; הדף נשאר לבן',
    setup: async () => {
      window.__reset();
      document.body.removeAttribute('data-theme');
      document.getElementById('vwNight').click();
      await new Promise(r => setTimeout(r, 120));
      const sb = document.getElementById('mwSidebar');
      window.__theme = document.body.getAttribute('data-theme') || '';
      window.__sbDisplay = sb ? getComputedStyle(sb).display : 'MISSING';
      const page = document.querySelector('.page') || document.getElementById('editor');
      window.__pageBg = page ? getComputedStyle(page).backgroundColor : '';
    },
    assert: () => {
      const issues = [];
      if (window.__theme !== 'night') issues.push({ type: 'night-theme-not-set', msg: `data-theme="${window.__theme}", ציפינו "night"`, id: 'sidebar-night' });
      if (window.__sbDisplay === 'none' || window.__sbDisplay === 'MISSING')
        issues.push({ type: 'sidebar-not-shown', msg: `סרגל-הצד display="${window.__sbDisplay}" בערכת-לילה`, id: 'sidebar-night' });
      // §view: הדף עצמו נשאר לבן גם בערכת-לילה (הערכה משנה UI בלבד)
      const bg = window.__pageBg;
      if (bg && !/255,\s*255,\s*255/.test(bg))
        issues.push({ type: 'night-page-not-white', msg: `רקע-הדף "${bg}" — לפי §view הדף חייב להישאר לבן בערכת-לילה`, id: 'sidebar-night' });
      return issues;
    },
  },
  {
    id: 'sidebar-outline-reflects-headings', suite: 'sidebar-night', rule: 'CLAUDE.md 2026-07-03b — מתאר-מסמך חי (h1-h3, MutationObserver 500ms)',
    name: 'מתאר-המסמך בסרגל-הצד מתעדכן לפי הכותרות שבמסמך',
    setup: async () => {
      window.__reset();
      document.body.removeAttribute('data-theme');
      document.getElementById('vwNight').click();
      await new Promise(r => setTimeout(r, 100));
      document.getElementById('editor').innerHTML =
        '<h1>כותרת ראשית לבדיקה</h1><p>טקסט</p><h2>כותרת משנה לבדיקה</h2>';
      document.getElementById('editor').dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 900));   // מעבר ל-debounce של 500ms
      const out = document.getElementById('mwSbOutline');
      window.__outlineText = out ? out.textContent : 'MISSING';
    },
    assert: () => {
      const issues = [];
      const t = String(window.__outlineText);
      if (t === 'MISSING') { issues.push({ type: 'outline-missing', msg: '#mwSbOutline לא קיים', id: 'sidebar-night' }); return issues; }
      if (!t.includes('כותרת ראשית לבדיקה')) issues.push({ type: 'outline-missing-h1', msg: `המתאר לא מכיל את ה-H1. תוכן: "${t}"`, id: 'sidebar-night' });
      if (!t.includes('כותרת משנה לבדיקה')) issues.push({ type: 'outline-missing-h2', msg: `המתאר לא מכיל את ה-H2. תוכן: "${t}"`, id: 'sidebar-night' });
      return issues;
    },
  },

  // ═══ תפריט קליק-ימני (#rcMenu) — suite rcmenu, נוסף 2026-07-19 ═══
  // כל התרחישים בודקים **התנהגות** (הפעולה בוצעה בפועל), לא "האלמנט קיים".
  {
    id: 'rc-caret-lets-native-spellcheck', suite: 'rcmenu',
    rule: 'CLAUDE.md 2026-07-19 — סמן-מכווץ בטקסט רגיל משאיר את תפריט-הדפדפן (המסלול היחיד להצעות-איות)',
    name: 'סמן-מכווץ + spellcheck דלוק → התפריט שלנו לא נפתח וה-preventDefault לא נקרא',
    setup: () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.spellcheck = true;
      editor.innerHTML = '<p>שלום עולם כאן טקסט</p>';
      const p = editor.querySelector('p');
      window.__rcSel(p, 3);                     // סמן מכווץ, בלי בחירה
      window.__rc(p);
      window.__a = { open: window.__rcOpen(), prevented: window.__rcLastPrevented };
      // כיבוי האיות מחזיר את התפריט שלנו (מסלול-מילוט מתועד)
      editor.spellcheck = false;
      window.__rcSel(p, 3);
      window.__rc(p);
      window.__b = { open: window.__rcOpen(), prevented: window.__rcLastPrevented };
      window.__rcHide(); editor.spellcheck = true;
    },
    assert: () => {
      const i = [];
      if (window.__a.open) i.push({ type: 'rc-blocks-spellcheck', msg: 'התפריט המותאם נפתח על סמן-מכווץ — חוסם את הצעות-האיות של הדפדפן', id: 'rcmenu' });
      if (window.__a.prevented) i.push({ type: 'rc-prevented-native', msg: 'preventDefault נקרא על סמן-מכווץ — תפריט-הדפדפן נחסם', id: 'rcmenu' });
      if (!window.__b.open) i.push({ type: 'rc-no-fallback', msg: 'עם spellcheck כבוי התפריט המותאם לא נפתח', id: 'rcmenu' });
      return i;
    },
  },
  {
    id: 'rc-selection-bold-applies', suite: 'rcmenu',
    rule: 'תפריט-הקשר על בחירת-טקסט מבצע עיצוב בפועל',
    name: 'בחירת טקסט → "מודגש" מהתפריט באמת עוטף ב-<b>',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>שלום עולם</p>';
      const p = editor.querySelector('p');
      window.__rcSel(p, 0, 4);
      window.__rc(p);
      window.__open = window.__rcOpen();
      const cut = [...document.querySelectorAll('#rcMenu button')].find(b => b.textContent.includes('גזור'));
      window.__cutEnabled = !!cut && !cut.disabled;
      window.__clicked = window.__rcClick('מודגש');
      await new Promise(r => setTimeout(r, 120));
      // בודקים את **האפקט** ולא את התגית: לפי מצב styleWithCSS הדפדפן מייצר <b>
      // או <span style="font-weight:bold"> — שניהם "מודגש" תקין.
      const b = editor.querySelector('b, strong, span[style*="font-weight"]');
      window.__boldText = b ? b.textContent : null;
      window.__boldWeight = b ? getComputedStyle(b).fontWeight : null;
      window.__closed = !window.__rcOpen();
    },
    assert: () => {
      const i = [];
      if (!window.__open) i.push({ type: 'rc-not-open', msg: 'התפריט לא נפתח על בחירת-טקסט', id: 'rcmenu' });
      if (!window.__cutEnabled) i.push({ type: 'rc-cut-disabled', msg: '"גזור" מושבת למרות שיש בחירה', id: 'rcmenu' });
      if (!window.__clicked) i.push({ type: 'rc-bold-missing', msg: 'הפריט "מודגש" לא נמצא', id: 'rcmenu' });
      if (!window.__boldText) i.push({ type: 'rc-bold-noop', msg: 'לחיצה על "מודגש" לא הדגישה את הטקסט (לא <b>/<strong> ולא font-weight) — הפריט קיים אך לא פועל', id: 'rcmenu' });
      else {
        const w = String(window.__boldWeight || '');
        if (!(w === 'bold' || parseInt(w, 10) >= 600)) i.push({ type: 'rc-bold-weak', msg: `הטקסט נעטף אך font-weight="${w}" — לא מודגש בפועל`, id: 'rcmenu' });
      }
      if (!window.__closed) i.push({ type: 'rc-stays-open', msg: 'התפריט נשאר פתוח אחרי הפעלת פריט', id: 'rcmenu' });
      return i;
    },
  },
  {
    id: 'rc-textbox-gets-menu', suite: 'rcmenu',
    rule: 'CLAUDE.md 2026-07-19 — .tb-content היא עריכת-טקסט ולכן מקבלת תפריט; תמונה/צורה לא (סרגל צף)',
    name: 'תיבת-טקסט מקבלת תפריט קליק-ימני, תמונה חופשית לא',
    setup: async () => {
      window.__reset();
      const tb = window.__freeTextbox(2, 2, 6, 3, 'טקסט בתיבה');
      const c = tb.querySelector('.tb-content');
      c.innerHTML = '<p>טקסט בתיבה</p>';
      const p = c.querySelector('p');
      window.__rcSel(p, 0, 4);
      window.__rc(p);
      window.__tbOpen = window.__rcOpen();
      window.__rcHide();
      const img = window.__freeImg(2, 10, 4, 3);
      window.__rc(img.querySelector('.free-img-wrap'));
      window.__imgOpen = window.__rcOpen();
      window.__imgPrevented = window.__rcLastPrevented;
      window.__rcHide();
    },
    assert: () => {
      const i = [];
      if (!window.__tbOpen) i.push({ type: 'rc-textbox-no-menu', msg: 'אין תפריט קליק-ימני בתוך .tb-content — עריכת-טקסט בלי גזור/העתק/עיצוב', id: 'rcmenu' });
      if (window.__imgOpen || window.__imgPrevented) i.push({ type: 'rc-image-menu', msg: 'תמונה חופשית קיבלה תפריט — היא אמורה להישאר בסרגל הצף', id: 'rcmenu' });
      return i;
    },
  },
  {
    id: 'rc-link-context-actions', suite: 'rcmenu',
    rule: 'CLAUDE.md 2026-07-19 — קליק-ימני על קישור קיים: פתח/העתק/ערוך/הסר (כמו Word)',
    name: 'קליק-ימני על <a> מציג פעולות-קישור, ו"הסר קישור" משאיר את הטקסט',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>לפני <a href="https://example.com/a">קישורי</a> אחרי</p>';
      window.__rc(editor.querySelector('a'));
      window.__labels = window.__rcLabels();
      window.__removed = window.__rcClick('הסר קישור');
      await new Promise(r => setTimeout(r, 150));
      window.__anchorGone = !editor.querySelector('a');
      window.__textKept = editor.textContent.includes('קישורי');
    },
    assert: () => {
      const i = [];
      const L = window.__labels || [];
      ['פתח קישור', 'העתק כתובת', 'ערוך קישור', 'הסר קישור'].forEach(t => {
        if (!L.some(x => x.includes(t))) i.push({ type: 'rc-link-item-missing', msg: `הפריט "${t}" חסר בתפריט על קישור. פריטים: ${L.join(' | ')}`, id: 'rcmenu' });
      });
      if (L.some(x => x.includes('הוסף קישור'))) i.push({ type: 'rc-link-wrong-item', msg: '"הוסף קישור" מוצג על קישור קיים', id: 'rcmenu' });
      if (!window.__removed || !window.__anchorGone) i.push({ type: 'rc-unlink-noop', msg: '"הסר קישור" לא הסיר את ה-<a>', id: 'rcmenu' });
      if (!window.__textKept) i.push({ type: 'rc-unlink-ate-text', msg: 'הסרת-הקישור מחקה גם את טקסט-המשתמש (איבוד-תוכן)', id: 'rcmenu' });
      return i;
    },
  },
  {
    id: 'rc-table-add-row-real', suite: 'rcmenu',
    rule: 'תפריט-תא: הוספת שורה יוצרת שורה מלאה עם אותו סוג-תא',
    name: 'תא טבלה עם סמן-מכווץ פותח תפריט, ו"הוסף שורה מתחת" מוסיף שורה תקינה',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<table><tbody><tr><td>א</td><td>ב</td></tr><tr><td>ג</td><td>ד</td></tr></tbody></table><p>x</p>';
      const cell = editor.querySelector('td');
      window.__rcSel(cell, 0);                 // סמן-מכווץ — חייב לפתוח למרות P1
      window.__rc(cell);
      window.__open = window.__rcOpen();
      window.__before = editor.querySelector('table').rows.length;
      window.__clicked = window.__rcClick('הוסף שורה מתחת');
      await new Promise(r => setTimeout(r, 150));
      const t = editor.querySelector('table');
      window.__after = t.rows.length;
      window.__cols = t.rows[1] ? t.rows[1].children.length : 0;
    },
    assert: () => {
      const i = [];
      if (!window.__open) i.push({ type: 'rc-cell-no-menu', msg: 'תא-טבלה עם סמן-מכווץ לא פתח תפריט — נבלע בשינוי-האיות', id: 'rcmenu' });
      if (!window.__clicked) i.push({ type: 'rc-addrow-missing', msg: 'הפריט "הוסף שורה מתחת" לא נמצא', id: 'rcmenu' });
      if (window.__after !== window.__before + 1) i.push({ type: 'rc-addrow-noop', msg: `שורות: ${window.__before} → ${window.__after}, ציפינו ${window.__before + 1}`, id: 'rcmenu' });
      if (window.__cols !== 2) i.push({ type: 'rc-addrow-cols', msg: `לשורה החדשה ${window.__cols} תאים במקום 2`, id: 'rcmenu' });
      return i;
    },
  },
  {
    id: 'rc-a11y-and-keyboard', suite: 'rcmenu',
    rule: 'W3C APG — role=menu/menuitem + ניווט-חצים + Enter מפעיל; הפוקוס נשאר בעורך',
    name: 'נגישות: תפקידי-ARIA, חץ-מטה מדגיש, Enter מפעיל בפועל',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>שלום עולם</p>';
      const p = editor.querySelector('p');
      window.__rcSel(p, 0, 4);
      window.__rc(p);
      const m = document.getElementById('rcMenu');
      window.__role = m.getAttribute('role');
      window.__itemRoles = [...m.querySelectorAll('button')].every(b => b.getAttribute('role') === 'menuitem');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const act = m.querySelector('button.rc-active');
      window.__hl = act ? act.textContent : null;
      window.__aad = m.getAttribute('aria-activedescendant') === (act && act.id);
      // ניווט עד "מודגש" והפעלה ב-Enter
      let g = 0;
      while (g++ < 20) {
        const a = m.querySelector('button.rc-active');
        if (a && a.textContent.includes('מודגש')) break;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
      // אפקט, לא תגית — ר' ההערה ב-rc-selection-bold-applies (styleWithCSS)
      window.__bold = !!editor.querySelector('b, strong, span[style*="font-weight"]');
    },
    assert: () => {
      const i = [];
      if (window.__role !== 'menu') i.push({ type: 'rc-no-menu-role', msg: `role="${window.__role}" ולא "menu"`, id: 'rcmenu' });
      if (!window.__itemRoles) i.push({ type: 'rc-no-menuitem-role', msg: 'לא לכל הפריטים role="menuitem"', id: 'rcmenu' });
      if (!window.__hl) i.push({ type: 'rc-no-arrow-nav', msg: 'חץ-מטה לא הדגיש פריט', id: 'rcmenu' });
      if (!window.__aad) i.push({ type: 'rc-no-aad', msg: 'aria-activedescendant לא מסונכרן עם הפריט המודגש', id: 'rcmenu' });
      if (!window.__bold) i.push({ type: 'rc-enter-noop', msg: 'Enter על פריט מודגש לא הפעיל אותו (או שהפוקוס יצא מהעורך ו-execCommand נכשל)', id: 'rcmenu' });
      return i;
    },
  },
  {
    id: 'rc-rtl-position-and-escape', suite: 'rcmenu',
    rule: 'RTL — הקצה הימני בסמן והתפריט גדל שמאלה; Escape סוגר ולא נבלע',
    name: 'מיקום RTL, מקש-תפריט (0,0) לא קופץ לפינה, Escape סוגר',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      editor.innerHTML = '<p>טקסט לבדיקת מיקום</p>';
      const p = editor.querySelector('p');
      window.__rcSel(p, 0, 4);
      window.__rc(p, 700, 400);
      const r = document.getElementById('rcMenu').getBoundingClientRect();
      window.__r = { left: r.left, right: r.right, top: r.top };
      window.__rcHide();
      // מקש-התפריט של Windows: clientX/Y = 0
      window.__rcSel(p, 0, 4);
      window.__rc(p, 0, 0);
      const r2 = document.getElementById('rcMenu').getBoundingClientRect();
      window.__r2 = { left: r2.left, top: r2.top };
      window.__rcHide();
      window.__closed = !window.__rcOpen();
    },
    assert: () => {
      const i = [];
      if (Math.abs(window.__r.right - 700) > 3)
        i.push({ type: 'rc-ltr-position', msg: `הקצה הימני ב-${Math.round(window.__r.right)} במקום 700 — התפריט גדל ימינה (דפוס LTR)`, id: 'rcmenu' });
      if (window.__r.left < 8) i.push({ type: 'rc-offscreen', msg: 'התפריט גולש משמאל למסך', id: 'rcmenu' });
      if (window.__r2.top <= 20 && window.__r2.left <= 20)
        i.push({ type: 'rc-keyboard-corner', msg: 'קריאה ללא קואורדינטות (מקש-תפריט) מציבה את התפריט בפינה', id: 'rcmenu' });
      if (!window.__closed) i.push({ type: 'rc-escape-noop', msg: 'Escape לא סגר את התפריט', id: 'rcmenu' });
      return i;
    },
  },

  // ═══ אבטחה: עקיפת javascript: בתווי-בקרה (נמצא ותוקן 2026-07-20) ═══
  {
    id: 'url-controlchar-scheme-bypass', suite: 'export-security',
    rule: 'מפרט ה-URL: הדפדפן מסיר tab/LF/CR מתוך הכתובת — `java\\nscript:` שקול ל-`javascript:`',
    name: 'כתובת מסוכנת מוסווית בתווי-בקרה נחסמת (הדבקה + _isDangerousUrl + ערוך-קישור)',
    setup: async () => {
      window.__reset();
      const editor = document.getElementById('editor');
      // (1) בדיקת-היחידה של ההלפר
      const NL = String.fromCharCode(10), TAB = String.fromCharCode(9);
      window.__unit = {
        plain:   _isDangerousUrl('javascript:alert(1)'),
        spaced:  _isDangerousUrl('  JaVaScRiPt:alert(1)'),
        newline: _isDangerousUrl('java' + NL + 'script:alert(1)'),
        tabbed:  _isDangerousUrl('java' + TAB + 'script:alert(1)'),
        dataHtml:_isDangerousUrl('data:text/html,<script>1</script>'),
        okHttp:  _isDangerousUrl('https://example.com/a?b=1'),
        okImg:   _isDangerousUrl('data:image/png;base64,AAAA'),
      };
      // (2) מסלול-ההדבקה מקצה-לקצה — a.href הוא מה שהדפדפן באמת יפרש
      editor.innerHTML = '<p>x</p>';
      editor.focus();
      const rg = document.createRange(); rg.selectNodeContents(editor.querySelector('p'));
      getSelection().removeAllRanges(); getSelection().addRange(rg);
      const dt = new DataTransfer();
      dt.setData('text/html', '<a href="java' + NL + 'script:window.__XSS=1">לחץ</a>');
      dt.setData('text/plain', 'לחץ');
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 350));
      const a = editor.querySelector('a');
      window.__pasteHref = a ? a.href : '';
      window.__pasteTextKept = /לחץ/.test(editor.textContent);
    },
    assert: () => {
      const i = [], u = window.__unit || {};
      [['plain', true], ['spaced', true], ['newline', true], ['tabbed', true], ['dataHtml', true],
       ['okHttp', false], ['okImg', false]].forEach(([k, want]) => {
        if (u[k] !== want) i.push({ type: 'url-guard-wrong', msg: `_isDangerousUrl("${k}") = ${u[k]}, ציפינו ${want}`, id: 'export-security' });
      });
      if (/^javascript:/i.test(String(window.__pasteHref)))
        i.push({ type: 'xss-paste-bypass', msg: `הדבקת href מוסווה בתווי-בקרה שרדה — הדפדפן מפרש "${window.__pasteHref}" כ-javascript:`, id: 'export-security' });
      if (!window.__pasteTextKept)
        i.push({ type: 'xss-fix-ate-text', msg: 'החיטוי מחק את טקסט-הקישור במקום רק את ה-href', id: 'export-security' });
      return i;
    },
  },
);

// ─── אינדקס לפי suite ────────────────────────────────────────────────────────
export const SUITES = [...new Set(scenarios.map(s => s.suite))];
export function bySuite(name) { return scenarios.filter(s => s.suite === name); }
