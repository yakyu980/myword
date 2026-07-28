# מפרט סרגל קובץ — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> לחיפוש קוד: ראה `docs/CODE-INDEX.md` → שורות מדויקות.

---

## עקרון בסיסי

כל כפתורי הסרגל עובדים עם `onmousedown="event.preventDefault()"` — מניעת אבדן פוקוס מהעורך לפני ביצוע הפעולה. רוב הפעולות מופעלות ישירות ב-`onclick`.

---

## קבוצה 1: קובץ

### `newDoc()` — מסמך חדש
**HTML:** `onclick="newDoc()"` | **קיצור:** Ctrl+N

**מה קורה:**
1. `(window.saveDoc || saveDoc)()` — שומר מסמך נוכחי לפני החלפה
2. `currentDocId = null` — מאפס מזהה מסמך נוכחי
3. `docTitle.value = 'מסמך חדש'`
4. `editor.innerHTML = '<p><br></p>'` — תוכן ריק
5. `_deserializeFreeObjs([])` — מוחק אובייקטים חופשיים
6. `updatePagination()` — מאפס עימוד

**Edge Cases:**
- אם `currentDocId` ריק (מסמך לא שמור) — עדיין שומר לפני האיפוס
- Ctrl+N מועד גלובלי — `preventDefault` כדי שלא יפתח לשונית דפדפן חדשה

**תרחיש בדיקה:**
```
Input: מסמך עם תוכן → Ctrl+N
Expected: עורך ריק, שם "מסמך חדש", currentDocId=null
```

---

### `openDocManager()` — פתח מסמך שמור
**HTML:** `onclick="openDocManager()"`

**מה קורה:**
1. מסיר `#_docMgr` קיים אם פתוח (toggle)
2. בונה overlay מלא עם רשימת מסמכים מ-localStorage (`myword2_docs`)
3. לכל מסמך: תמונה ממוזערת + שם + תאריך עדכון + כפתורי פתח/מחק
4. **פתיחה:** `loadDoc(id)` — טוען תוכן, freeObjs, pageBg, updatePagination
5. **מחיקה:** `deleteDoc(id)` → dialog אישור → splice + רענון רשימה

**Edge Cases:**
- אין מסמכים שמורים → "אין מסמכים שמורים"
- `init()` פותח מנהל מסמכים אוטומטית אם יש מסמכים ו-`myword2_last` לא עובד

**תרחיש בדיקה:**
```
Input: 3 מסמכים שמורים → לחץ "פתח"
Expected: חלון עם רשימת 3 מסמכים, לחיצה על אחד טוענת אותו
```

---

### `(window.saveDoc || saveDoc)()` — שמור
**HTML:** `onclick="(window.saveDoc||saveDoc)()"` | **קיצור:** Ctrl+S

**מה קורה:**
1. `saveDoc()` — גרסת בסיס; `window.saveDoc` = עטיפות עם `pageBg` ומאפיינים נוספים
2. מנקה `[data-pushed]` מתוכן לפני שמירה
3. `docs[id] = { title, content, manualPages, updated, freeObjs, docHeader, docFooter, pageBg }`
4. `localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))`
5. `saveStateEl` → "✓ נשמר" (אחרי 600ms → חוזר לרגיל)

**שמירה אוטומטית:** `scheduleSave()` = debounce 800ms — קורא לאותה פונקציה.

**Edge Cases:**
- localStorage מלא → exception → `saveStateEl` = "✗ אין מקום"
- `currentDocId` ריק → יוצר id חדש אוטומטית

**תרחיש בדיקה:**
```
Input: הקלד "שלום" → Ctrl+S
Expected: saveStateEl = "✓ נשמר"; localStorage מכיל את המסמך
```

---

### `saveDocAs()` — שמור בשם
**HTML:** `onclick="saveDocAs()"`

**מה קורה:**
1. `mwPrompt('שמור בשם:', oldName)` — dialog (לא `window.prompt`) עם שם הנוכחי
2. שם ריק/ביטול → חזרה ללא פעולה
3. שם חדש:
   - `currentDocId = null` — כופה id חדש
   - `docTitle.value = newName`
   - `(window.saveDoc || saveDoc)()` — שומר כמסמך חדש
4. hint: "נשמר בשם: newName"

**Edge Cases:**
- שם זהה לשם אחר → ייצור מסמך כפול עם id שונה (לא מתמזגים)
- שם עם תווים מיוחדים → מותר (id הוא timestamp, לא השם)

---

## קבוצה 2: הדפסה

### `window.print()` — הדפסה
**HTML:** `onclick="window.print()"` | **קיצור:** Ctrl+P

**מה קורה:**
1. `window.print()` — פותח דיאלוג הדפסת הדפדפן
2. `@media print` מסתיר סרגלים, overlays, שורת סטטוס, ctxBar, אובייקטים חופשיים (ב-z-index שלילי)
3. הדף מודפס לבן גם אם `pageBg` קבוע (CSS: `#editor { background:#fff !important }`)
4. כותרות/תחתיות מודפסות (הן overlays חיוביים)

**Edge Cases:**
- `exportAndPrint()` שונה מ-`window.print()`: הוא פותח חלון חדש עם clone נקי כדי לכלול תמונות חופשיות

---

## קבוצה 3: ייצוא

### `exportDocWord()` — ייצוא לקובץ Word
**HTML:** `onclick="exportDocWord()"` | **טיפוס:** `.doc` (HTML-in-Word wrapper)

**מה קורה:**
1. `editor.cloneNode(true)` — עותק מלא
2. מסיר: `.free-obj`, `[data-pushed]`/`[data-orig-mt]`, `tr._pgspacer`, `[contenteditable]`
3. `_mergeListChunks` — מחבר chunks פיזיים של רשימות חזרה ל-UL/OL אחד
4. עוטף ב-HTML מלא: `<html lang="he" dir="rtl">` + CSS בסיסי + BOM (`﻿`)
5. `Blob(type: 'application/msword')` → `<a download="שם.doc">` → `.click()`

**⚠️ חשוב:**
- **.doc ≠ .docx** — זה HTML עטוף, נפתח ב-Word אבל לא formated כ-docx
- **תמונות חופשיות לא מיוצאות** — by-design (§2.7 SPEC-TABS)
- שם קובץ מסונן מתווים אסורים (`/\?*:|"<>`)

---

### `exportAndPrint()` — ייצוא ל-PDF
**HTML:** `onclick="exportAndPrint()"`

**מה קורה:**
1. `window.open('','_blank','width=900,height=700')` — חלון חדש
2. כותב HTML עם clone נקי + CSS A4 (`@page { size:A4; margin:0 }`)
3. hint: "בחר 'שמור כ-PDF' בחלון ההדפסה"
4. `w.print()` אחרי 600ms

**⚠️ לא שומר PDF ישירות** — המשתמש צריך לבחור "שמור כ-PDF" בדיאלוג הדפסה.

---

### `exportHTML()` — ייצוא HTML עצמאי
**HTML:** `onclick="exportHTML()"`

**מה קורה:**
1. `_buildExportContent()` — תוכן מנוקה
2. HTML מלא עם CSS ו-RTL
3. `Blob(type: 'text/html')` → `<a download="שם.html">` → `.click()`

---

## קבוצה 4: שיתוף

### `shareDoc()` — שתף
**HTML:** `onclick="shareDoc()"`

**מה קורה:**
1. בונה HTML מלא עם content + **באנר שיתוף** בראש (כחול, "מסמך MyWord")
2. `Blob → URL.createObjectURL` → `<a download="שם.html">`
3. hint: "קובץ HTML עם באנר שיתוף הוכן"

**⚠️ לא שיתוף רשת** — יוצר קובץ מקומי להורדה.

---

### `copyDocLink()` — העתק קישור
**HTML:** `onclick="copyDocLink()"`

**מה קורה:**
1. `txt = '[שם] — שמור ב-localStorage של הדפדפן זה'`
2. `navigator.clipboard.writeText(txt)` → hint "קישור הועתק!"
3. אם clipboard חסום → `showHint` עם הטקסט ישירות

**⚠️ לא קישור URL אמיתי** — localStorage לא נגיש בין דפדפנים/מכשירים.

---

## קבוצה 5: הגדרות

### `openDocProperties()` — מאפייני מסמך
**HTML:** `onclick="openDocProperties()"`

**מה קורה:**
1. מחשב: מילים, תווים, עמודים (`_pageCounts().effective`), אחוז יעד (אם קיים)
2. dialog `.mw-panel` עם: שם מסמך (input עריכה), גודל שמור (bytes), תאריך עדכון
3. שינוי שם → `docTitle.value = newName` + `scheduleSave()`
4. נסגר ב-`_mwPanelDismiss`

---

### `toggleAutoSave()` — שמירה אוטומטית
**HTML:** `id="btnAutoSaveToggle"`, `onclick="toggleAutoSave()"`

**מה קורה:**
1. `_autoSaveEnabled = !_autoSaveEnabled`
2. כפתור: `classList.toggle('active-feature')` + עדכון label (`autoSaveLbl`)
3. כשמושבת: `scheduleSave()` מדלג (`if (!_autoSaveEnabled) return`)

**State:** `_autoSaveEnabled = true` כברירת מחדל. **לא נשמר** ב-localStorage — מתאפס ברענון.

**Edge Cases:**
- כיבוי שמירה אוטומטית **לא ממנע** Ctrl+S (שמירה ידנית תמיד עובדת)
- hint אם מסמך לא נשמר זמן רב: לא מוצג (לא ממומש)

---

## טבלת סיכום מהיר

| # | כפתור | פונקציה | קיצור |
|---|---|---|---|
| 1 | חדש | `newDoc()` | Ctrl+N |
| 2 | פתח | `openDocManager()` | — |
| 3 | שמור | `(window.saveDoc\|\|saveDoc)()` | Ctrl+S |
| 4 | שמור בשם | `saveDocAs()` | — |
| 5 | הדפסה | `window.print()` | Ctrl+P |
| 6 | Word | `exportDocWord()` | — |
| 7 | PDF | `exportAndPrint()` | — |
| 8 | HTML | `exportHTML()` | — |
| 9 | שתף | `shareDoc()` | — |
| 10 | העתק קישור | `copyDocLink()` | — |
| 11 | מאפיינים | `openDocProperties()` | — |
| 12 | שמירה אוט׳ | `toggleAutoSave()` | — |

## חוקים שנשמרים

- **CLAUDE §7 (localStorage):** STORAGE_KEY = `myword2_docs`, LAST_OPEN_KEY = `myword2_last`
- **CLAUDE §1 (קובץ יחיד):** ייצוא לא תלוי ספריות חיצוניות
- **CLAUDE §15 (שוליים):** ייצוא Word/HTML כולל `padding:2.5cm`
- **CLAUDE §14 (הדפסה):** `@media print` מסתיר UI בלבד, מדפיס `.page`
