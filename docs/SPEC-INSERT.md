# מפרט סרגל הוספה — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> לחיפוש קוד: ראה `docs/CODE-INDEX.md` → שורות מדויקות.

> ### מפרטים נפרדים לפי נושא
> - **טבלאות** → `docs/SPEC-INSERT-TABLE.md`
> - **תמונות + צורות + ציור** → `docs/SPEC-INSERT-IMAGES.md`
> - **תיבת טקסט** → `docs/SPEC-INSERT-TEXTBOX.md`
>
> מסמך זה מכסה: **הדבקה · קישורים · תאריך/שעה · הערות · עמוד · מחשבון · אימוג'י**

---

## קבוצה 1: לוח (הדבקה)

### `#insPaste` — הדבק (מפוצל)

**HTML:** `ribbon-split` — גוף `#insPaste` + חץ `#insPasteCaret`
**JS:** IIFE שורה ~13159

#### גוף `#insPaste` — הדבקה רגילה

**מה קורה:**
1. `_doPaste('normal')`
2. `navigator.clipboard.read()` → לכל item:
   - יש `text/html` → `_sanitize(html)` → `execCommand('insertHTML')`
   - יש `text/plain` → `execCommand('insertText')`
3. fallback: `execCommand('paste')` (אם clipboard API חסום)
4. `scheduleSave()` + `rAF(updatePagination)`

**`_sanitize(html)`:**
- מאפשר: B, STRONG, I, EM, U, S, STRIKE, BR, P, DIV, SPAN, H1–H3, UL, OL, LI, A, BLOCKQUOTE, PRE, CODE, TABLE, THEAD, TBODY, TR, TD, TH
- **מסיר:** `script`, `style`, כל attributes (חוץ מ-`href` בטוח)
- לא שומר `class`/`id`/`style` — טקסט נקי עם structure
- **⚠️ בדיקת-כתובת (הוקשח 2026-07-20):** משתמשים ב-`_isDangerousUrl(v)` — **לא** ב-`/^\s*javascript:/i` הישן. הדפדפן מסיר tab/LF/CR מכתובות, כך ש-`java\nscript:` עוקף regex נאיבי (אומת חי כ-XSS). `_isDangerousUrl` מנרמל (מסיר תווי-בקרה+רווחים, lowercase) לפני שהוא חוסם `javascript|vbscript|livescript|mocha|data:` (מלבד `data:image/*`). מקור-אמת יחיד ל-3 המחטאים (הדבקה/ייצוא/`_sanitizeStored`) + ל"ערוך קישור" (שם דרך `_isSafeUserUrl` — רשימת-היתר). ר' `docs/SPEC-RCMENU.md` והזיכרון `url-controlchar-xss`.

#### חץ `#insPasteCaret` — אפשרויות הדבקה

**מה קורה:** פותח `.mw-panel#_pasteOptMenu` עם 3 אפשרויות:

| אפשרות | mode | תיאור |
|---|---|---|
| 📋 **הדבק** | `'normal'` | שומר עיצוב בסיסי (Ctrl+V) |
| 🔤 הדבק טקסט בלבד | `'textonly'` | `execCommand('insertText')` — ללא תגיות |
| ✏️ הדבק תואם עיצוב | `'match'` | `_sanitize(html)` → `textContent` בלבד |

**`'match'`:** מדביק כ-plain text, כך שהטקסט מקבל עיצוב של המיקום סביבו.

**Edge Cases:**
- אין הרשאת clipboard → fallback ל-`execCommand('paste')`
- תמונות מהלוח → מזוהות ב-`initPasteSanitizer` (לא ב-insPaste) ומוספות כ-free-obj

---

## קבוצה 2: קישורים

### `#insBookmark` — סימנייה

**מה קורה:**
1. `prompt('שם הסימנייה:', '')`
2. **טקסט נבחר** → `span.bookmark.bm-range[data-name="..."]`
3. **ללא בחירה** → `span.bookmark.bm-point[contenteditable="false"]` + ZWC (תו ברוחב אפס)
4. `@media print`: `.bookmark` מוסתר

**תרחיש בדיקה:**
```
Input: סמן "שלום" → insBookmark → הזן "test"
Expected: span.bookmark.bm-range[data-name="test"] עוטף "שלום"

Input: ללא בחירה → insBookmark → "anchor"
Expected: span.bookmark.bm-point[data-name="anchor"] + ZWC
```

---

### `#navBookmark` — נווט סימניות

**מה קורה:**
1. סורק `.bookmark` (זמן אמת, כולל חדשות)
2. בונה תפריט עם שמות הסימניות
3. לחיצה → `el.scrollIntoView({behavior:'smooth'})` + `classList.add('bm-flash')` (1100ms)

**Edge Cases:** אין סימניות → "אין סימניות במסמך"

---

### `#insLink` — קישור (Ctrl+K)

**פונקציה:** `openLinkDialog()` (שורה ~7691)

**מה קורה:**
1. Dialog (לא `prompt`): שדה URL + שדה טקסט + checkbox "פתח בלשונית חדשה"
2. `normalizeUrl()`:
   - מתחיל ב-`http://`/`https://` → כמות
   - מתחיל ב-`www.` → `https://` + URL
   - מתחיל ב-`@` → `mailto:`
   - null/ריק → לא מוסיף
3. יש בחירה → `execCommand('createLink')` + `setAttribute('target','_blank')`
4. אין בחירה → `execCommand('insertHTML')` עם `<a href="...">טקסט</a>`
5. **פתיחה בעורך:** Ctrl+Click / Alt+Click על קישור קיים

**תרחיש בדיקה:**
```
Input: בחר מילה → Ctrl+K → "https://example.com"
Expected: <a href="https://example.com" target="_blank">מילה</a>

Input: ללא בחירה → Ctrl+K → "example.com" + טקסט "דוגמה"
Expected: <a href="https://example.com" target="_blank">דוגמה</a>
```

---

### `#insHR` — קו אופקי

**מה קורה:**
```js
execCommand('insertHTML', false, '<hr style="border:none;border-top:2px solid #999;margin:14px 0;">')
```

**⚠️ לא אותו קו כמו אוטו-עיצוב `---`** — שני המנגנונים מייצרים `<hr>` אבל דרך שונות.

---

## קבוצה 3: הוספה (תאריך/שעה/הערה)

### `#insDate` / `#insDateCaret` — תאריך (מפוצל)

**גוף:** `toLocaleDateString('he-IL', {weekday:'long', year:'numeric', month:'long', day:'numeric'})`

**חץ (4 פורמטים):**
| פורמט | דוגמה |
|---|---|
| מלא | יום שישי, 20 ביוני 2026 |
| ארוך | 20 ביוני 2026 |
| מספרי | 20/06/2026 |
| יום בשבוע | יום שישי |

**⚠️ לא שדה דינמי** — טקסט רגיל, לא מתעדכן אוטומטית

---

### `#insTime` / `#insTimeCaret` — שעה (מפוצל)

**גוף:** HH:MM (שעון 24 שעות)

**חץ (3 פורמטים):**
| פורמט | דוגמה |
|---|---|
| 24h | 14:30 |
| עם שניות | 14:30:45 |
| 12h AM/PM | 2:30 PM |

---

### `#insComment` — הערת שוליים

**מה קורה:**
1. `prompt()` לטקסט ההערה
2. `<sup class="fn-ref" data-note="...">[n]</sup>` + ZWC מוכנס בטקסט
3. `renderFootnotes()` → overlay תחתית עמוד: `[1]. טקסט הערה`
4. ספירה אוטומטית בסדר הופעה

**תרחיש בדיקה:**
```
Input: insComment → "מקור: ויקיפדיה"
Expected: <sup class="fn-ref">[1]</sup>; overlay = "1. מקור: ויקיפדיה"
```

---

## קבוצה 4: עמוד

### `#insPageBreak` — שבר עמוד

**מה קורה:**
1. מוצא בלוק ישיר של `#editor` שמכיל הסמן
2. **תחילת בלוק:** `setAttribute('data-pagebreak','1')` על הבלוק
3. **אמצע:** `range.extractContents()` → `<p data-pagebreak="1">` → `insertAdjacentElement('afterend')`
4. `paginateBlocks()` → דוחף לעמוד הבא (CLAUDE §4)

**⚠️ cascade:** נדחף פעם אחת בלבד (`!data-pushed`); פסקה ריקה עם `data-pagebreak` **כן** מעובדת

---

### `#insHeaderFooter` — כותרת/תחתית

**פונקציה:** `openHeaderFooterDialog()` (שורה ~5645)

**scope:** "כל העמודים" / עמוד ספציפי (`_pageHF[i]`)

**tokens:**
- `{עמוד}` / `{page}` → מספר עמוד נוכחי
- `{סהכ}` / `{total}` → סה"כ עמודים

**overlays:** `.doc-header` + `.doc-footer` ב-`#pageStack` (לא ב-`#editor`, לא `contenteditable`)

**pagination:** כשפעיל → `1.8cm` בראש עמודי-המשך + `1.6cm` בתחתית (CLAUDE §9)

---

### `#insSymbol` / `#insSymbolCaret` — תווים מיוחדים (מפוצל)

**גוף:** `_insertLastChar("סימנים מיוחדים")` — מוסיף את הסימן האחרון שנבחר

**חץ:** `_openSymbolPicker()` — פותח בורר עם קטגוריות:

| קטגוריה | דוגמאות |
|---|---|
| מתמטיקה | ±, ≤, ≥, ∞, √, π, ∑, ∫ |
| יוונית | α, β, γ, δ, Ω, Σ, Δ |
| מטבעות | ₪, €, £, $, ¥, ¢ |
| חצים | →, ←, ↑, ↓, ⇒, ⇐ |
| צורות | ●, ○, ■, □, ▲, ▶ |
| פיסוק | —, –, …, «, », „, " |
| זכויות | ©, ®, ™ |
| מזג אוויר | ☀, ☁, ⛅, ❄, ⛈ |

**תרחיש:**
```
Input: חץ → "מטבעות" → לחץ "₪" → גוף insSymbol
Expected: ₪ מוכנס שוב ללא בורר
```

---

### `#btnAddPage` / `#btnDelPage` — הוסף/הסר עמוד

#### הוסף
`addManualPage()` → `manualPages++` → `updatePagination()` → גלילה לעמוד החדש

#### הסר
`removeManualPage()`:
- עמוד ריק → מסיר + `showHint('עמוד הוסר')`
- עמוד עם תוכן → dialog: "נקה ומחק" / "כוח" / "ביטול"

**Edge Cases:**
- `manualPages > naturalPages*2+3` → מאפסים ב-`updatePagination` (CLAUDE §4)
- `loadDoc` מקלמפ `manualPages` ל-`_pageCounts().natural`

---

## קבוצה 5: כלים

### `#insCalc` — מחשבון

**פונקציה:** `openCalculator()` (שורה ~3298)

**חלון גרור `#_calc` (יחיד — toggle)**

**מצבים:** רגיל / מדעי

**3 מצבי הכנסה:**
| מצב | תוצאה מוכנסת |
|---|---|
| תוצאה בלבד | `"5"` |
| ביטוי = תוצאה | `"2 + 3 = 5"` |
| דרך מילולית עברית | `"שניים ועוד שלוש = 5"` |

**חישובים מדעיים:** sin, cos, tan, log, ln, √, x², xⁿ, π, e

---

### `#insEmoji` / `#insEmojiCaret` — אימוג'י (מפוצל)

**גוף:** `_insertLastChar("אימוג'ים")` — מוסיף אימוג'י אחרון

**חץ:** `_openEmojiPicker()` — פותח בורר עם קטגוריות

**`window._lastPick["אימוג'ים"]`** — שומר את האחרון שנבחר

---

## `window._lastPick` — מנגנון "אחרון" לכפתורים מפוצלים

```js
{
  _shape: 'heart',           // צורה אחרונה
  'סימנים מיוחדים': '₪',   // סימן אחרון
  "אימוג'ים": '🎉'         // אימוג'י אחרון
}
```

---

## טבלת סיכום מהיר

| # | כפתור | פעולה | קיצור |
|---|---|---|---|
| 1 | `#insPaste` | `_doPaste('normal')` | Ctrl+V |
| 2 | `#insPasteCaret` | תפריט 3 מצבי הדבקה | — |
| 3 | `#insBookmark` | הוסף סימנייה | — |
| 4 | `#navBookmark` | נווט לסימנייה | — |
| 5 | `#insLink` | `openLinkDialog()` | Ctrl+K |
| 6 | `#insHR` | קו אופקי | — |
| 7 | `#insDate` | תאריך מלא | — |
| 8 | `#insDateCaret` | בורר פורמט תאריך | — |
| 9 | `#insTime` | שעה HH:MM | — |
| 10 | `#insTimeCaret` | בורר פורמט שעה | — |
| 11 | `#insComment` | הערת שוליים | — |
| 12 | `#insPageBreak` | שבר עמוד | — |
| 13 | `#insHeaderFooter` | כותרת/תחתית | — |
| 14 | `#insSymbol` | תו מיוחד אחרון | — |
| 15 | `#insSymbolCaret` | בורר תווים | — |
| 16 | `#btnAddPage` | `addManualPage()` | — |
| 17 | `#btnDelPage` | `removeManualPage()` | — |
| 18 | `#insCalc` | `openCalculator()` | — |
| 19 | `#insEmoji` | אימוג'י אחרון | — |
| 20 | `#insEmojiCaret` | `_openEmojiPicker()` | — |

## חוקים שנשמרים

- **CLAUDE §4 (עימוד):** `rAF(updatePagination)` אחרי כל הכנסה
- **CLAUDE §7 (שמירה):** `scheduleSave()` אחרי כל הכנסה
- **CLAUDE §9 (כותרת/תחתית):** overlays ב-`#pageStack`, לא ב-`#editor`
- **CLAUDE §11 (הדבקה):** `initPasteSanitizer` מטפל ב-paste event; `insPaste` = כפתור נוסף לאותה לוגיקה
