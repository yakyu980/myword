# מפרט הוספת טבלה — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> JS: `openTablePicker()` + `insertTable(rows, cols)` (שורות ~2945, ~3021)

---

## כפתור `#insTable` — הוסף טבלה

**HTML:** `<button id="insTable">` בסרגל הוספה, קבוצת "טבלאות"

**מה קורה בלחיצה:**
1. `_saveLiveSel()` — שמירת מיקום הסמן
2. `openTablePicker(btn)` — פותח בורר גריד

---

## `openTablePicker(btn)` — בורר הטבלה

**UI:**
- גריד 10×10 עם hover-highlight
- label דינמי: "X עמודות × Y שורות" בהוורר
- **"מותאם..."** — פותח שדות rows (1–100) + cols (1–30)

**אפשרויות:**
| אפשרות | ברירת מחדל | תיאור |
|---|---|---|
| שורת כותרת | ✅ | שורה ראשונה: `<th>` + רקע `#ede9fe` |
| פסים מתחלפים | ❌ | שורות זוגיות: `background: #f9fafb` |

**לחיצה על תא בגריד:**
1. `insertTable(r, c)` מיד

---

## `insertTable(rows, cols)` — הכנסת הטבלה

**מה קורה (שלב-אחר-שלב):**
1. `restoreSelection()` (או `editor.focus()` אם אין)
2. בונה HTML טבלה:
   ```html
   <table style="width:100%; border-collapse:collapse;">
     <thead> <!-- אם שורת כותרת -->
       <tr><th style="border:1px solid #d1d5db; padding:6px 8px; background:#ede9fe;">...</th></tr>
     </thead>
     <tbody>
       <tr><td style="border:1px solid #d1d5db; padding:6px 8px;">...</td></tr>
       <!-- פסים: שורות זוגיות ב-#f9fafb -->
     </tbody>
   </table>
   <p><br></p>
   ```
3. `execCommand('insertHTML', false, tableHTML)` — נכנס למחסנית undo
4. `scheduleSave()` + `rAF(updatePagination)`

**תוצאה צפויה:** טבלה רוחב 100%, `border-collapse`, padding 6px 8px, פסקה ריקה `<p><br>` אחריה.

---

## ניווט בטבלה

### Tab / Shift+Tab
- **Tab בתא רגיל:** עובר לתא הבא (RTL: שמאל → ימין → שורה הבאה)
- **Shift+Tab:** תא קודם
- **Tab בתא אחרון (TD/TH אחרון בטבלה):** **יוצר שורה חדשה** עם אותה מבנה עמודות

### ניווט עם חצים
- חצי מקלדת רגילים בתוך תא

---

## עיצוב תאים (סרגל הצף `#ctxBar`)

כשסמן בתוך תא טבלה (TD/TH), ctxBar מציג:

| כפתור | פעולה |
|---|---|
| הוסף שורה מעל | `insertRow(rowIndex)` |
| הוסף שורה מתחת | `insertRow(rowIndex + 1)` |
| מחק שורה | `deleteRow(rowIndex)` |
| הוסף עמודה | `insertColumn(colIndex)` |
| מחק עמודה | `deleteColumn(colIndex)` |
| צבע תא | `applyColor('back', color)` על ה-TD |
| יישור תוכן | `style.textAlign` על ה-TD |

**`.tbl-cell-hl`** — מחלקה זמנית להדגשת תא שנבחר (מוסרת בייצוא).

---

## Edge Cases

| מצב | התנהגות |
|---|---|
| אין פוקוס בעורך | `editor.focus()` → מוסיף בסוף |
| תוך טבלה קיימת | יוצר טבלה מקוננת (לא נחסם) |
| `rows=0` / `cols=0` | לא מוסיף |
| `rows>100` / `cols>30` | מוגבל ל-100/30 בבורר המותאם |
| ייצוא Word | `tr._pgspacer` מוסר, עיצוב כלול |
| עימוד | `splitContainer` ב-`paginateBlocks` מפצל טבלה ארוכה |

---

## תרחיש בדיקה

```
Input: הצב סמן → לחץ insTable → סמן [3,4] → לחץ
Expected:
  - <table> 3×4 נוצרת
  - שורה ראשונה: <th> עם background #ede9fe
  - <p><br> אחרי הטבלה
  - Tab מהתא האחרון → שורה חדשה

Input: Tab בתא אחרון
Expected: שורה נוספת נוצרת עם אותו מבנה

Input: Click בתא → ctxBar מציג כלי טבלה
Expected: כפתורי הוסף/מחק שורה/עמודה + צבע תא
```

---

## חוקים שנשמרים

- **CLAUDE §1 (אין CDN):** הטבלה נבנית ב-HTML ישיר, ללא ספרייה
- **CLAUDE §4 (עימוד):** `rAF(updatePagination)` נקרא אחרי הכנסה
- **CLAUDE §7 (שמירה):** `scheduleSave()` נקרא אחרי הכנסה
- **CLAUDE §3 (שוליים):** הטבלה `width:100%` (בתוך padding 2.5cm של הדף)

---

## תפריט `#insTableCaret` מול לשונית-הקשר `tableformat` (מחקר 2026-07-27, נוי)

> **עודכן חלקית כבר ב-2026-07-26** (ר' CLAUDE §16 + זיכרון `ctxbar-page2-buries-features`):
> נוספה לשונית-הקשר `tableformat` ("▦ עיצוב טבלה", MyWord-v2.html:22673-22790) שחושפת 11 כפתורים
> ב-5 קבוצות (AutoFit/רוחב-וגובה/סגנון-טבלה/גבולות/יישור-אנכי/מיון/כותרת-חוזרת/עטיפת-טקסט/מיקום-חופשי)
> — אבל היא מופיעה **רק כשהסמן כבר בתוך תא קיים**, לא דרך `#insTableCaret` (שנבנה קודם, 2026-07-04,
> ולא עודכן להכיר את 6 היכולות החדשות האלה).

### מה יש כרגע ב-`#insTableCaret` (MyWord-v2.html:14987-15114)
**בלי תא פעיל:** 4 גדלים מהירים (2×2/3×3/3×4/2×5) + "בורר גודל מתקדם…" (`openTablePicker`) + hint.
**עם תא פעיל (`_showTblRibbonMenu`):** הוסף/מחק שורה ועמודה · מחק-טבלה · צבע-רקע לתא/לכל-הטבלה · יישור-אופקי ואנכי לתוכן-תא · "גבולות ועיצוב" (`openBorderPanel`) · "בחר עמודות/שורות".

### מה חסר (קיים ב-`tableformat` אך לא ב-caret)
| כפתור tableformat | פונקציה | קיים ב-caret? |
|---|---|---|
| התאמת רוחב (AutoFit) | `openTableAutofitPanel` | ❌ |
| רוחב וגובה מדויקים | `openTableSizePanel` | ❌ |
| סגנון טבלה (גלריית 7 ערכות) | `openTableStylePanel` | ❌ |
| מיין | `openTableSortPanel` | ❌ |
| כותרת חוזרת בכל עמוד | `dataset.repeatHeader` toggle | ❌ |
| עטיפת טקסט (רוחב-מלא/עוטף-ימין/עוטף-שמאל) | `openTableWrapPanel` | ❌ |
| מיקום חופשי (גרור לכל מקום בדף) | `window._tableToggleFreePos` | ❌ (רק דרך rcMenu/גרירה-הצידה) |

### ההמלצה
עדיפות **נמוכה יותר** מתמונה/צורה (ר' `SPEC-INSERT-IMAGES.md`) — הפער הזה כבר נסגר אתמול ברמת
"נראות אחרי-בחירה" (`tableformat` tab), שזה השיפור המשמעותי-יותר (המשתמש כבר רואה 11 כפתורים ברגע
שהסמן בתוך טבלה, בלי לפתוח שום ▾). ההרחבה הנותרת — הוספת אותם 6 קיצורי-דרך גם ל-`_showTblRibbonMenu`
של `#insTableCaret` — היא "תוספת-נוחות" (עוד מסלול לאותו יעד), לא פער-קריטי. אם ממומשת: להוסיף
לפני "גבולות ועיצוב" הקיים, קוראת לאותן הפונקציות בדיוק (`openTableAutofitPanel(t,anchor)` וכו').

**תרחיש-בדיקה (אם ממומש):**
```
Input: סמן בתוך תא → insTableCaret ▾
Expected: פריט "התאמת רוחב" קורא ל-openTableAutofitPanel (אותה פונקציה כמו tableformat)
```
