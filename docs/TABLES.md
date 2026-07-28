# TABLES.md — טבלאות ⭐⭐⭐

> קרא כשהמשימה נוגעת ליצירה/עריכה/מחיקה של טבלאות.
> ⚠️ כפוף תמיד ל-[`PAGE_RULES.md`](PAGE_RULES.md) — קרא אותו קודם.

## חוק 1 — יצירת טבלה

```js
// HTML שנוצר:
'<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:inherit;">'
  + '<tr>'
  +   '<th style="border:1px solid #94a3b8;padding:6px 8px;min-width:50px;background:#ede9fe;font-weight:700;">'
  +   '<td style="border:1px solid #94a3b8;padding:6px 8px;min-width:50px;">'
  + '</tr>'
+ '</table><p><br></p>'   // ← תמיד p ריק אחרי הטבלה!
```

אפשרויות יצירה:

* בחירה ויזואלית מ-grid (עד מקסימום עמודות/שורות)
* גודל מותאם (`prompt` עם format `שורות×עמודות`)
* ✅ Header row (שורה ראשונה `<th>` + רקע סגול בהיר)
* ✅ Striped rows (שורות זוגיות רקע אפור בהיר)

⚠️ אחרי הכנסת טבלה — תמיד `<p><br></p>` אחריה, אחרת הסמן נתקע.

## חוק 2 — מבנה HTML

```html
<table style="border-collapse:collapse;width:100%;margin:10px 0;">
  <tr>
    <th style="border:1px solid #94a3b8;padding:6px 8px;min-width:50px;">כותרת</th>
  </tr>
  <tr>
    <td style="border:1px solid #94a3b8;padding:6px 8px;min-width:50px;">תוכן</td>
  </tr>
</table>
```

* `width:100%` — טבלה תמיד ברוחב מלא של אזור התוכן
* `border-collapse:collapse` — גבולות ממוזגים (לא כפולים)
* `min-width:50px` — תא לא קטן מזה
* ⚠️ אסור לשנות `width:100%` — טבלה לא חורגת מ-margins (ראה PAGE_RULES חוק 2)

## חוק 3 — ניווט בטבלה (Tab)

```
Tab          → עבור לתא הבא
Shift+Tab    → עבור לתא הקודם
Tab בתא אחרון → יוצר שורה חדשה אוטומטית (כמו Word!)
```

```js
// יצירת שורה חדשה ב-Tab מהתא האחרון:
const nr = tr.cloneNode(true);
nr.querySelectorAll('td, th').forEach(c => c.innerHTML = '<br>');
tr.parentNode.insertBefore(nr, tr.nextSibling);
```

## חוק 4 — פעולות על טבלה (Context Toolbar)

הטולבר מופיע בלחיצה על תא. הפעולות:

**ראשיות (תמיד גלויות):**

* ⬆️ הוסף שורה מעל
* ⬇️ הוסף שורה מתחת
* ➡️ הוסף עמודה מימין
* ⬅️ הוסף עמודה משמאל
* ☑️ בחר עמודה/שורה שלמה

**נוספות (תפריט "עוד"):**

* 🎨 צבע רקע לתא
* יישור תוכן: ימין / מרכז / שמאל
* 🗑️ מחק שורה נוכחית
* 🗑️ מחק עמודה נוכחית
* 🗑️ מחק את כל הטבלה

## חוק 5 — בחירת שורות/עמודות (tblSelBar)

```js
// בחירת שורות — Set של <tr>
let _tblSelRows = new Set();
// בחירת עמודות — Set של indices
let _tblSelCols = new Set();

// הדגשה ויזואלית של תאים נבחרים:
.tbl-cell-hl { outline: 2px solid #6366f1; background: rgba(99,102,241,0.14); }
```

* בחירת שורה מבטלת בחירת עמודה ולהפך (לא יכולים ביחד)
* אחרי בחירה → כפתור "🗑️ מחק N שורות/עמודות" מופעל

## חוק 6 — מחיקת שורה/עמודה

```js
// מחיקת שורה:
if (table.rows.length <= 1) table.remove(); // אם שורה אחת → מחק טבלה שלמה
else tr.remove();

// מחיקת עמודה:
if (table.rows[0].children.length <= 1) table.remove(); // עמודה אחת → מחק טבלה
else [...table.rows].forEach(r => r.children[idx].remove());
```

⚠️ תמיד אחרי מחיקה: `scheduleSave()` + `requestAnimationFrame(updatePagination)`.

## חוק 7 — טבלה וחוקי הדף

* `break-inside: avoid` — טבלה לא נחתכת בין עמודים (ראה PAGE_RULES חוק 4)
* ⚠️ אם הטבלה גבוהה מעמוד שלם → תיחתך (מגבלה ידועה, ראה [`BUGS.md`](BUGS.md))
* RTL: עמודה ראשונה מימין אוטומטית (דרך `dir="rtl"` על הדף)

## ❌ מה לא קיים (not in scope)

* מיזוג תאים (colspan/rowspan) — לא נתמך
* פיצול תאים — לא נתמך
* גבולות מותאמים לתא בודד — לא נתמך
* מספור מדורג בתוך תאים — לא נתמך

## ✅ צ'קליסט לפני שינוי בטבלאות

```
[ ] אחרי insertHTML של טבלה — יש <p><br></p> אחריה?
[ ] width:100% נשמר (לא חורג מ-margins)?
[ ] Tab מהתא האחרון יוצר שורה חדשה?
[ ] מחיקת שורה/עמודה אחרונה → מוחקת את הטבלה כולה?
[ ] אחרי כל שינוי: scheduleSave() + requestAnimationFrame(updatePagination)?
[ ] clearTblHl() נקרא אחרי סיום בחירה?
```
