# TOOLBAR.md — סרגל ניווט ⭐⭐⭐

> קרא כשהמשימה נוגעת לכפתורים, לשוניות, קיצורי מקלדת, או מברשת עיצוב.

---

## חוק 1 — מבנה: לשוניות (Tabs) + Ribbons

```
.tabs
  .tab[data-ribbon="home"]    ← בית (פעיל כברירת מחדל)
  .tab[data-ribbon="insert"]  ← הוספה
  .tab[data-ribbon="file"]    ← קובץ
.ribbon[data-ribbon="home"]   ← header.toolbar.ribbon.active
.ribbon[data-ribbon="insert"] ← section.ribbon
.ribbon[data-ribbon="file"]   ← section.ribbon
```

- **רק ribbon אחד גלוי בכל רגע** — class `active` קובע מה מוצג.
- `.ribbon { display:none !important }` — ה-`!important` קריטי, אסור להסיר.
- כל ribbon = `display:flex`, `flex-wrap:wrap`, `gap:6px`.

---

## חוק 2 — לשונית בית (Home) — קבוצות ותכולה

```
קבוצה 1: גופן
  fontSizeBtn      גודל גופן (pt)
  blockStyle       סגנון פסקה (גוף / כותרת 1/2/3 / ציטוט)
  btnCase          מחליף רישיות אנגלית
  btnClearFmt      נקה עיצוב (𝐗)
  btnFormatPainter מברשת עיצוב (🖌️)
  btnBold          מודגש  [data-cmd="bold"]
  btnItalic        נטוי   [data-cmd="italic"]
  btnUnderline     קו תחתון [data-cmd="underline"]
  btnStrike        קו חוצה  [data-cmd="strikeThrough"]
  superscript      כתב עילי [data-cmd="superscript"]
  subscript        כתב תחתי [data-cmd="subscript"]
  colorBtn         צבע טקסט
  bgColorBtn       צבע רקע (מרקר)
קבוצה 2: יישור
  justifyRight / justifyCenter / justifyLeft / justifyFull
קבוצה 3: הזחה + ריווח
  btnIndent   הגדל כניסה
  btnOutdent  הקטן כניסה
  btnLineSpacing ריווח שורות (↕)
קבוצה 4: רשימות
  insertOrderedList   רשימה ממוספרת
  insertUnorderedList רשימת תבליטים
קבוצה 5: undo/redo
  btnUndo (↶) / btnRedo (↷)
```

---

## חוק 3 — לשונית הוספה (Insert)

```
טבלה:    insTable
צורות:   insShape, insTextbox, insDraw, insImage
ניווט:   insBookmark, navBookmark, insLink, insHR
זמן:     insTime, insDate, insComment
עמוד:    insPageBreak, insHeaderFooter, insSymbol, btnAddPage, btnDelPage
כלים:    insCalc, insEmoji
```

---

## חוק 4 — לשונית קובץ (File)

```
הדפסה:  window.print()
ייצוא:  exportHTML(), exportAndPrint() (→ PDF)
שיתוף:  shareDoc(), copyDocLink()
מסמכים: newDoc(), openDocManager(), saveDoc()
```

---

## חוק 5 — כפתורי Toggle (active state)

```js
// כפתורים שמקבלים class "active" לפי מצב הסלקשן:
['bold','italic','underline','strikeThrough'].forEach(c => {
  const btn = document.querySelector(`[data-cmd="${c}"]`);
  btn.classList.toggle('active', document.queryCommandState(c));
});
```

- מתעדכן בכל שינוי selection (`selectionchange` event).
- ⚠️ `queryCommandState` עלול להחזיר false בטעות על בחירה מרובת-בלוקים — ידוע.

---

## חוק 6 — שמירת Selection לפני כל כפתור

```js
// MOUSEDOWN שומר (לפני שה-focus עובר לכפתור)
btn.addEventListener('mousedown', e => {
  _saveLiveSel();
  e.preventDefault(); // מונע אובדן focus מהעורך
});
// CLICK משחזר ומבצע
btn.addEventListener('click', () => {
  restoreSelection() || editor.focus();
  document.execCommand('bold');
});
```

⚠️ **חובה** על כל כפתור חדש. בלי זה — execCommand פועל על מיקום שגוי.

---

## חוק 7 — מברשת עיצוב (Format Painter 🖌️)

```js
// שלב 1: לחיצה על המברשת — שומר snapshot של עיצוב הטקסט הנבחר
snap = {
  fontWeight, fontStyle, textDecoration,
  color, backgroundColor, fontSize, fontFamily
};
// כל הדף מקבל cursor:copy
// שלב 2: סימון טקסט יעד — mouseup מחיל את ה-snapshot
// עוטף את הטקסט הנבחר ב-<span> עם הסגנונות
span.style.fontWeight = snap.fontWeight;
// ...
range.extractContents() → span → range.insertNode(span)
// לחיצה שנייה על המברשת = ביטול
```

- **לחיצה אחת** = מריחה אחת, ואז מתבטל אוטומטית.
- ⚠️ לא תומך בלחיצה כפולה (מריחה מרובה כמו ב-Word) — כרגע.

---

## חוק 8 — קיצורי מקלדת

| קיצור | פעולה |
|-------|--------|
| `Ctrl+S` | שמור |
| `Ctrl+B` | מודגש |
| `Ctrl+I` | נטוי |
| `Ctrl+U` | קו תחתון |
| `Ctrl+N` | מסמך חדש |
| `Ctrl+Z` | בטל |
| `Ctrl+Y` / `Ctrl+Shift+Z` | חזור |
| `Ctrl+K` | הוסף קישור |
| `Ctrl+L` | יישור שמאל |
| `Ctrl+E` | מרכוז |
| `Ctrl+R` | יישור ימין |
| `Ctrl+J` | יישור דו-צדדי |
| `Ctrl+]` | הגדל גופן +1pt |
| `Ctrl+[` | הקטן גופן -1pt |
| `Ctrl+F` | חיפוש |
| `Ctrl+H` | חיפוש והחלפה |
| `Ctrl+P` | הדפס (דפדפן) |

---

## ✅ צ'קליסט לפני שינוי בסרגל

```
[ ] כפתור חדש — יש mousedown עם _saveLiveSel() + e.preventDefault()?
[ ] כפתור toggle — מתעדכן עם queryCommandState?
[ ] ribbon חדש — הוסיף tab + data-ribbon תואמים?
[ ] לא נגעת ב-!important של .ribbon?
[ ] קיצור מקלדת חדש — הוסיף לטבלה למעלה?
```
