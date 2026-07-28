# PAGE_RULES.md — חוקי הדף ⭐⭐⭐⭐⭐

> המסמך הקדוש. נקרא בשלב 1 של כל משימה — ללא יוצא מן הכלל. שום שינוי לא יפר אף חוק כאן. אם יש התנגשות — חוק הדף מנצח.

## חוק 1 — גודל דף A4

```css
.page {
  width: 21cm;
  min-height: 29.7cm;
}
```

* גודל קבוע ויחיד. אין תמיכה ב-Letter, A3, Landscape.
* `min-height` ולא `height` — הדף יכול להתארך, הגבול הוא ה-mask.

## חוק 2 — שוליים (Margins)

```css
.page {
  padding: 2.5cm;   /* כל הצדדים */
}
```

* 2.5cm מכל הצדדים כברירת מחדל.
* כשיש header → הוא ממוקם `position:absolute` בחלק העליון של ה-2.5cm. הוא לא מוסיף padding — הוא כלוא בתוך השוליים הקיימים.
* כשיש footer → אותו עיקרון, בחלק התחתון.
* ⚠️ אסור לשנות את ה-`padding` של `.page` בלי לעדכן את מיקום ה-header/footer.

## חוק 3 — הפרדת עמודים (Mask Technique)

```css
/* JS constants */
const PAGE_H_CM = 29.7;
const GAP_CM    = 1.5;

/* CSS mask — נותן מראה של דפים נפרדים */
.page {
  mask: repeating-linear-gradient(
    to bottom,
    black 0, black 29.7cm,           /* דף גלוי */
    transparent 29.7cm, transparent calc(29.7cm + 1.5cm)  /* פער 1.5cm */
  );
}
```

* אין div נפרד לכל עמוד — editor אחד רציף, הפרדה ויזואלית בלבד דרך CSS mask.
* פער בין עמודים: 1.5cm שקוף (תוכן בפער מוסתר ובלתי-נגיש לסמן).
* `paginateBlocks()` דוחף אלמנטים שנוחתים בפער → לתחילת הדף הבא.
* שורה שלמה עוברת לדף הבא — אסור שתיחתך באמצע.

## חוק 4 — חוקי מעבר דף (Break Rules)

```css
/* אלמנטים שלא נחתכים בין עמודים */
.page img, .page table, .page figure, .page blockquote, .page pre {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* כותרות לא נשארות לבד בסוף עמוד */
.page h1, .page h2, .page h3, .page h4 {
  break-after: avoid;
  page-break-after: avoid;
}

/* orphans/widows — מינימום 2 שורות */
.page p {
  orphans: 2;
  widows: 2;
}
```

## חוק 5 — כותרת עליונה ותחתונה (Header & Footer)

```css
.doc-header, .doc-footer {
  position: absolute;
  inset-inline: 2.5cm;   /* מיושרים לשוליים */
  z-index: 6;
  font-size: 10pt;
}
.doc-header { border-bottom: 1px solid #cbd5e1; top: 1.1cm; }   /* top: i*cycle + 1.1cm */
.doc-footer { border-top:    1px solid #cbd5e1; top: pageH - 1.3cm; } /* 1.3cm מסוף הדף */
```

* שניהם קיימים: header עליון + footer תחתון.
* ממוקמים בתוך ה-2.5cm padding — header ב-1.1cm מתחילת הדף, footer ב-1.3cm מסופו.
* לא מוסיפים שוליים — הם חיים בתוך השוליים הקיימים של 2.5cm.
* רקע אטום (`background: var(--page-bg)`) — מכסה טקסט גוף שזולג לאזור השוליים.
* הפער הוויזואלי בין עמודים: `GAP_CM = 1.5cm` (mask שקוף — לא שוליים של טקסט).
* ⚠️ `inset-inline: 2.5cm` — אם משנים padding, חייבים לעדכן גם את הערך הזה.

## חוק 6 — מספור עמודים

* מספור אוטומטי, מתעדכן ב-`paginateBlocks()`.
* אלמנטי `.page-number` מוזרקים דינמית (לא קיימים ב-HTML סטטי).
* נעלמים בהדפסה (`display: none !important` ב-`@media print`).

## חוק 7 — ברירות מחדל טיפוגרפיות

```css
.page {
  font-size: 14pt;
  line-height: 1.6;       /* ברירת מחדל */
  direction: rtl;          /* דרך <html dir="rtl"> */
  unicode-bidi: plaintext; /* ערוב עברית+אנגלית */
}
```

* ריווח שורות אפשרי: 1.0 / 1.15 / 1.5 / 2.0 / 2.5 / 3.0 (דרך `lineSpacingMenu`)
* גופנים זמינים: Heebo, Segoe UI, David, Rubik, Arial, Times New Roman, Courier New
* גודל גופן ברירת מחדל: 14pt

## חוק 8 — תמונות בדף

```css
.page img {
  max-height: 24.7cm;   /* לא יותר מגובה הדף פחות שוליים */
  object-fit: contain;
}
```

* תמונה לא תחרוג מגובה עמוד אחד.
* תמונות/טבלאות/blockquotes: `break-inside: avoid` (ראה חוק 4).

## ✅ צ'קליסט לפני כל שינוי

```
[ ] width נשאר 21cm ו-min-height 29.7cm?
[ ] padding נשאר 2.5cm? (ואם שונה — עדכנת inset-inline של header/footer?)
[ ] ה-mask GAP_CM נשאר 1.5cm?
[ ] paginateBlocks() עדיין דוחף לדף הבא נכון?
[ ] break-inside:avoid על תמונות/טבלאות?
[ ] orphans/widows נשמרים (מינימום 2)?
[ ] מספור עמודים מתעדכן אוטומטי?
[ ] הדפסה/PDF: page-break-after:always + @page {size:A4}?
```

אם תשובה אחת היא "לא" — עצור והתייעץ לפני שממשיכים.
