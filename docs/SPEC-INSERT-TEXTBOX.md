# מפרט תיבת טקסט חופשית — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> JS: `insertFreeTextbox()` שורה ~7621

> ### קשרים עם קבצים אחרים
> - אובייקטים חופשיים כלליים → CLAUDE §5–6
> - ctxBar לאובייקטים → `docs/SPEC-FLOAT-TOOLBAR.md`
> - תמונות וצורות → `docs/SPEC-INSERT-IMAGES.md`

---

## כפתור `#insTextbox` — תיבת טקסט חופשית

**HTML:** `<button id="insTextbox">` בסרגל הוספה, קבוצת "איורים"
**פונקציה:** `insertFreeTextbox()` (שורה ~7621)

> ### תפריט `#insTextboxCaret` — פער מול ctxBar "עוד" עמוד-2 (מחקר 2026-07-27, נוי)
> **מה יש כרגע** (MyWord-v2.html:21013-21079): "תיבת טקסט רגילה" · "פתק צהוב" · (עם תיבה נבחרת:)
> "צבע רקע לתיבה…" · "שכפל תיבה" · "מחק תיבה".
> **מה חסר** — כל 8 היכולות מהרחבת 2026-07-16ב + הקישור מ-2026-07-18 (ר' CLAUDE §16), שכולן
> קיימות ועובדות אך נגישות **רק** דרך `ctxBar`→"עוד"→עמוד-2 אחרי בחירת תיבה: 🖼️ מסגרת מתקדמת
> (`openTextboxBorderPanel`) · מרווח-פנימי (`openTextboxPaddingPanel`) · יישור-טקסט-אנכי
> (`window._setTbValign`) · Autofit 3-מצבים (`window._setTbAutofit`) · כיוון-טקסט-אנכי
> (`window._toggleTbVertical`) · מיקום/גודל/זווית מדויקים (`openShapeTransformPanel`, אותה פונקציה
> כמו בתמונה/צורה) · צל (`openTextboxShadowPanel`) · Format Painter (`_captureTbStyle`/`_applyTbStyle`)
> · צורת-מיכל (`openTextboxClipPicker`) · קישור-בין-תיבות (`_tbStartLinkPick`).
> **המלצה (עדיפות בינונית — נמוכה מתמונה/צורה, כי תיבת-טקסט נכנסת ל-ctxBar מיד עם ההוספה, לא
> דורשת "לגלות" שיש בחירה):** אם מורחב, 4-5 הכי-שימושיים: 🖼️ מסגרת, ↕️ יישור-אנכי, 📐 מיקום-מדויק,
> 🌤️ צל, ✂️/🔗 Autofit+קישור (זוג — "זרימת-טקסט" היא היכולת הכי "וורדית" ולא-מוכרת). אותו דפוס:
> להוסיף `itm(...)` לתוך ה-IIFE הקיים, קורא לאותן פונקציות בדיוק.

---

## `insertFreeTextbox()` — יצירת תיבת טקסט

**מה קורה (שלב-אחר-שלב):**
1. `_saveLiveSel()` — שמירת מיקום הסמן
2. יוצר `div.free-obj.free-textbox`:
   - `position: absolute`
   - `left: 80px`, `top: 80px`
   - `width: 220px` (גובה מינימלי ~ 80px)
3. **`div.tb-header`** ("↕ גרור") — **גרירה** עובדת **רק מה-header**
4. **`div.tb-content[contenteditable="true"]`**:
   - `data-placeholder="הקלד כאן..."`
   - RTL ברירת מחדל
5. `_addHandles(obj)` — 8 handles שינוי גודל + handle סיבוב
6. `_makeDraggable(obj, header)` — הגרירה קשורה ל-header בלבד
7. `content.focus()` — פוקוס ישיר לעריכה

**⚠️ `_clamp` לא נקרא בהוספה!** — ראה Edge Cases.

---

## מבנה DOM

```html
<div class="free-obj free-textbox" style="position:absolute; left:80px; top:80px; width:220px;">
  <div class="tb-header">↕ גרור</div>
  <div class="tb-content" contenteditable="true" data-placeholder="הקלד כאן..."></div>
  <!-- handles נוספים ע"י _addHandles: -->
  <div class="resize-handle" data-dir="nw"></div>
  <!-- ... 8 handles סה"כ -->
  <div class="rotate-handle"></div>
</div>
```

---

## עריכת טקסט ב-`.tb-content`

- כל פורמטים של עורך ראשי זמינים: B/I/U, צבע, גופן
- `contenteditable="true"` — עובד עם `execCommand`
- **קיצורי מקלדת** (B/I/U/K/L/E/R/J): פועלים **רק** כשפוקוס ב-`#editor` **או** `.tb-content` (CLAUDE §13)
- **F9:** פועל גם ב-`.tb-content`
- **אוטו-עיצוב:** **לא** פועל ב-`.tb-content` (בדיקת `editor.contains` נכשלת — by-design)
- **הכתבה קולית:** מוסיפה טקסט לפי `_savedRange` — עובד אם הסמן היה ב-`.tb-content`

---

## גרירה ושינוי גודל

### גרירה
- **רק ע"י `.tb-header`** (לא הגוף)
- `_makeDraggable(obj, header)` — מוגבל לחלק העליון
- Delta מחולק ב-`window._docZoom` (CLAUDE §10)
- `_clamp(obj)` נקרא ב-**mousemove וב-mouseup** — מונע חריגה מהדף בזמן גרירה

### שינוי גודל
- 8 handles (`.resize-handle[data-dir="nw|n|ne|e|se|s|sw|w"]`)
- Shift + פינה = שמירת יחס
- `_clamp` נקרא גם אחרי שינוי גודל

### סיבוב
- `.rotate-handle` — גרירה מסובבת את האובייקט
- `data-rotation` = זווית בדגריות
- `transform: rotate(Xdeg)` על ה-`.free-obj`

---

## מצבי גלישה

תיבת טקסט היא אובייקט חופשי — **כברירת מחדל** `data-img-mode="free"` (position:absolute).

**כפתורי ctxBar לתיבת טקסט:**
- גלישה (6 מצבים, `IMG_MODES`): free / above-text / float-right / float-left / inline / behind
  <br>⚠️ `below-text` **אינו** מצב עצמאי — מוזג ל-`behind`. ר' `SPEC-INSERT-IMAGES.md` §מלכודת-מחזור.
- ריבוד: הבא לפנים / שלח לאחור
- נעילה: לנעול/שחרר גרירה
- שקיפות: מחוון `.ctx-opacity` (0%–100%)
- מחק: מסיר את האובייקט מה-DOM

---

## מצב "פתק" (free-note)

תת-סוג של תיבת טקסט: `div.free-obj.free-textbox.free-note`

- **עיצוב שונה:** רקע צהוב (`#fef9c3`), border קצה צבעוני
- **נוצר** ע"י `insertFreeNote()` (כפתור נפרד או מ-ctxBar)
- **תוכן:** זהה ל-`.tb-content` — עריך

---

## שמירה וטעינה

### שמירה (`_serializeObj`)
```js
{
  type: 'textbox',
  left, top, width, height,
  rotation: data-rotation,
  html: obj.querySelector('.tb-content').innerHTML,
  mode: data-img-mode,
  opacity: data-opacity,
  zIndex,
  locked: data-locked
}
```

### טעינה (`_deserializeFreeObjs`)
1. `insertFreeTextbox()` מרוקן (ללא focus)
2. ממלא `.tb-content.innerHTML = entry.html`
3. `_clamp()` + `_addHandles()` + `_makeDraggable()`

---

## Edge Cases

| מצב | התנהגות |
|---|---|
| `_clamp` לא נקרא בהכנסה | אובייקט ב-`left:80, top:80` — בתוך הדף תמיד; clamp יקרא בגרירה הראשונה |
| תוכן `.tb-content` ריק | `data-placeholder` מציג "הקלד כאן..." (CSS `:empty::before`) |
| Ctrl+A ב-`.tb-content` | בוחר רק את תוכן תיבת הטקסט, לא כל המסמך |
| undo תוך תיבת טקסט | Ctrl+Z פועל על contenteditable הנוכחי (לא מנגנון undo המורחב של MyWord) |
| `free-note` + שמירה | `type: 'note'` ב-serialization; `insertFreeNote()` בשחזור |
| מחיקה מ-DOM + undo | אובייקט חופשי לא ב-undo — CLAUDE §12 (`exec('undo')` מגן) |

---

## תרחיש בדיקה

```
Input: לחץ insTextbox → הקלד "שלום"
Expected: div.free-obj.free-textbox[div.tb-content] = "שלום"

Input: גרור את ה-header
Expected: תיבה זזה, נעצרת 1.0cm (≈37.8px) מקצה הדף (_clamp)

Input: Ctrl+B על טקסט ב-tb-content
Expected: הטקסט מודגש (קיצור עובד ב-.tb-content)

Input: שמור → רענן → פתח
Expected: תיבת הטקסט חוזרת עם תוכן זהה
```

---

## חוקים שנשמרים

- **CLAUDE §5 (אובייקטים חופשיים):** `position:absolute` יחסי ל-`#editor`; `_clamp` חובה בגרירה
- **CLAUDE §5 (FREE_MARGIN_CM = 1.0):** תיבה נעצרת 1.0cm (≈37.8px) מהקצה
- **CLAUDE §6 (שמירה):** `_serializeFreeObjs` / `_deserializeFreeObjs`
- **CLAUDE §10 (זום):** delta גרירה מחולק ב-`window._docZoom`
- **CLAUDE §12 (undo):** `exec('undo')` מגן על free-obj מפני מחיקה מ-contenteditable
- **CLAUDE §13 (קיצורים):** B/I/U/F9 פועלים ב-`.tb-content` (לא רק ב-`#editor`)

---

## הרחבה 2026-07-16 — כלים מתקדמים (בהשראת Word/Google Docs/Canva)
> add-only. כל הכפתורים החדשים חיים בעמוד-2 של "עוד" (`moreBtn`) ב-`buildTextbox()`
> (~שורה 13274) — לא בשורה הראשית (חוק 2-השורות, CLAUDE §8). כל הפאנלים בדפוס
> `.mw-panel` הזהה לפאנלי-הצורות (`openStrokePanel`/`openShapeShadowPanel` וכו',
> ממוקמים דרך `_shapeFxPanelPlace` המשותף — לא נכתב קוד-מיקום כפול). כל הפונקציות
> הגלובליות מוגדרות ליד `_captureShapeStyle`/`_applyShapeStyle` (לפני "ציור חופשי"),
> ~שורה 11266 ואילך.

| # | פיצ'ר | פונקציה/פאנל | dataset/style | serialize field |
|---|---|---|---|---|
| 1 | מסגרת מתקדמת (עובי/סגנון/צבע) | `openTextboxBorderPanel(anchor,obj)` | `obj.style.border`/`borderStyle` (כמו קודם) | `tbBorder`/`tbBorderStyle` (קיימים, ללא שינוי סכמה) |
| 2 | מרווח פנימי (padding, ערך אחיד) | `openTextboxPaddingPanel(anchor,obj)` | `.tb-content.style.padding` | `tbPadding` |
| 3 | יישור-טקסט אנכי (עליון/אמצע/תחתון) | `window._setTbValign(obj,'top'\|'middle'\|'bottom')` | `.tb-content` flex (`display/flexDirection/justifyContent`) + `dataset.tbValign` | `tbValign` |
| 4 | Autofit — 3 מצבים (Word-style) | `window._setTbAutofit(obj,'auto'\|'fixed'\|'shrink')` | `obj.style.height/display/flexDirection`, `.tb-content.style.flex/overflow/minHeight/fontSize`, `dataset.tbAutofit` | `tbAutofit` |
| 5 | כיוון-טקסט אנכי (writing-mode) | `window._toggleTbVertical(obj)` | `.tb-content.style.writingMode='vertical-rl'` + `dataset.tbVertical` | `tbVertical` (boolean) |
| 6 | מיקום/גודל/זווית מדויקים | **שימוש-חוזר** ב-`openShapeTransformPanel(anchor,obj)` הגנרי (לא נכתב קוד חדש — עובד על כל `free-obj`) | `left/top/width/height/dataset.rotation` (קיימים) | ללא שינוי |
| 7 | צל (box-shadow) | `openTextboxShadowPanel(anchor,obj)` + `window._applyTbShadow(obj)` | `obj.style.boxShadow` + `dataset.tbShadow` (JSON: `{on,x,y,blur,color,op}`) | `tbShadow` |
| 8 | Format Painter לתיבה | `window._captureTbStyle(obj)` / `window._applyTbStyle(obj)` | לוכד/מחיל: רקע, מסגרת, צל, שקיפות, padding (**לא** מיקום/גודל/תוכן) | — (משתמש בשדות הקיימים) |
| 9 | קישור בין תיבות (זרימת-טקסט אוטומטית) | `window._tbStartLinkPick(obj)` → `_tbFinishLinkPick(target)` · `window._tbUnlink(obj)` · `window._tbFlowOverflow(src)` | `dataset.linkedNextId`/`linkedPrevId`; העברת בלוק-אחרון מ-`.tb-content` המקור לראש היעד | `linkedNextId`, `linkedPrevId` |
| 10 | צורת-מיכל ויזואלית (clip-path) | `openTextboxClipPicker(anchor,obj)` + `window._applyTbClip(obj,key)` | `obj.style.clipPath` (מ-`TB_CLIP_PRESETS`: none/ellipse/circle/diamond/hexagon/parallelogram) + `dataset.tbClip` | `tbClip` |

### הערות מימוש חשובות
- **§1 (מסגרת):** לא נוסף dataset חדש — הפאנל קורא/כותב ישירות ל-`obj.style.border`/`borderStyle`
  (כמו כפתור "📐 גבול" הישן), ולכן תואם-לאחור מלא למסמכים ישנים בלי צורך בהגירת-סכמה.
- **§4 (Autofit):** `'fixed'`/`'shrink'` הופכים את `obj` ל-`display:flex;flex-direction:column`
  ואת `.tb-content` ל-`flex:1 1 auto;overflow:hidden` — כך התוכן נחתך בגובה הקבוע בלי JS
  מדידה בכל frame. מצב `'shrink'` בנוסף מקטין `.tb-content.style.fontSize` בהדרגה (עד 8px)
  בכל אירוע `input` (`_tbShrinkToFit`, מאזין נפרד מ-`scheduleSave` הקיים — לא מתנגש). **מגבלה
  מוצהרת:** אין הפעלת shrink-מחדש אוטומטית בעת resize-ידני בעכבר (כדי לא לגעת ב-handler
  הגלובלי המשותף `_onGlobalMove`/`mouseup` שמשמש את **כל** סוגי ה-`free-obj` — סיכון-רגרסיה
  לא מוצדק לפיצ'ר קוסמטי); ה-shrink מתעדכן בקריאה הבאה ל-`input` או בטעינה-מחדש.
- **§9 (קישור בין תיבות — זרימת-טקסט):** ~~נדחה במכוון~~ — **מומש 2026-07-18** (ההחלטה מ-2026-07-16ב
  בוטלה). ההנחה שהובילה לדחייה — "דורש שינוי בליבת ה-pagination/save" — התבררה כשגויה: `.tb-content`
  הוא contenteditable **מחוץ לזרם המסמך**, ולכן הזרימה לא נוגעת ב-`paginateBlocks`/`updatePagination`/
  `_clamp` כלל. מה שכן נדרש, ומומש: (א) חישוב-overflow — מאזין-delegation יחיד על `input` ב-`#editor`
  (לא מחליף מאזינים קיימים); (ב) במקום פיצול-DOM בנקודת-הגלישה — **העברת בלוק שלם** (`insertBefore`
  של `lastElementChild` לראש היעד, בלולאה guard<40); העיצוב נשמר כי האלמנט עצמו זז. **מגבלה מוצהרת:**
  טקסט-גולמי שאינו עטוף באלמנט-בלוקי לא זז (אין `lastElementChild`) — פיצול `Range` של node-טקסט
  בודד נשאר out-of-scope; (ג) שרשרת — `_tbFlowOverflow` קורא לעצמו רקורסיבית על היעד;
  (ד) undo — `_historyRecord` snapshot-based כבר קולט את השינוי דרך `_serializeFreeObjs`.
  `_tbWouldCreateCycle` (guard<200) חוסם שרשרת-מעגלית, כולל "קישור לעצמי".
- **§9א — תלות ב-Autofit (באג שנמצא ותוקן 2026-07-19):** תנאי-הזרימה הוא `scrollHeight > clientHeight`
  על `.tb-content`. בברירת-המחדל (`tbAutofit='auto'`) ה-content הוא `overflow:visible` והתיבה גדלה עם
  התוכן → `clientHeight === scrollHeight` תמיד, **התנאי לעולם לא מתקיים, והקישור נשאר חסר-השפעה בשקט**.
  נמדד חי לפני התיקון: `ch=480, sh=480` → 0 בלוקים זזו. לכן `_tbFinishLinkPick` מעביר תיבת-מקור שאינה
  `fixed`/`shrink` ל-`fixed` (דרך `_tbApplyAutofit` — לא `_setTbAutofit`, כדי לא לרשום `_historyRecord`
  כפול) ומודיע ב-`showHint`. `shrink` מתקבל כמות-שהוא (גם הוא `overflow:hidden`). אחרי התיקון:
  `ch=88, sh=480` → 11 בלוקים זרמו בסדר נכון.
- **§10 (צורת-מיכל):** `clip-path` ויזואלי בלבד — ה-bounding-box/text-flow של התיבה נשארים
  מלבניים לגמרי (עריכה, resize, clamp, pagination — הכל ללא שינוי). בכוונה **לא** `shape-outside`
  (המשתמש ציין זאת מפורשות כלא-אמין על תוכן-פנימי-עצמו).

### שדות סריאליזציה חדשים (`_serializeObj`, ~שורה 10168)
```js
tbPadding:  isTextbox ? content.style.padding : '',
tbValign:   isTextbox ? (obj.dataset.tbValign || '') : '',
tbAutofit:  isTextbox ? (obj.dataset.tbAutofit || '') : '',
tbVertical: isTextbox ? (obj.dataset.tbVertical === '1') : false,
tbShadow:   isTextbox ? (obj.dataset.tbShadow || '') : '',
tbClip:     isTextbox ? (obj.dataset.tbClip || '') : '',
```
כולם ברירת-מחדל ריקה/false — מסמכים ישנים (לפני 2026-07-16) נטענים ללא שינוי-התנהגות
(`_deserializeFreeObjs` בודק `if (d.tbXxx)` לפני החלה, כמו שאר השדות האופציונליים בקובץ).

### אימות
- 8 פיצ'רים (1–8, 10) אומתו **חי בדפדפן** (Playwright headless, לא רק syntax) — פתיחת כל
  פאנל, החלה בפועל של הערך, ו-round-trip מלא `_serializeObj` → `_deserializeFreeObjs`.
  0 שגיאות console בכל התרחישים.
- `node marcus.mjs --suite insert` → **75/75** (בייסליין), `--suite free-objects` → **14/14**
  (בייסליין), `--suite page-rules` → **18/18** (בייסליין) — כולם ללא שינוי, 0 ממצאים, 0 console.
