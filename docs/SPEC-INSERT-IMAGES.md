# מפרט תמונות, צורות וציור — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> JS: `insertFreeImage` שורה ~7539 | `insertFreeShape` שורה ~8058 | `insertFreeDrawing` שורה ~8304

> ### קשרים עם קבצים אחרים
> - אובייקטים חופשיים (כולם) → `SPEC-INSERT-TEXTBOX.md` (מנגנוני גרירה/שינוי גודל/clamp משותפים)
> - שמירה/טעינה של אובייקטים → CLAUDE §5–6
> - ctxBar עבור אובייקטים → `docs/SPEC-FLOAT-TOOLBAR.md`

---

## 1. כפתור `#insImage` — הוסף תמונה מקובץ

**HTML:** `<button id="insImage">` בסרגל הוספה, קבוצת "איורים"
**פונקציה:** `insertFreeImage()`

**מה קורה (שלב-אחר-שלב):**
1. `_saveLiveSel()` — שמירת מיקום הסמן
2. `<input type="file" accept="image/*">` → click (פותח בורר קבצים)
3. `FileReader.readAsDataURL(file)` → base64
4. `img.onload`:
   - גודל ראשוני: `w = Math.min(320, naturalWidth)`, יחס שמור
   - מיקום התחלתי דרך `_newObjInsertPoint(w,h)` (עודכן 2026-07-03) — סמן חי אם יש, אחרת מרכז האזור הנראה (**לא** `left:60px/top:60px` קבוע כפי שהיה קודם)
5. יוצר `div.free-obj[data-img-mode="free"]` עם `img` בתוכו
6. `_clamp(obj)` — מונע חריגה מהדף
7. `_addHandles(obj)` — 8 handles שינוי גודל + handle סיבוב
8. `_makeDraggable(obj)` — גרירה עם snap
9. `_selectObj(obj)` — בחירה ופתיחת ctxBar
10. `_setImgMode(obj, 'free')` — מצב ראשוני

---

## 6 מצבי תמונה — `IMG_MODES`
> **תוקן 2026-07-11** — הסעיף הזה תיעד 7 מצבים כולל `below-text` הרבה אחרי שהקוד מיזג
> אותו ל-`behind` (`_setImgMode` שורה 9642: `if (mode === 'below-text') mode = 'behind';`
> — מוחל **לפני** ה-switch, כך ש-`below-text` לעולם לא קיים כמצב-בפועל). אומת חי מול
> הקוד (MyWord-v2.html:9639-9698). ראה זיכרון `img-modes-below-text-trap`.

מעבר בין מצבים: `_setImgMode(obj, mode)`. נשמר ב-`data-img-mode`.

**סדר קנוני ב-`IMG_MODES`:** `['free', 'above-text', 'float-right', 'float-left', 'inline', 'behind']`

| מצב | `position` | `z-index` | השפעה על טקסט |
|---|---|---|---|
| `free` | `absolute` | `15` | ללא |
| `above-text` | `absolute` | `25` | ללא |
| `float-right` | **`relative`** + `float:right` (in-flow, ללא left/top) | — | טקסט עוטף משמאל |
| `float-left` | **`relative`** + `float:left` (in-flow, ללא left/top) | — | טקסט עוטף מימין |
| `inline` | `relative` + `display:block` (in-flow) | — | דוחה טקסט למטה; גרירה = הצבה בין שורות (caret-split, ר' למטה) |
| `behind` | `absolute` | `-1` | מאחורי הטקסט (סמן מים) |

**⚠️ חשוב:** `float-right/left` = `position: relative` — **לא absolute**!

**גרירת תמונה-`inline` — הצבה בין שורות (2026-07-12):** בזמן גרירה מוצג קו-הכנסה חי
(`.inline-drop-caret`) בנקודת ה-caret תחת הסמן (`_caretRangeFromPoint`, cross-browser).
בשחרור, `_placeInlineAtCaret` **מפצל את הפסקה** תחת ה-caret (מוציא את הזנב לבלוק-אח חדש
מאותו תג) ומניח את התמונה בין שני החצאים — כך היא נוחתת בדיוק **בין שתי שורות**, לא רק
בין פסקאות שלמות (הבעיה הקודמת: `_reanchorFloat` עיגן רק בין בלוקים; בפסקה-אחת-ארוכה
היה עוגן-יחיד → "בין שורות התמונה לא זזה"). אם ה-caret לא בבלוק-טקסט מפוצל (P/H1-4/DIV/
LI/BLOCKQUOTE) — נסיגה ל-`_reanchorFloat` (בין פסקאות). התמונה נשארת **ילד-ישיר של
`#editor`** בין שני ה-`<p>` → סריאליזציה/עימוד תקינים. **מגבלה ידועה:** המיקום המדויק-
בין-השורות לא נשמר בטעינה-מחדש (כמו inline מאז ומתמיד — `_deserializeFreeObjs` מוסיף
בסוף; הפסקאות-המפוצלות כן נשמרות בתוכן). דורש `flowIndex` בסריאליזציה — follow-up.
**⚠️ מלכודת-מחזור:** כל קוד שבונה מערך-מקומי למחזור-מצבים (כפתור 🔄 בסרגל) **חייב** לקרוא מ-`IMG_MODES` הקנוני. מערך מקומי שכולל `'below-text'` גורם לאינדקס לקפוץ ישר ל-`behind` ולדלג על `float-right/float-left/inline` — זה בדיוק הבאג שדווח ("כפתור החלפת מצב לא מחליף לכל המצבים").

**מעבר מהיר ל-`behind`:** כפתור 🔽/🔼 בסרגל הצף (`#ctxBar`)

**`max-height`:** תמונה inline בתוך דף → `max-height: 24.7cm` (29.7cm − 2.5cm × 2 = 24.7cm, CLAUDE §6)

---

## Edge Cases לתמונות

| מצב | התנהגות |
|---|---|
| קובץ לא-תמונה | `accept="image/*"` — מוסתר בבורר; אם עוקפים → `naturalWidth=0` → לא מוסיף |
| תמונה גדולה מאוד | מוגבלת ל-320px רוחב (naturalWidth עדיין נשמר ב-img) |
| `float-right/left` + pagination | `updatePagination` קורא `_clampFloat` לכל תמונת-float (עודכן 2026-07-11) — לא נכנסת בעמוד → נדחפת שלמה לעמוד הבא דרך `margin-top` (delta חיובי); נקרא גם בזמן גרירה חיה (§5 CLAUDE) |
| `inline` + pagination | מטופל ע"י `paginateBlocks` (ילד-ישיר in-flow, לא מדולג) — נדחף כמו כל בלוק |
| `behind` mode | `z-index:-1` — לא ניתן לסמן ישירות; לחיצה בctxBar להחזרה |
| שמירה | base64 ב-`freeObjs` array; `_serializeObj` → `_deserializeFreeObjs` בטעינה |

---

## תרחיש בדיקה

```
Input: לחץ insImage → בחר JPG
Expected: div.free-obj[data-img-mode="free"], img.src^="data:image/", רוחב ≤ 320px

Input: בחר תמונה → ctxBar → "float-right"
Expected: position:relative, float:right, טקסט עוטף משמאל

Input: ctxBar → "מאחורי הטקסט" (🔽)
Expected: data-img-mode="behind", z-index:-1
```

---

## 2. כפתורים `#insShape` / `#insShapeCaret` — צורות (מפוצל)

**HTML:** כפתור מפוצל (`ribbon-split`): גוף + חץ
**פונקציות:** `openShapePicker()` (שורה ~8152) + `insertFreeShape(kind)` (שורה ~8058)

> ⚠️ **ביקורת עיצוב (נוי, 2026-07-11):** גובה-שורה לא-אחיד ב-`openShapePicker`
> (תוויות ארוכות נשברות ל-2 שורות, קצרות לא — יוצר מראה "לא ישר"). שים לב:
> הבורר עבר שדרוג-עיצוב נפרד ב-2026-07-04 שהוא **המנצח-בפועל** בקאסקייד —
> רשת-5-עמודות ברוחב 460px, לא 4 עמודות/392px כפי שרשום עדיין בהמשך המסמך
> הזה (סעיף "בורר-הצורות" למטה טרם עודכן למספרים הנכונים). ר' פירוט מלא
> ב-`docs/SPEC-DESIGN-RIBBON.md` סעיף 1.

### לוגיקת הגוף (`#insShape`)

```
יש window._lastPick._shape → insertFreeShape(kind) ישירות
אין → openShapePicker()
```

### החץ (`#insShapeCaret`)
- תמיד `openShapePicker(anchorBtn)` — פותח בורר

### `openShapePicker(anchorBtn)` — בורר צורות

**UI:** פנל עם קטגוריות צורות:
- קווים ומחברים
- ריבועים / עיגולים / משולשים
- חצים
- לבבות ו-misc

**לחיצה על צורה:** `insertFreeShape(kind)` + סגירת הבורר

### `insertFreeShape(kind)` — הכנסת צורה

**מה קורה:**
1. `window._lastPick._shape = kind` — זכירה לכפתור המפוצל
2. `div.free-obj`, `position:absolute`, `left:80px`, `top:80px`, `160×120px`
3. `data-shapeKind=kind`, `data-img-mode='free'`
4. צבע ברירת מחדל: `#c7d2fe` (לצורות) / `none` (לקווים)
5. `_renderShape(kind)` → SVG
6. `_addHandles()`, `_makeDraggable()`, `_selectObj()`, `_clamp()`, `_objAvoidsHeadings()`
7. סרגל הצף: מצב גלישה + צבע מילוי + צבע קו

---

## סוגי צורות (`kind`)

| קטגוריה | ערכים אפשריים |
|---|---|
| בסיסיות | `rect`, `rounded-rect`, `circle`, `ellipse`, `triangle`, `right-triangle` |
| חצים | `arrow-right`, `arrow-left`, `arrow-double`, `arrow-up`, `arrow-down` |
| מחברים | `line`, `arrow-line`, `connector-right` |
| מיוחדות | `heart`, `star`, `pentagon`, `hexagon`, `cloud`, `callout` |

**`_renderShape(kind)`:** מחזיר SVG מותאם לכל `kind`. SVG ממלא 100% גובה/רוחב של `.free-obj`.

---

## Edge Cases לצורות

| מצב | התנהגות |
|---|---|
| `kind` לא ידוע | `_renderShape` מחזיר rect כברירת מחדל |
| שינוי גודל עם Shift (פינה) | שמירת יחס גובה/רוחב |
| `_clamp` | מונע חציית גבול דף; `FREE_MARGIN_CM = 1.0cm` (≈37.8px) מכל קצות הדף — **כל הסוגים, כל המצבים**. תמונות float → `_clampFloat`: אנכי 1.0cm; אופקי-חיצוני 1.0cm מקצה הדף, אופקי-פנימי (לכיוון מרכז) **0.2cm ממרכז הדף** |
| צבע מילוי | prompt + `_renderShape` מחדש |

---

## תרחיש בדיקה

```
Input: לחץ insShapeCaret → בחר "לב"
Expected: div.free-obj[data-shape-kind="heart"][data-img-mode="free"] עם svg

Input: גרור צורה לקצה הדף
Expected: _clamp עוצר 1.0cm (≈37.8px) מהקצה

Input: לחץ גוף insShape שוב
Expected: לב נוסף (ה-_lastPick שמור)
```

---

## 3. כפתור `#insDraw` — ציור חופשי / חתימה

**HTML:** `<button id="insDraw">` בסרגל הוספה
**פונקציה:** `insertFreeDrawing()` (שורה ~8304)

**מה קורה:**
1. אם `#_drawPad` קיים → `style.display='block'` (toggle)
2. יוצר `div#_drawPad` — חלון יחיד (modal floating), `position:fixed`
3. canvas `520×360px`

### כלי הציור

| כלי | תיאור |
|---|---|
| עט | קו חופשי בעקבות העכבר |
| קו ישר | מ-נקודה לנקודה (drag) |
| מחק | מוחק אזור |

### הגדרות
- **צבע:** color picker
- **עובי:** 1 / 2 / 4 / 8 / 14 px

### "הוסף למסמך"
1. `canvas.toDataURL('image/png')` → data URL
2. יוצר `div.free-obj` עם `img[src=dataURL]` (כמו תמונה רגילה)
3. `data-img-mode='free'`, `left:80px`, `top:80px`
4. `_addHandles()`, `_makeDraggable()`, `_selectObj()`, `_clamp()`
5. `#_drawPad` נסגר

### "נקה" / "סגור"
- **נקה:** `ctx.clearRect(0,0,W,H)`
- **סגור:** `style.display='none'` (ה-canvas נשמר — ניתן לחזור)

---

## Edge Cases לציור

| מצב | התנהגות |
|---|---|
| Canvas ריק + "הוסף" | תמונה שקופה מוספת (גובה 0 נראה) |
| ציור מחוץ לחלון | עכבר מחוץ ל-canvas → עצירת ציור |
| חלון ציור ב-fixed | לא מושפע מ-scroll המסמך |
| שמירה | הTמונה הסופית (PNG) נשמרת כ-base64 ב-freeObjs |

---

## תרחיש בדיקה

```
Input: לחץ insDraw → צייר → לחץ "הוסף למסמך"
Expected: div.free-obj עם img[src^="data:image/png"], data-img-mode="free"

Input: לחץ insDraw שוב (חלון פתוח)
Expected: חלון נסגר (toggle display:none)
```

---

## חוקים שנשמרים

- **CLAUDE §5 (אובייקטים חופשיים):** `position:absolute` יחסי ל-`#editor`, `left/top` ב-px, `_clamp` חובה
- **CLAUDE §5 (FREE_MARGIN_CM):** 1.0cm (≈37.8px) — אובייקט לא יגיע פחות מ-1.0cm מקצות
- **CLAUDE §5 (6 מצבי תמונה):** IMG_MODES, `_setImgMode`, `data-img-mode`
- **CLAUDE §6 (שמירה):** base64 ב-`freeObjs`, `_serializeFreeObjs`, `_deserializeFreeObjs`
- **CLAUDE §10 (זום):** גרירה/שינוי-גודל מחלקים ב-`window._docZoom`
- **CLAUDE §15 (_clamp):** חייב להיקרא אחרי כל גרירה/שינוי-גודל/הכנסה, גם ב-mousemove

---

## תפריט `#insImageCaret` / `#insShapeCaret` — מצב נוכחי מול עושר-ctxBar/imgformat/shapeformat (מחקר 2026-07-27, נוי)

> **הקשר:** המשתמש מבקש שהיכולות שקיימות בסרגל-הצף (`#ctxBar`) וב-לשוניות-ההקשר (`imgformat`/`shapeformat`,
> שמופיעות רק **אחרי** שאובייקט נבחר) יהיו נגישות **גם** מלשונית "הוספה" הראשית, לפני בחירה, דרך החץ ▾
> הקיים ליד "תמונה"/"צורות". מדובר בתבנית **שכבר קיימת בקוד** (`insImageCaret`/`insShapeCaret`/`insTableCaret`/
> `insTextboxCaret`, כולן ~2026-07-04) — כל חץ פותח כבר תפריט `.mw-panel` בבנייה-דינמית (`itm()`/`_mwPanelDismiss`)
> שמזהה אם יש אובייקט-מתאים נבחר (`_selObj`) ומציג כלי-עריכה בהתאם. **התבנית הזו כבר הורחבה בהצלחה לטבלה
> ב-2026-07-26** (ר' זיכרון `ctxbar-page2-buries-features` + `tableformat` ctx-tab) — אותו דפוס מוצע כאן לתמונה/צורה.

### מה יש כרגע ב-`#insImageCaret` (בדיקת-קוד, MyWord-v2.html:20936-21011)
עם תמונה נבחרת: 6 מצבי-גלישה (IMG_MODES) · שקיפות (טוגל גס 25%-קפיצות, לא סליידר) · "הבא קדימה" (קפיצה-לחזית בלבד, אין "אחורה"/צעד-אחד) · "החלף תמונה…" · "מחק תמונה".
בלי תמונה נבחרת: "הוסף תמונה מקובץ…" + hint טקסטואלי.

### מה יש ב-imgformat ctx-tab (נבחר בפועל בריבון אחרי לחיצה על תמונה — MyWord-v2.html:22465-22521) ש**חסר** ב-caret
| קבוצה ב-imgformat | פריטים |
|---|---|
| התאמות | ⛶ חיתוך (`openImageCropPanel`) · 🌗 מסננים (`openImageFiltersPanel`) · ✂️ הסר רקע (`openBgRemovePanel`) · 🏷️ טקסט חלופי (`_editImgAlt`) · 🗜️ דחיסה (`openImageCompressPanel`) |
| סגנון | 🎴 סגנונות מוכנים (`openImageStylesPanel`) · 🖼️ מסגרת ופינות (`openImageBorderPanel`) |
| יישור בעמוד | 6 כיוונים (`_alignObjToPage`) |
| סיבוב | 90°/איפוס (`rotateItems`) · 📐 מיקום מדויק (`openShapeTransformPanel`) |
| סידור | 🔺קדימה-שכבה-אחת / 🔻אחורה-שכבה-אחת (`_stepZOrder`, ה-caret כרגע מכיר רק קפיצה-לחזית) · 📑 שכפל · 🔒 נעל/שחרר · ♻️ שחזר מקורי |

**כלומר: 13 יכולות עובדות במלואן בפועל אך בלתי-נגישות משום `#insImageCaret`** — כולל שתיים חשובות-במיוחד (הסרת-רקע, שחזר-מקורי) שהמשתמש עלול לא לדעת שקיימות כלל אם לא נתקל בהן דרך בחירת-אובייקט.

### מה יש כרגע ב-`#insShapeCaret` (MyWord-v2.html:6772-6829) — הפער הגדול ביותר מבין הארבעה
עם צורה נבחרת: 🎨 צבע מילוי · ✏️ צבע קו · 〰 עובי-וסגנון-קו (`openStrokePanel`) · 🧩 אחד/חתוך (`_startShapeCombine`, לא ה-4 אופציות המלאות union/subtract/intersect/exclude) · 📋 שכפל · 🗑 מחק.
בלי צורה נבחרת: פותח ישירות `openShapePicker` — **בלי hint**, בשונה מ-3 הכפתורים האחרים.

**חסר לגמרי (14 יכולות פעילות ב-shapeformat, MyWord-v2.html:22570-22650):** 🌤️ צל · 🎨 גרדיאנט (לינארי/רדיאלי) · ↔️/↕️ היפוך · ◧ רדיוס-פינה · 📐 מיקום-מדויק · יישור-לעמוד 6-כיוונים · סיבוב-מהיר 90°/איפוס · 🔺/🔻 ריבוד-צעד-אחד (ה-caret לא מציע ריבוד כלל) · 🖌️/🎯 העתק-הדבק-סגנון (Format Painter) · 🔄 החלף-צורה · 💧 שקיפות (סליידר) · 🔒 נעל/שחרר · שני חסרים ממיזוג (intersect/exclude לא מוצגים, רק "אחד/חתוך" גנרי).

### ההמלצה הממוקדת (לא לבנות מנגנון חדש — להרחיב את מה שקיים)
במקום לבנות UI חדש, **להוסיף עוד `itm(...)` לתוך שני ה-IIFE הקיימים** (`insImageCaret`/`insShapeCaret`), קוראים לאותן פונקציות-פאנל ש-`imgformat`/`shapeformat` כבר קוראות (`openImageFiltersPanel`, `openBgRemovePanel`, `openImageStylesPanel`, `openImageBorderPanel`, `openImageCompressPanel`, `openShapeShadowPanel`, `openShapeGradientPanel`, `openShapeCornerPanel`, `openShapeTransformPanel`, `_alignObjToPage`, `_stepZOrder`, `_shapeFlip`, `_captureShapeStyle`/`_applyShapeStyle`, `openShapeReplacePicker`, נעילה/שקיפות inline כמו ב-`imgLockBtn`/`shLockBtn`). זהו **בדיוק** הדפוס שכבר הוכח 2026-07-26 עבור הטבלה — סיכון-רגרסיה נמוך (אין לוגיקה חדשה, רק עוד כפתורי-תפריט שקוראים לפונקציות קיימות ומוכחות).

**סדר-עדיפות מוצע (לא הכל בבת אחת — 5-6 לכל כפתור, הכי-שימושי/הכי-מוסתר קודם):**

**`#insImageCaret` (עם תמונה נבחרת) — להוסיף:**
1. ✂️ הסר רקע — היכולת הכי "יש ערך מוסף" והכי לא-מוכרת (חסרה alt/דחיסה גם, אבל הסרת-רקע היא ה"וואו" הראשון)
2. 🌗 מסננים
3. 🎴 סגנונות מוכנים
4. 📐 מיקום מדויק
5. 🔒 נעל/שחרר
6. ♻️ שחזר מקורי (חשוב כ"רשת-ביטחון" לכל שינוי אחר)

**`#insShapeCaret` (עם צורה נבחרת) — להוסיף (הפער הכי דחוף, ר' לעיל):**
1. 🌤️ צל
2. 🎨 גרדיאנט
3. 📐 מיקום מדויק
4. 🔼/🔽 ריבוד (קדימה/אחורה — חסר לגמרי כרגע, גם לא בכפתור הראשי)
5. 🔒 נעל/שחרר + 💧 שקיפות (סליידר, לא רק prompt)
6. גם: להוסיף **hint** למצב "בלי בחירה" (כמו שאר 3 הכפתורים) — כרגע `insShapeCaret` בלי בחירה קופץ ישר לבורר-צורות בלי לרמוז שקיים תפריט-כלים עשיר כשיש בחירה.

**תרחיש-בדיקה למרקוס/סאמר (לדוגמה):**
```
Input: הוסף צורה → לחץ עליה (נבחרת) → insShapeCaret ▾
Expected: תפריט חדש כולל "🌤️ צל" שקורא ל-openShapeShadowPanel (אותה פונקציה כמו shapeformat)

Input: הוסף תמונה → לחץ עליה → insImageCaret ▾ → "✂️ הסר רקע"
Expected: openBgRemovePanel נפתח (אותו פאנל בדיוק כמו imgformat), לא נבנה מחדש
```

**⚠️ לא הוצע:** לשכפל את *כל* 27 היכולות לתוך תפריט אחד — זה יהפוך את ה-▾ לרשימה ארוכה ולא-שמישה. 5-6 לכל כפתור, עם "…" / "עוד אפשרויות" בתחתית שמפנה למקום שבו כל השאר כבר קיימים (לשונית-הקשר `imgformat`/`shapeformat` שמופיעה אוטומטית אחרי הבחירה, בדיוק כמו שנעשה ב-`tableformat`) שומר על עיקרון "לא להציף".
