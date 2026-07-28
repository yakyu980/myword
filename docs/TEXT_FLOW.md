# TEXT_FLOW.md — טקסט וזרימה בדף ⭐⭐⭐⭐

> קרא כשהמשימה נוגעת לטקסט, שורות, פסקאות, כותרות, ריווח, או זרימה בין עמודים.
> ⚠️ כפוף תמיד ל-[`PAGE_RULES.md`](PAGE_RULES.md) — קרא אותו קודם.

## חוק 1 — Enter = התנהגות contenteditable native

```
Enter  → contenteditable native (אין handler מותאם בקוד)
```

* **אין בקוד handler מותאם ל-Enter** — אין קריאה ל-`insertLineBreak` או `insertParagraph`.
  הדפדפן מטפל ב-Enter באופן native בתוך ה-`contenteditable`.
* התנהגות native משתנה בין דפדפנים (בד"כ יוצר `<div>`/`<p>` חדש, לא `<br>`).
* ⚠️ אם בעתיד רוצים לאכוף Enter=`<br>` באופן עקבי — צריך להוסיף keydown handler
  שקורא ל-`document.execCommand('insertLineBreak')` ו-`preventDefault`. **כרגע זה לא קיים.**
* מעבר עמוד ידני (page break) כן מטופל בנפרד דרך כפתור `insPageBreak`.

## חוק 2 — ריווח שורות

```css
.page {
  line-height: 1.6;  /* ברירת מחדל קבועה */
}
```

ערכים אפשריים (דרך lineSpacingMenu): `1.0 | 1.15 | 1.5 | 2.0 | 2.5 | 3.0`

איך זה עובד בקוד:

```js
// מוחל per-block (על כל p/h1/h2... שנבחר)
block.style.lineHeight = opt.dataset.ls;
```

* ריווח מוחל על ה-block הנבחר, לא על כל הדף.
* שינוי ריווח על editor שלם → עובר על כל הבלוקים.
* ⚠️ לא לשנות את `line-height: 1.6` של `.page` — זו רק ברירת מחדל לבלוקים שלא קיבלו ריווח ידני.

## חוק 3 — כיוון טקסט (RTL/LTR)

```css
.page {
  unicode-bidi: plaintext;  /* אוטומטי לפי התוכן */
}
/* כל הדף RTL דרך: */
<html lang="he" dir="rtl">
```

* כיוון אוטומטי לפי התוכן — עברית = RTL, אנגלית = LTR אוטומטית.
* `unicode-bidi: plaintext` הוא הפתרון — הדפדפן מחליט לפי התו הראשון בשורה.
* אסור לשנות ל-`unicode-bidi: normal` — ישבור ערוב עברית/אנגלית.

## חוק 4 — יישור טקסט

```
ברירת מחדל: אוטומטי לפי כיוון (RTL → ימין, LTR → שמאל)
```

יישורים אפשריים:

```js
document.execCommand('justifyRight');   // ימין
document.execCommand('justifyLeft');    // שמאל
document.execCommand('justifyCenter'); // מרכז
document.execCommand('justifyFull');   // justify
```

* יישור מוחל על ה-block הנוכחי.
* ⚠️ ב-RTL — "יישור ימין" הוא ברירת המחדל הטבעית (לא צריך לאכוף).

## חוק 5 — כותרות (Headings)

```css
.page h1 { font-size: 2em;    line-height: 1.25; margin: 0.5em 0 0.3em; }
.page h2 { font-size: 1.55em; line-height: 1.3;  margin: 0.45em 0 0.28em; }
.page h3 { font-size: 1.25em; line-height: 1.35; margin: 0.4em 0 0.25em; }
```

החלת כותרת בקוד:

```js
document.execCommand('formatBlock', false, 'h1'); // או h2, h3, p
```

* כותרות לא נחתכות בין עמודים (`break-after: avoid` — ראה PAGE_RULES חוק 4).
* `em` = יחסי לגודל גופן הדף (14pt). אסור לשנות ל-`px` קשיח.

## חוק 6 — שמירת Selection

קריטי! לפני כל פעולת UI (כפתור, dropdown) — שמור והחזר:

```js
// שמירה
function _saveLiveSel() {
  const sel = window.getSelection();
  if (sel.rangeCount) _savedRange = sel.getRangeAt(0).cloneRange();
}

// שחזור
function restoreSelection() {
  if (!_savedRange) return false;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(_savedRange);
  return true;
}

// שימוש
btn.addEventListener('mousedown', () => _saveLiveSel());
btn.addEventListener('click', () => {
  restoreSelection() || editor.focus();
  document.execCommand('bold');
});
```

* mousedown שומר (לפני שהfocus עובר לכפתור).
* click משחזר ואז מבצע.
* אסור לקרוא ל-`execCommand` לפני `restoreSelection()`.

## חוק 7 — מבנה HTML בתוך הדף

```html
<!-- מצב התחלתי תקין -->
<div class="page" id="editor" contenteditable="true">
  <p><br></p>
</div>

<!-- מסמך ריק = p אחד עם br -->
editor.innerHTML = '<p><br></p>';
```

* כל בלוק = `<p>`, `<h1>`, `<h2>`, `<h3>`, `<blockquote>`, `<li>`
* אסור שהעורך יתחיל עם טקסט שיורי — תמיד `'<p><br></p>'`

## ✅ צ'קליסט לפני שינוי טקסט

```
[ ] שינוי בהתנהגות Enter — מודע שאין handler מותאם כיום (native בלבד)?
[ ] restoreSelection() נקרא לפני כל execCommand?
[ ] unicode-bidi: plaintext נשמר?
[ ] line-height ברירת מחדל 1.6 לא שונה גלובלית?
[ ] כותרות h1/h2/h3 לא נחתכות בין עמודים?
[ ] editor מאותחל עם '<p><br></p>' (לא ריק ולא עם תוכן שיורי)?
```
