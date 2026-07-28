# תוכנית עיצוב מחדש — סרגל מדידה (Ruler) ל-MyWord v2
> נוצר: 2026-06-14 · סוכן עיצוב UI

---

## 1. מה קיים כרגע בקוד

חיפוש ממצה ב-`MyWord-v2.html` אחר `ruler`, `#ruler`, `.ruler`, `margin-indicator`, `tab-stop` — **לא נמצא שום סרגל מדידה**.

**מבנה ה-UI הנוכחי:**
```
.app (grid: auto auto 1fr auto)
  nav.tabs             ← שורת לשוניות
  section.ribbon       ← ribbon פעיל
  main.editor-area     ← 1fr (כל הגובה הנותר)
    div.page-stack
      div#editor (contenteditable)
  footer.status
```

אין שום אלמנט בין ה-ribbon לבין `<main class="editor-area">`.

---

## 2. עיצוב מוצע

```
[tabs ribbon]
[ruler: ◄margin|  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16  |margin►]
[editor-area: page]
[status]
```

**מרכיבי הסרגל:**
- גובה `28px`, רוחב `21cm` (= רוחב הדף, מיושר אוטומטית)
- **אזורי שוליים** (אפור כהה `#c8cdd8`) — 2.5cm מכל צד כברירת מחדל
- **מסלול הכתיבה** (אפור בהיר `#e8edf5`) — עם קוי刻度
- **קוים** — major (10px) בכל ס"מ שלם, half (6px) בחצי ס"מ
- **אינדיקטורי שוליים** (▼ כחול `#6366f1`) — ניתנים לגרירה עם tooltip
- **Tab stops** — לחיצה על המסלול מוסיפה עצירת tab, כפל-לחיצה מסירה

---

## 3. קוד CSS (להכניס לפני `</style>`)

```css
/* ══ RULER — סרגל מדידה אופקי · 2026-06-14 · CLAUDE.md §1 ══ */
#mwRulerWrap {
  display: flex; justify-content: center; align-items: center;
  background: var(--bg); border-bottom: 1px solid var(--border);
  height: 28px; position: relative; z-index: 9;
  user-select: none; overflow: hidden; flex-shrink: 0;
}
#mwRuler {
  position: relative; width: 21cm; height: 100%;
  display: flex; flex-shrink: 0;
}
.mw-ruler-margin {
  background: #c8cdd8; height: 100%; flex-shrink: 0; position: relative;
  transition: background 0.15s;
}
.mw-ruler-margin:hover { background: #b8bdc8; }
#mwRulerTrack {
  position: relative; flex: 1; height: 100%; background: #e8edf5; overflow: visible;
}
.mw-rtick { position: absolute; bottom: 0; width: 1px; background: #7a8099; pointer-events: none; }
.mw-rtick.major { height: 10px; background: #4a5068; }
.mw-rtick.half  { height:  6px; background: #8a90a5; }
.mw-rlabel {
  position: absolute; bottom: 11px; transform: translateX(50%);
  font-size: 9px; color: #4a5068;
  font-family: 'Segoe UI', system-ui, sans-serif; font-weight: 500;
  pointer-events: none; line-height: 1;
}
.mw-margin-handle {
  position: absolute; top: 0; width: 12px; height: 100%;
  cursor: col-resize; z-index: 5; display: flex; align-items: center; justify-content: center;
}
.mw-margin-handle::after {
  content: ''; display: block; width: 3px; height: 60%;
  background: #6366f1; border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(99,102,241,0.35); transition: background 0.12s;
}
.mw-margin-handle:hover::after,
.mw-margin-handle.dragging::after { background: #4f46e5; box-shadow: 0 0 0 2px rgba(99,102,241,0.45); }
.mw-margin-handle .mw-mh-tip {
  position: absolute; bottom: 0; font-size: 8px; color: #6366f1; line-height: 1; pointer-events: none;
}
#mwRulerTooltip {
  position: fixed; z-index: 10200; background: #1f2937; color: #f9fafb;
  font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px;
  pointer-events: none; display: none; white-space: nowrap;
  font-family: 'Segoe UI', system-ui, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.mw-tabstop {
  position: absolute; bottom: 2px; width: 9px; height: 9px; cursor: pointer; z-index: 4;
  display: flex; align-items: flex-end; justify-content: center;
}
.mw-tabstop[data-type="left"]::after   { content:''; display:block; width:7px; height:7px; border-bottom:2px solid #6366f1; border-right:2px solid #6366f1; }
.mw-tabstop[data-type="center"]::after { content:''; display:block; width:7px; height:7px; border-bottom:2px solid #6366f1; border-inline:1px solid #6366f1; }
.mw-tabstop[data-type="right"]::after  { content:''; display:block; width:7px; height:7px; border-bottom:2px solid #6366f1; border-left:2px solid #6366f1; }
.mw-tabstop:hover::after { border-color: #4f46e5; }
#mwTabTypeBtn {
  position: absolute; right: 0; top: 0;
  width: 28px; height: 100%; background: #d4d8e3;
  border: none; border-left: 1px solid var(--border);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #4a5068; z-index: 6; flex-shrink: 0;
  transition: background 0.12s; user-select: none;
}
#mwTabTypeBtn:hover { background: #c0c5d4; color: #6366f1; }
body[data-theme="dark"] .mw-ruler-margin { background: #2a2f42; }
body[data-theme="dark"] .mw-ruler-margin:hover { background: #323748; }
body[data-theme="dark"] #mwRulerTrack { background: #1e2230; }
body[data-theme="dark"] .mw-rtick.major { background: #8892b0; }
body[data-theme="dark"] .mw-rtick.half { background: #4a5568; }
body[data-theme="dark"] .mw-rlabel { color: #8892b0; }
body[data-theme="dark"] #mwTabTypeBtn { background: #2a2f42; color: #8892b0; border-left-color: var(--border); }
body[data-theme="dark"] #mwTabTypeBtn:hover { background: #323748; color: #a5b4fc; }
body.focus-mode #mwRulerWrap { display: none !important; }
@media print { #mwRulerWrap { display: none !important; } }
/* ══ סוף RULER CSS ══ */
```

---

## 4. קוד HTML (להכניס בין ribbon אחרון לבין `<main class="editor-area">`)

```html
<!-- ── סרגל מדידה אופקי (Ruler) ─────────────────────────── -->
<div id="mwRulerWrap" title="לחץ להוספת tab stop; כפל-לחיצה להסרה">
  <button id="mwTabTypeBtn" title="סוג tab (לחץ לשינוי)">L</button>
  <div id="mwRuler">
    <!-- RTL: margin ימני (inline-start) ראשון -->
    <div class="mw-ruler-margin" id="mwMarginRight" style="width:2.5cm">
      <div class="mw-margin-handle" id="mwHandleRight" data-side="right">
        <span class="mw-mh-tip">▼</span>
      </div>
    </div>
    <!-- מסלול עם קוים ותוויות -->
    <div id="mwRulerTrack"></div>
    <!-- margin שמאלי (inline-end) אחרון -->
    <div class="mw-ruler-margin" id="mwMarginLeft" style="width:2.5cm">
      <div class="mw-margin-handle" id="mwHandleLeft" data-side="left">
        <span class="mw-mh-tip">▼</span>
      </div>
    </div>
  </div>
</div>
<div id="mwRulerTooltip"></div>
```

---

## 5. קוד JS (להכניס לפני `buildColorPalette();`)

```js
/* ══ initRuler() — סרגל מדידה · 2026-06-14 · CLAUDE.md §1 ══ */
(function initRuler() {
  'use strict';
  const PAGE_W_CM = 21, DEF_MARGIN = 2.5, MIN_M = 0.5, MAX_M = 6;
  const PX_PER_CM = () => (96/2.54) * (parseFloat(pageStack.style.zoom)||1);
  let marginR = DEF_MARGIN, marginL = DEF_MARGIN;
  let tabStops = [], tabType = 'left';
  const TAB_TYPES = ['left','center','right'];
  const TAB_LABELS = {left:'L', center:'C', right:'R'};

  const rulerWrap  = document.getElementById('mwRulerWrap');
  const track      = document.getElementById('mwRulerTrack');
  const marginREl  = document.getElementById('mwMarginRight');
  const marginLEl  = document.getElementById('mwMarginLeft');
  const handleR    = document.getElementById('mwHandleRight');
  const handleL    = document.getElementById('mwHandleLeft');
  const tabTypeBtn = document.getElementById('mwTabTypeBtn');
  const tip        = document.getElementById('mwRulerTooltip');
  if (!rulerWrap || !track) return;

  const cm2px = cm => cm * PX_PER_CM();
  const px2cm = px => px / PX_PER_CM();
  const round1 = v => Math.round(v*10)/10;

  function buildTicks() {
    track.innerHTML = '';
    const writeCm = PAGE_W_CM - marginR - marginL;
    for (let i = 0; i <= writeCm * 2; i++) {
      const cm = i/2, px = cm2px(cm), isInt = i%2===0;
      const t = document.createElement('div');
      t.className = 'mw-rtick ' + (isInt ? 'major' : 'half');
      t.style.right = px + 'px';
      track.appendChild(t);
      if (isInt && cm > 0) {
        const l = document.createElement('div');
        l.className = 'mw-rlabel';
        l.textContent = cm;
        l.style.right = px + 'px';
        track.appendChild(l);
      }
    }
    marginREl.style.width = cm2px(marginR) + 'px';
    marginLEl.style.width = cm2px(marginL) + 'px';
    renderTabStops();
  }

  function renderTabStops() {
    track.querySelectorAll('.mw-tabstop').forEach(el => el.remove());
    tabStops.forEach((ts, idx) => {
      const el = document.createElement('div');
      el.className = 'mw-tabstop'; el.dataset.type = ts.type; el.dataset.idx = idx;
      el.title = `Tab ${TAB_LABELS[ts.type]} — ${ts.cm} ס"מ (כפל-לחיצה להסרה)`;
      el.style.right = cm2px(ts.cm) + 'px';
      el.addEventListener('dblclick', e => {
        e.stopPropagation(); tabStops.splice(idx,1); renderTabStops();
      });
      track.appendChild(el);
    });
  }

  tabTypeBtn.addEventListener('click', () => {
    const i = TAB_TYPES.indexOf(tabType);
    tabType = TAB_TYPES[(i+1) % TAB_TYPES.length];
    tabTypeBtn.textContent = TAB_LABELS[tabType];
  });

  track.addEventListener('click', e => {
    if (e.target.classList.contains('mw-tabstop')) return;
    const rect = track.getBoundingClientRect();
    const cm = round1(px2cm(rect.right - e.clientX));
    const maxCm = PAGE_W_CM - marginR - marginL;
    if (cm < 0 || cm > maxCm) return;
    if (tabStops.some(ts => Math.abs(ts.cm - cm) < 0.15)) return;
    tabStops.push({cm, type: tabType});
    tabStops.sort((a,b) => b.cm - a.cm);
    renderTabStops();
  });

  function makeDraggable(handle, side) {
    let drag=false, startX=0, startCm=0;
    handle.addEventListener('pointerdown', e => {
      e.preventDefault(); drag=true;
      startX=e.clientX; startCm = side==='right' ? marginR : marginL;
      handle.classList.add('dragging'); handle.setPointerCapture(e.pointerId);
      showTip(e, startCm);
    });
    handle.addEventListener('pointermove', e => {
      if (!drag) return; e.preventDefault();
      const zoom = parseFloat(pageStack.style.zoom)||1;
      let delta = px2cm((e.clientX - startX)/zoom);
      if (side==='right') delta = -delta;
      const newCm = Math.min(MAX_M, Math.max(MIN_M, startCm + delta));
      if (side==='right') marginR = newCm; else marginL = newCm;
      buildTicks(); showTip(e, newCm);
    });
    handle.addEventListener('pointerup', e => {
      if (!drag) return; drag=false;
      handle.classList.remove('dragging'); handle.releasePointerCapture(e.pointerId);
      hideTip();
      if (typeof updatePagination==='function') requestAnimationFrame(updatePagination);
    });
  }

  makeDraggable(handleR, 'right');
  makeDraggable(handleL, 'left');

  function showTip(e, cm) {
    tip.textContent = round1(cm) + ' ס"מ';
    tip.style.display='block';
    tip.style.left=(e.clientX-24)+'px'; tip.style.top=(e.clientY-36)+'px';
  }
  function hideTip() { tip.style.display='none'; }

  /* סנכרון זום */
  if (typeof ResizeObserver!=='undefined') {
    new ResizeObserver(buildTicks).observe(pageStack);
  }
  const ea = document.getElementById('editorArea');
  if (ea) ea.addEventListener('scroll', () => { rulerWrap.scrollLeft = ea.scrollLeft; });

  /* API חיצוני */
  window._rulerGetMargins = () => ({left: marginL, right: marginR});
  window._rulerUpdateMargins = (l, r) => {
    marginL = Math.min(MAX_M, Math.max(MIN_M, l));
    marginR = Math.min(MAX_M, Math.max(MIN_M, r));
    buildTicks();
  };

  buildTicks();
})();
/* ══ סוף initRuler ══ */
```

---

## 6. כיצד לשלב בקוד הקיים

**שלב א — עדכון grid:**
```css
/* לפני: */
.app { display: grid; grid-template-rows: auto auto 1fr auto; height: 100vh; }
/* אחרי: הוסף auto שלישי לשורת הסרגל */
.app { display: grid; grid-template-rows: auto auto auto 1fr auto; height: 100vh; }
```

**שלב ב — HTML** — הכנס את בלוק ה-HTML בין ribbon אחרון לבין `<main class="editor-area">`.

**שלב ג — CSS** — הוסף לפני `</style>`.

**שלב ד — JS** — הוסף לפני `buildColorPalette();`.

---

## 7. מגבלות חשובות

| נושא | מגבלה | סיבה |
|------|--------|------|
| שינוי padding פיזי | הגרירה **לא משנה** את שוליים `.page` | חוק CLAUDE.md §15 ו-§3 — שוליים 2.5cm קבועים לעד |
| Tab stops בעורך | לא משפיעים על הטיפוגרפיה בפועל | CSS `tab-size` לא תומך ב-custom stops; הרחבה עתידית |
| שמירה ב-localStorage | מצב הסרגל לא נשמר | יש להרחיב סכמת המסמך עם שדה `rulerState` |
