# מפרט סרגל הבית — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> לחיפוש קוד: ראה `docs/CODE-INDEX.md` לשורות המדויקות.

> ### שינויים מ-2026-06-20 (שדרוג UI)
> - **`#blockStyle` select הוחלף ב-`#blockStyleBtn` + `#blockStyleMenu`** (dropdown מותאם) — ה-select עדיין קיים אבל `display:none`, משמש לסנכרון בלבד
> - **רשימות:** נוספו `#bulletMenuBtn`/`#bulletMenu` ו-`#numberMenuBtn`/`#numberMenu` לבחירת סוגי סימון
> - **Undo:** נוסף `#btnUndoMenu` עם היסטוריית undo ו-`#undoCount` badge

---

## מנגנון בסיסי — שמירת Selection

כל כפתור בסרגל קורא `_saveLiveSel()` ב-`mousedown` + `e.preventDefault()` כדי לשמור את הסימון לפני שהפוקוס עובר לכפתור. אחר כך `restoreSelection()` משחזר לפני `execCommand`.

---

## קבוצה 1: גופן

### `#fontNameSelect` — בחירת שם גופן
**אלמנט:** `<select id="fontNameSelect">`

**אפשרויות:** (ברירת מחדל) / Heebo / Inter / Arial / Times New Roman / Georgia / Courier New / Segoe UI / Verdana / Tahoma / David / Narkisim

**מה קורה:**
1. `mousedown` → `_saveLiveSel()`
2. `change` → `restoreSelection()`
3. `execCommand('styleWithCSS', false, true)`
4. `execCommand('fontName', false, value)` — אם ברירת מחדל (`''`) → מעביר `'inherit'`
5. `scheduleSave()` + `requestAnimationFrame(updatePagination)`

**תוצאה צפויה:** הטקסט המסומן מוצג בגופן שנבחר.

**Edge Cases:**
- אין סימון + אין `_savedRange` → `editor.focus()` בלבד, הגופן לא יוחל
- ערך `''` → מסיר override, מחזיר לגופן ירושה
- גופן לא מותקן → פולבק ל-system font

**איך Word:** Format > Font > Font Name. Word מציג תצוגה מקדימה בריחוף — MyWord לא.

**תרחיש בדיקה:**
```
Input: סמן "שלום" → בחר "Times New Roman"
Expected: המילה מוצגת ב-Times New Roman
```

---

### `#fontSizeBtn` — גודל גופן
**אלמנט:** `<button id="fontSizeBtn">` עם `<span id="fontSizeCur">14</span>`

**תפריט `#fontSizeMenu`:** שדה `#fontSizeInput` (min=1, max=300) + רשימה: [8,9,10,11,12,14,16,18,20,22,24,26,28,32,36,40,48,56,72]

**מה קורה — פתיחה:**
1. `mousedown` → `_saveLiveSel()` + `e.preventDefault()`
2. `click` → `openFontSizeMenu()`:
   - `readCurrentFontSizePt()` — מחשב px × 0.75, ברירת מחדל 14
   - מסמן option תואם ב-class `cur`
   - `fontSizeInput.focus(); fontSizeInput.select()` אחרי 30ms

**מה קורה — בחירה:**
1. `mousedown` → `_saveLiveSel()` + `e.preventDefault()`
2. `click` → `restoreSelection()` → `applyFontSize(sz)` → `closeFontSizeMenu()`

**`applyFontSize(pt)` — לוגיקה:**
- **בלוק יחיד:** הכנסה ישירה דרך Range — **הטקסט נשאר מסומן** (אפשר ללחוץ ± שוב)
- **רב-בלוקי:** `execCommand('insertHTML')` — נכנס למחסנית undo, הבחירה מתכווצת
- מגבלות: `pt < 1` או `pt > 999` → חוזר ללא פעולה

**קיצורי מקלדת:** Ctrl+] הגדל / Ctrl+[ הקטן (עצירה ב-200/6)

**תרחיש בדיקה:**
```
Input: סמן "שלום" → לחץ fontSizeBtn → בחר 24
Expected: "שלום" עטוף ב-<span style="font-size:24pt">, fontSizeCur = "24", טקסט נשאר מסומן
```

---

### `#btnCase` — מחלף רישיות
**Tooltip:** "מחליף בין UPPER/lower/Sentence case"

**מה קורה:**
1. `_saveLiveSel()` + `e.preventDefault()`
2. `restoreSelection()`
3. אין סימון → `showHint('סמן טקסט קודם')` + חזרה
4. `_caseMode = (_caseMode + 1) % 3`:
   - mode 0 → Sentence case
   - mode 1 → lowercase
   - mode 2 → UPPERCASE
5. `_transformSelectionCase(fn)` — מהלך על text-nodes, שומר Bold/Italic/צבע/גופן

**Edge Cases:**
- עברית: `toUpperCase()/toLowerCase()` לא משנים אותה — פועל רק לאנגלית
- `_caseMode` = module-level — ממשיך מהנקודה האחרונה בין לחיצות

**תרחיש בדיקה:**
```
Input: סמן "hello" → לחץ פעם 1 → "Hello" | פעם 2 → "hello" | פעם 3 → "HELLO"
```

---

### `#btnClearFmt` — נקה עיצוב
**Tooltip:** "מסיר כל עיצוב (גודל, צבע, מודגש...)"

**מה קורה:**
1. `restoreSelection()`
2. `execCommand('removeFormat')` — מסיר Bold, Italic, Underline, Strikethrough, צבע, גופן
3. **ניקוי font-size ידני:** TreeWalker על כל `<span>` בבחירה → unwrap (כי removeFormat לא מסיר font-size בכל הדפדפנים)

**תרחיש בדיקה:**
```
Input: "שלום" מודגש 24pt אדום → סמן הכל → לחץ btnClearFmt
Expected: ללא Bold, ללא span, צבע ירושה, גודל ירושה
```

---

### `#btnFormatPainter` — מברשת עיצוב
**Tooltip:** "לכוד עיצוב מטקסט → החל על טקסט אחר (חד-פעמי)"

**מה קורה:**
1. `click` → `capture()`: לוכד `fontWeight, fontStyle, textDecorationLine, color, backgroundColor, fontSize, fontFamily` מ-`getComputedStyle`
2. כפתור נהיה `active` (כחול), `showHint('כעת סמן טקסט שעליו להחיל')`
3. `editor.mouseup` → `apply(snap)`:
   - מייצר `<span>` עם כל מאפייני העיצוב הנלכדים
   - `range.extractContents()` → מכניס לתוך span
4. לאחר החלה — `snap = null`, כפתור חוזר לרגיל (חד-פעמי)
5. `backgroundColor` שקוף → לא מוחל

**⚠️ ידוע:** לחיצה כפולה לא נועלת (Word: Ctrl+Shift+C/V). MyWord חד-פעמי בלבד.

**תרחיש בדיקה:**
```
Input: "שלום" מודגש 18pt אדום + "עולם" רגיל
→ סמן "שלום" → לחץ מברשת → סמן "עולם"
Expected: "עולם" → מודגש 18pt אדום. כפתור חוזר לרגיל.
```

---

### `#btnBold` / `#btnItalic` / `#btnUnderline` / `#btnStrike`

| כפתור | ID | פקודה | קיצור |
|---|---|---|---|
| מודגש | `#btnBold` | `execCommand('bold')` | Ctrl+B |
| נטוי | `#btnItalic` | `execCommand('italic')` | Ctrl+I |
| קו תחתון | `#btnUnderline` | `execCommand('underline')` | Ctrl+U |
| קו חוצה | `#btnStrike` | `execCommand('strikeThrough')` | — |

כולם: `exec(cmd)` → `updateActiveButtons()` → כפתור מסומן `.active` כשהסמן בטקסט מעוצב.

**תרחיש בדיקה לכולם:**
```
Input: סמן טקסט → לחץ כפתור
Expected: עיצוב מוחל; לחיצה חוזרת מסירה (toggle).
```

---

### Superscript / Subscript (`.sx-btn`)
- Superscript: `execCommand('superscript')` — "x²"
- Subscript: `execCommand('subscript')` — "H₂O"
- **אין id ב-DOM, אין קיצור מקלדת מוגדר**
- לא עוקבים ב-`updateActiveButtons()`

---

### `#colorBtn` — צבע טקסט
**פלטה:** `#colorPalette` עם **20 צבעים** (⚠️ לא 48 — תוקן 2026-07-11, ר' `PRESET_COLORS` שורה 4986) + `#colorCustom` (input type=color)

> ⚠️ **ביקורת עיצוב (נוי, 2026-07-11):** נמצאו בעיות-נוחות אמיתיות בבורר-הצבע
> (גריד שבור 8/8/4, צבע כפול, אין recent-colors גלוי, הבורר-המתקדם מוסתר מאחורי
> caret 15px) + השוואה מפורטת ל-Word. ר' `docs/SPEC-DESIGN-RIBBON.md` סעיף 3.

**מה קורה:**
1. `click` → סוגר `#bgColorPalette` אם פתוחה → toggle `.open` על `#colorPalette`
2. לחיצה על צבע → `applyColor('fore', color)`:
   - אין סימון → `showHint('סמן טקסט קודם')`
   - `execCommand('styleWithCSS', false, true)` + `execCommand('foreColor', false, color)`
   - מעדכן `--cur-color` על הכפתור
3. **z-index: 10050** — מעל `#ctxBar` (9998)

**תרחיש בדיקה:**
```
Input: סמן "שלום" → colorBtn → בחר כחול (#2563eb)
Expected: "שלום" בכחול, swatch הכפתור מתעדכן
```

---

### `#bgColorBtn` — צבע רקע (מרקר)
**פלטה:** `#bgColorPalette` עם `#bgColorClear` (כפתור "✕ הסר")

**מה קורה:**
- `applyColor('back', color)`:
  - ניסיון `execCommand('hiliteColor')` → fallback `execCommand('backColor')`
- `#bgColorClear` → `clearBackground()` → color = `'transparent'`

**תרחיש בדיקה:**
```
Input: סמן "שלום" → bgColorBtn → צהוב
Expected: רקע צהוב. לחץ "✕ הסר" → רקע הוסר.
```

---

## קבוצה 2: סגנון פסקה

### `#blockStyleBtn` + `#blockStyleMenu` — סגנון בלוק (dropdown מותאם)

**HTML:** כפתור `#blockStyleBtn` עם `<span class="bs-cur">` + `▾` → פותח `#blockStyleMenu`
**⚠️ ה-select המקורי `#blockStyle` קיים אבל `display:none`** — משמש לסנכרון פנימי בלבד

**אפשרויות ב-`#blockStyleMenu`:**
| `data-bs` | תצוגה | תג HTML |
|---|---|---|
| `P` | גוף טקסט | `<p>` |
| `H1` | **כותרת 1** (17px, bold 800) | `<h1>` |
| `H2` | **כותרת 2** (15px, bold 800) | `<h2>` |
| `H3` | **כותרת 3** (13px, bold 700) | `<h3>` |
| `BLOCKQUOTE` | ❝ ציטוט (italic, gray) | `<blockquote>` |

**מה קורה בלחיצה:**
1. `mousedown` → `_saveLiveSel()` + `preventDefault`
2. `click` על `.bs-opt[data-bs]` → `restoreSelection()`
3. `execCommand('formatBlock', false, tag.toLowerCase())`
4. `_syncBlockStyle()` מעדכן `#blockStyleBtn .bs-cur` + ה-select הנסתר
5. `scheduleSave()` + `rAF(updatePagination)`

**סנכרון אוטומטי:** `selectionchange` → `_syncBlockStyle()` → מעדכן את הכפתור לפי tag נוכחי

**Edge Cases:**
- בתוך `<LI>` — `formatBlock` לא תמיד פועל כצפוי
- בתוך תא טבלה — `formatBlock` לא פועל על `<td>` ישירות
- Enter אחרי H1/H2/H3 → פסקה חדשה חוזרת ל-P (Chrome behavior)

**תרחיש בדיקה:**
```
Input: הנח סמן בפסקה → לחץ blockStyleBtn → בחר "כותרת 1"
Expected: הפסקה → <h1>; bs-cur מציג "כותרת 1"
Enter → פסקה חדשה → bs-cur חוזר ל-P
```

---

## קבוצה 3: יישור + הזחה + מרווח

### יישורים

| כפתור | פקודה | קיצור |
|---|---|---|
| ימין (ברירת מחדל RTL) | `justifyRight` | Ctrl+R |
| מרכז | `justifyCenter` | Ctrl+E |
| שמאל | `justifyLeft` | Ctrl+L |
| דו-צדדי | `justifyFull` | Ctrl+J |

**חוק:** קיצורי יישור פועלים **רק** כשפוקוס ב-`#editor` או `.tb-content`

---

### `#btnIndent` / `#btnOutdent` — הזחה
**לא** `execCommand('indent')` — מניפולציית style ישירה:
- `_applyIndent(+40)` → `margin-inline-start += 40px` (RTL-safe)
- `_applyIndent(-40)` → `Math.max(0, cur - 40)`

**תרחיש בדיקה:**
```
Input: הנח סמן → לחץ btnIndent
Expected: marginInlineStart = "40px". שוב → "80px". Outdent → "40px".
```

---

### `#btnLineSpacing` — מרווח שורות
**תפריט:** 1.0 / 1.15 / 1.5 / 2.0 / 2.5 / 3.0

**מה קורה:** `_selectedBlocks()` → לכל בלוק: `b.style.lineHeight = value`

**ברירת מחדל:** `1.6` (CLAUDE.md §3)

**תרחיש בדיקה:**
```
Input: הנח סמן → בחר מרווח 2.0
Expected: lineHeight = "2", גובה הפסקה כפול
```

---

## קבוצה 4: רשימות

### תבליטים — כפתור מפוצל

**HTML:** `button.list-main[data-cmd="insertUnorderedList"]` + `#bulletMenuBtn` (▾) + `#bulletMenu`

**גוף (•):** `execCommand('insertUnorderedList')` + `scheduleSave()` + `rAF(updatePagination)`

**חץ (`#bulletMenuBtn`) → `#bulletMenu`:**
| `data-lst` | תצוגה |
|---|---|
| `disc` | ● עיגול מלא (ברירת מחדל) |
| `circle` | ○ עיגול ריק |
| `square` | ■ ריבוע |
| `'– '` | – מקף |
| `'▸ '` | ▸ משולש |
| `data-check="1"` | ☐ תיבת סימון (לחיצה → ☑) |

**בחירה מ-`#bulletMenu`:**
1. `execCommand('insertUnorderedList')` (אם אין רשימה עדיין)
2. `ul.style.listStyleType = dataLst` (עיגול/ריבוע/מקף/משולש)
3. **תיבת סימון** (`data-check="1"`): UL מיוחד עם LI עם `onclick="this.classList.toggle('checked')"`

**טריגר אוטומטי (autoformat):**
- `- ` / `* ` / `• ` + Space בתחילת שורה → תבליטים

---

### ממוספרות — כפתור מפוצל

**HTML:** `button.list-main[data-cmd="insertOrderedList"]` + `#numberMenuBtn` (▾) + `#numberMenu`

**גוף (1.):** `execCommand('insertOrderedList')` + `scheduleSave()` + `rAF(updatePagination)`

**חץ (`#numberMenuBtn`) → `#numberMenu`:**
| `data-lst` | תצוגה |
|---|---|
| `decimal` | 1. 2. 3. |
| `hebrew` | א. ב. ג. |
| `lower-alpha` | a. b. c. |
| `upper-alpha` | A. B. C. |
| `lower-roman` | i. ii. iii. |
| `upper-roman` | I. II. III. |
| `mw-paren-num` | 1) 2) 3) (CSS custom counter) |
| `mw-paren-heb` | א) ב) ג) (CSS custom counter) |
| `decimal-leading-zero` | 01. 02. 03. |

**בחירה מ-`#numberMenu`:**
1. `execCommand('insertOrderedList')`
2. `ol.style.listStyleType = dataLst`

**טריגר אוטומטי:**
- `1.` / `1)` + Space בתחילת שורה → ממוספרת

---

**Tab בטבלה:** מסייג — Tab/Shift+Tab מנווטים בתאים, לא מוסיפים הזחה.

**תרחיש בדיקה (אוטומטי):**
```
Input: בפסקה ריקה הקלד "1." → Space
Expected: <ol><li>|</li></ol>, "1." נמחק

Input: לחץ bulletMenuBtn → בחר "■ ריבוע"
Expected: <ul style="list-style-type:square">

Input: לחץ numberMenuBtn → "א. ב. ג."
Expected: <ol style="list-style-type:hebrew">
```

---

## קבוצה 5: Undo / Redo

### `#btnUndo` — בטל (מפוצל)

**HTML:** `undo-wrap` עם גוף `#btnUndo` + חץ `#btnUndoMenu` + badge `#undoCount` + dropdown `#undoMenu`

#### גוף `#btnUndo` — undo צעד אחד
**לוגיקה מיוחדת ב-`exec('undo')`:**
1. אוסף `[...editor.querySelectorAll('.free-obj')]`
2. **מסיר** כל `.free-obj` מ-DOM
3. `execCommand('undo')`
4. **מחזיר** free-objs שאינם `isConnected`

**מטרה:** undo לא ימחק תמונות/צורות שלא שייכות לטקסט (CLAUDE §12).

| פקד | קיצור |
|---|---|
| `#btnUndo` | Ctrl+Z |

#### חץ `#btnUndoMenu` — היסטוריית undo

**`#undoCount` badge:** מציג כמות צעדי undo זמינים (נעדכן אחרי כל שינוי).

**`#undoMenu` dropdown:**
- רשימת פעולות האחרונות עם תיאור (הקלדה, הוספת תמונה, ...)
- לחיצה על שורה → `exec('undo')` N פעמים
- נסגר אחרי בחירה

---

### `#btnRedo` — חזור

**לוגיקה:** זהה ל-btnUndo (עם free-obj guard):
1. אוסף `.free-obj`
2. מסיר
3. `execCommand('redo')`
4. מחזיר שאינם `isConnected`

| פקד | קיצור |
|---|---|
| `#btnRedo` | Ctrl+Y / Ctrl+Shift+Z |

**תרחיש בדיקה:**
```
Input: הוסף תמונה → הקלד טקסט → Ctrl+Z
Expected: הטקסט האחרון מוסר, התמונה נשארת

Input: לחץ חץ btnUndoMenu
Expected: רשימת פעולות אחרונות; לחיצה על "3 צעדים" → undo x3
```

---

## פקדים נוספים בשורת הכלים

### `#docTitle` — שם המסמך
`<input>` לעריכת שם המסמך. שמירה אוטומטית דרך `scheduleSave()`.

---

## טבלת סיכום מהירה

| # | פקד | פקודה עיקרית | קיצור |
|---|---|---|---|
| 1 | `#docTitle` | עריכת שם | — |
| 2 | `#fontNameSelect` | `execCommand('fontName')` | — |
| 3 | `#fontSizeBtn` | `applyFontSize(pt)` | Ctrl+]/[ |
| 4 | `#fontSizeUp/Down` | `applyFontSize(±1)` | Ctrl+] / Ctrl+[ |
| 5 | `#btnCase` | `_transformSelectionCase()` | — |
| 6 | `#btnClearFmt` | `removeFormat` + unwrap | — |
| 7 | `#btnFormatPainter` | capture → apply | — |
| 8 | `#btnBold` | `bold` | Ctrl+B |
| 9 | `#btnItalic` | `italic` | Ctrl+I |
| 10 | `#btnUnderline` | `underline` | Ctrl+U |
| 11 | `#btnStrike` | `strikeThrough` | — |
| 12 | superscript | `superscript` | — |
| 13 | subscript | `subscript` | — |
| 14 | `#colorBtn` (גוף) | `applyColor('fore')` | — |
| 15 | `#colorBtn` (▾) | `openColorWheel` | — |
| 16 | `#bgColorBtn` (גוף) | `applyColor('back')` | — |
| 17 | `#bgColorBtn` (▾) | `openColorWheel` | — |
| 18 | `#blockStyleBtn` | `formatBlock` + `_syncBlockStyle` | — |
| 19 | justifyRight | `justifyRight` | Ctrl+R |
| 20 | justifyCenter | `justifyCenter` | Ctrl+E |
| 21 | justifyLeft | `justifyLeft` | Ctrl+L |
| 22 | justifyFull | `justifyFull` | Ctrl+J |
| 23 | `#btnIndent` | `_applyIndent(+40)` | Tab (ברשימות) |
| 24 | `#btnOutdent` | `_applyIndent(-40)` | Shift+Tab |
| 25 | `#btnLineSpacing` | `b.style.lineHeight` | — |
| 26 | תבליטים (גוף) | `insertUnorderedList` | `-`/`*`+Space |
| 27 | `#bulletMenuBtn` | בחירת סוג סימון | — |
| 28 | ממוספרת (גוף) | `insertOrderedList` | `1.`+Space |
| 29 | `#numberMenuBtn` | בחירת סוג מספור | — |
| 30 | `#btnUndo` | `undo` + free-obj guard | Ctrl+Z |
| 31 | `#btnUndoMenu` | היסטוריית undo | — |
| 32 | `#btnRedo` | `redo` + free-obj guard | Ctrl+Y/Ctrl+Shift+Z |
