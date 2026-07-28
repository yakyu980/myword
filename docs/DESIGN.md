# DESIGN.md — עיצוב ⭐⭐

> קרא כשהמשימה נוגעת ל-CSS variables, גופנים, זום, או מראה ה-UI.
> שינויי עיצוב כפופים ל-[`PAGE_RULES.md`](PAGE_RULES.md) — קרא אותו קודם.

---

## חוק 1 — CSS Variables (הכל דרך :root)

```css
:root {
  --bg:        #e8eaf0;   /* רקע אזור העריכה */
  --panel:     #ffffff;   /* רקע toolbar/sidebar */
  --primary:   #6366f1;   /* צבע ראשי (כחול-סגול) */
  --primary-d: #4338ca;   /* צבע ראשי כהה יותר */
  --text:      #1f2937;   /* טקסט ראשי */
  --text-soft: #6b7280;   /* טקסט משני / labels */
  --border:    #e2e8f0;   /* גבולות */
  --page-bg:   #ffffff;   /* רקע הדף */
  --page-text: #1f1f1f;   /* טקסט על הדף */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.12);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.15);
  --r:         8px;        /* border-radius סטנדרטי */
}
```

⚠️ **אסור** להשתמש ב-hex קשיח בקוד חדש — תמיד דרך variables.
⚠️ **אסור** לשנות `--primary` בלי לבדוק כל המקומות שמשתמשים בו.

---

## חוק 2 — גופנים זמינים

| גופן | שפה | הערה |
|------|-----|------|
| Heebo | עברית | ברירת מחדל לממשק |
| Segoe UI | אנגלית | ברירת מחדל לממשק |
| Inter | אנגלית | |
| Arial | שתיהן | |
| Times New Roman | שתיהן | |
| Georgia | אנגלית | |
| Courier New | שתיהן | monospace |
| Verdana | אנגלית | |
| Tahoma | שתיהן | |
| David | עברית | קלאסי |
| Narkisim | עברית | |

**גופן ברירת מחדל לדף:** `14pt`, `Segoe UI / Heebo`
**גופן ברירת מחדל לממשק:** `'Segoe UI', 'Heebo', system-ui`

⚠️ להוסיף גופן חדש → הוסף `<option>` ב-`#fontNameSelect` + וודא שהגופן נטען (Google Fonts / system).

---

## חוק 3 — זום תצוגה

```js
// טווח: 50% עד 200%, קפיצות של 10%
window._docZoom = 1; // ברירת מחדל
function applyZoom(pct) {
  pct = Math.max(50, Math.min(200, Math.round(pct / 10) * 10));
  window._docZoom = pct / 100;
  pageStack.style.zoom = window._docZoom; // zoom ולא transform!
}
```

**חשוב — `zoom` ולא `transform: scale`:**
- `zoom` משנה את הפריסה והגלילה בהתאם
- `transform: scale` לא היה מזיז את ה-scrollbar

**השפעה על Drag:**

```js
// בכל חישוב drag — חלק ב-zoom!
const _z = window._docZoom || 1;
const dx = (e.pageX - startX) / _z;
const dy = (e.pageY - startY) / _z;
```

⚠️ כל קוד שמחשב מיקום/גודל בפיקסלים **חייב** לקחת בחשבון `window._docZoom`.

---

## חוק 4 — border-radius סטנדרטי

```css
--r: 8px  /* כפתורים, כרטיסים, dropdowns */
/* חריגים מקובלים: */
border-radius: 50%    /* כפתורים עגולים */
border-radius: 12px   /* modals, panels גדולים */
border-radius: 4px    /* אלמנטים קטנים (תגיות, chips) */
```

---

## חוק 5 — Z-Index Map (אסור לשנות בלי לעדכן כאן)

```
1      — .page (עמודים)
6      — .doc-header, .doc-footer
10     — .img-inline (תמונות inline)
15     — .free-obj (אובייקטים חופשיים ברירת מחדל)
20     — .obj-toolbar (toolbar של אובייקט)
21     — .resize-handle, .rotate-handle
25     — .free-obj[above-text]
10     — .ribbon / .toolbar
9998   — .status (שורת סטטוס)
9999   — .zoom-ctrl
9999   — #rcMenu (תפריט ימני)
10000  — .wrap-panel
10050  — .font-size-menu
```

---

## חוק 6 — מצבי עיצוב (Themes)

**מצב נוכחי:** theme יחיד (light בלבד) — `:root` קבוע.

❌ **אין dark mode / sepia / prodark** — למרות שצוינו בשיחות קודמות, אינם ממומשים ב-v2.

---

## ✅ צ'קליסט לפני שינוי עיצוב

```
[ ] צבעים חדשים דרך CSS variables בלבד (לא hex קשיח)?
[ ] גופן חדש — נוסף ל-fontNameSelect + נטען?
[ ] z-index חדש — עדכנת את הטבלה למעלה?
[ ] חישובי מיקום חדשים — לוקחים בחשבון window._docZoom?
[ ] border-radius תואם את --r או חריג מוצדק?
```
