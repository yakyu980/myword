# IMAGES.md — תמונות ⭐⭐⭐⭐

> קרא כשהמשימה נוגעת להוספה/מיקום/גרירה/שינוי גודל/סיבוב של תמונות.
> ⚠️ כפוף תמיד ל-[`PAGE_RULES.md`](PAGE_RULES.md) — קרא אותו קודם.

---

## חוק 1 — 6 מצבי תמונה

> **🛑 תוקן 2026-07-19 — הקובץ הזה הכיל את המערך השגוי שגרם לבאג אמיתי.**
> עד לתאריך זה נכתב כאן מערך בן **7** מצבים הכולל `'below-text'` כמצב עצמאי. זה **לא** המערך הקנוני.
> בקוד החי `below-text` **מוזג ל-`behind`** (שניהם `position:absolute; z-index:-1` — זהים לחלוטין),
> ו-`_setImgMode` מנרמל `if (mode === 'below-text') mode = 'behind'`.
> כל קוד שמחזר מצבים לפי מערך בן-7 קופץ ישר ל-`behind` ו**מדלג על `float-right`/`float-left`/`inline`**
> — הם נעשים בלתי-נגישים מהמחזור. ר' `BUGS.md` והזיכרון `img-modes-below-text-trap`.
> **תמיד לקרוא מ-`IMG_MODES` הקנוני בקוד, לא ממערך מקומי.**

```js
const IMG_MODES = ['free', 'above-text', 'float-right', 'float-left', 'inline', 'behind'];
```

| מצב | עברית | CSS | z-index |
|-----|-------|-----|---------|
| `free` | חופשי | `position:absolute` | 15 |
| `above-text` | מעל טקסט | `position:absolute` | 25 |
| `float-right` | עוטף ימין | `float:right` + relative | 1 |
| `float-left` | עוטף שמאל | `float:left` + relative | 1 |
| `inline` | בשורה | `display:block` + relative | — |
| `behind` | מאחורי טקסט | `position:absolute` | -1 |

**תאימות-לאחור:** תוכן ישן ששמר `below-text` נטען תקין — יש לנרמל `if (m === 'below-text') m = 'behind'`
**לפני** כל `indexOf`.

**החלת מצב:**

```js
_setImgMode(obj, 'float-right'); // תמיד דרך הפונקציה הזו — לא ידנית!
```

⚠️ **אסור** לשנות `position`/`float`/`z-index` ישירות על `.free-obj` — תמיד דרך `_setImgMode()`.

---

## חוק 2 — מבנה HTML של תמונה

```html
<div class="free-obj" 
     data-img-mode="free" 
     data-rotation="0"
     style="left:60px;top:60px;width:200px;height:150px;z-index:15;">
  
  <div class="free-img-wrap">
    <img src="..." draggable="false">
  </div>
  
  <!-- toolbar + 8 resize handles + rotate handle (מוזרקים ב-JS) -->
</div>
```

- `img.draggable = false` — **חובה**. Drag מנוהל ידנית ב-JS.
- `object-fit: fill` על התמונה — ממלאת את ה-box בדיוק (ללא letterbox).
- גודל ראשוני: `maxW=320px`, גובה מחושב לפי יחס הממדים האמיתי.

---

## חוק 3 — הוספת תמונה (insertFreeImage)

```js
// 1. file picker
input.type = 'file'; input.accept = 'image/*';
// 2. המרה ל-base64 (לשמירה ב-localStorage)
const reader = new FileReader();
reader.onload = ev => { /* בנה free-obj עם ev.target.result כ-src */ };
reader.readAsDataURL(file);
// 3. אחרי onload — חשב גודל לפי naturalWidth/naturalHeight
const w = Math.min(320, img.naturalWidth);
const h = Math.round(w * img.naturalHeight / img.naturalWidth);
// 4. clamp + avoidsHeadings + scheduleSave + updatePagination
_clamp(obj);
_objAvoidsHeadings(obj);
scheduleSave();
requestAnimationFrame(updatePagination);
```

---

## חוק 4 — Drag (גרירה)

```js
// תמיד pageX/pageY — לא clientX/clientY!
// pageX/Y לוקח בחשבון scroll — קריטי לעמודים ארוכים
startX: e.pageX, startY: e.pageY,  // בתחילת drag
// חישוב תזוזה (כולל תמיכה ב-zoom)
const dx = (e.pageX - _dragSt.startX) / _z;
const dy = (e.pageY - _dragSt.startY) / _z;
```

---

## חוק 5 — Clamp (כליאה בתוך הדף)

```js
const FREE_MARGIN_CM = 1.0;  // מרווח מינימלי מקצה הדף (≈37.8px) — כל הסוגים, כל המצבים
// _clamp — אופקי: 1.0cm מכל צד
const mnL = margin;
const mxL = Math.max(mnL, W - margin - objW);
// אנכי: כלוא בתוך העמוד הנוכחי (לא חוצה לפער בין עמודים!)
// אם יש header → topMargin = 1.8cm
// אם יש footer → botMargin = 1.6cm
// אם האובייקט גדול מעמוד שלם → מיושר לראש העמוד

// _clampFloat — תמונות float-right/float-left בלבד:
// אנכי: 1.0cm מקצות הדף (כמו _clamp)
// אופקי-חיצוני: 1.0cm מקצה הדף (שמאל ל-float-left, ימין ל-float-right)
// אופקי-פנימי (לכיוון מרכז): 0.2cm ממרכז הדף — תמונה יכולה לכסות כמעט חצי עמוד
```

⚠️ **מגבלה ידועה:** תמונה `free/absolute` **לא יכולה לחצות גבול בין עמודים**.
הקוד מזהה את רצועת הפער ודוחף לעמוד הבא אם צריך.

---

## חוק 6 — Snap לרשת

```js
const SNAP_CM = 0.5;  // snap כל חצי ס"מ
function _snap(val, pxPerCm) {
  const snapPx = SNAP_CM * pxPerCm;
  return Math.round(val / snapPx) * snapPx;
}
```

- Snap מופעל בזמן גרירה — מיישר לרשת של 0.5cm.
- קווי snap ויזואליים (`.snap-guide`) מוצגים ונמחקים אוטומטית.

---

## חוק 7 — Resize (שינוי גודל)

- **8 ידיות** (nw/n/ne/e/se/s/sw/w) + ידית סיבוב עגולה.
- Shift בזמן resize → שומר על יחס הממדים (aspect ratio).
- `ratio = obj.offsetWidth / obj.offsetHeight` נשמר בתחילת resize.

---

## חוק 8 — מצבי Float — כלל קריטי

```js
// float/inline — האלמנט חייב להיות לפני הטקסט ב-DOM
// כי CSS float עוטף רק טקסט שמופיע *אחרי* האובייקט ב-DOM
function _placeFloatInFlow(obj) {
  const firstBlock = [...editor.children].find(c =>
    c !== obj && !c.classList.contains('free-obj') && /^(P|H1|H2|...)$/.test(c.tagName)
  );
  if (firstBlock) editor.insertBefore(obj, firstBlock);
}
```

⚠️ מעבר מ-`free` ל-`float` → **חייב** לקרוא ל-`_placeFloatInFlow()`.
ללא זה התמונה "נזרקת" מחוץ לזרימת הטקסט.

---

## חוק 9 — ניקוי מצב במעבר בין מצבים

```js
// בכניסה ל-_setImgMode:
// 1. שמור left/top אם יוצא ממצב absolute
if (ABS(prevMode)) { obj.dataset.absL = obj.style.left; ... }
// 2. נקה classes ו-styles
obj.classList.remove('img-float-right','img-float-left','img-inline','img-behind');
obj.style.position = obj.style.float = obj.style.zIndex = '';
// 3. נקה left/top במצבי זרימה (float/inline) — חובה!
// כי left/top ממצב absolute מזיזים position:relative למקום שגוי
if (!ABS(mode)) { obj.style.left = ''; obj.style.top = ''; }
```

---

## ✅ צ'קליסט לפני שינוי בתמונות

```
[ ] שינוי מצב תמיד דרך _setImgMode() — לא ישירות?
[ ] img.draggable = false?
[ ] Drag משתמש ב-pageX/pageY?
[ ] _clamp() נקרא אחרי כל שינוי מיקום/גודל?
[ ] מעבר ל-float → _placeFloatInFlow() נקרא?
[ ] left/top מנוקים בכניסה למצבי float/inline?
[ ] תמונה לא חוצה פער בין עמודים?
[ ] אחרי כל שינוי: scheduleSave() + requestAnimationFrame(updatePagination)?
```

---

## חוק 10 — מעבר תמונה בין עמודים ⭐⭐⭐⭐⭐

**זו התנהגות מכוונת וחשובה — לא מגבלה!**

כשגוררים תמונה למטה לכיוון הדף הבא, ה-`_clamp()` מזהה שהתמונה נכנסה לרצועת הפער ואוטומטית **דוחפת אותה לתוך האזור המותר של הדף הבא**:

```js
// בתוך _clamp():
if (top > i * cycle + pageH && i < totalPages - 1) i++; // ← עבר לעמוד הבא
const bandTop = i * cycle + topMargin;
if (top + objH > bandBot) {
  if (i < totalPages - 1) {
    top = (i + 1) * cycle + topMargin; // ← דחיפה לתחילת הדף הבא
  }
}
```

**הכלל:** תמונה **אף פעם לא נתקעת בפער** בין עמודים — היא תמיד שייכת לאחד הדפים.

---

## חוק 11 — מיקום הכנסת תמונה לפי סמן ⭐⭐⭐⭐⭐

**רצוי (מה שהמשתמש מצפה):**
תמונה מוכנסת בדיוק ליד מיקום הסמן/הטקסט שסומן.

**מצב נוכחי בקוד:**

```js
// כרגע — מיקום קבוע בלי קשר לסמן:
obj.style.cssText = `left:60px;top:60px;width:200px;height:150px;`;
editor.appendChild(obj); // מוסיף לסוף ה-editor
```

**מה צריך לממש:**

```js
// 1. קרא את מיקום הסמן לפני פתיחת file picker
_saveLiveSel();
// 2. אחרי טעינת התמונה — חשב מיקום הסמן על הדף
const range = _savedRange;
if (range) {
  const rect = range.getBoundingClientRect();
  const editorRect = editor.getBoundingClientRect();
  const scrollY = window.scrollY;
  // המר לקואורדינטות יחסיות ל-editor
  const top  = rect.top  + scrollY - editorRect.top;
  const left = rect.left - editorRect.left;
  obj.style.top  = Math.max(0, top)  + 'px';
  obj.style.left = Math.max(0, left) + 'px';
}
// 3. clamp לוודא שבתוך גבולות הדף
_clamp(obj);
```

> ⚠️ **לא ממומש עדיין** — דורש שיפור. עד אז התמונה מופיעה ב-`left:60px, top:60px` קבוע.
