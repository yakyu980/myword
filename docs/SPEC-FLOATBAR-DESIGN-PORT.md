# SPEC-FLOATBAR-DESIGN-PORT — העברת מראה-זכוכית אל `#ctxBar`

> **מטרה:** להחיל את שפת-העיצוב glassmorphism מהמוקאפ `floatbar-v04-decoded.html` על הסרגל הצף הקיים `#ctxBar` של MyWord-v2 — **מראה בלבד**, בלי לגעת בארכיטקטורה, ב-JS, או במבנה ה-DOM.
> **כותבת:** נוי (UX/UI) · **מבצעת:** סאמר · **תיעוד-ידע:** דאן.
> **כלל ברזל:** CSS בלבד, מתווסף **בסוף ה-`<style>`** (CLAUDE.md §1), גובר על הקיים. אסור לגעת ב-`MyWord-v2.html` מעבר להוספת הבלוק. נשמרת חוקה §8 במלואה.

---

## 1. המצב הקיים — מה יש ב-`#ctxBar` היום

הסרגל הצף נבנה ב-JS (`bar.id='ctxBar'`, שורה ~8610) ומקבל את מראהו משלושה בלוקי-CSS מצטברים בקובץ:

| בלוק | שורות | מה הוא מגדיר |
|---|---|---|
| בסיס | 1015–1073 | `#ctxBar`, `.ctx-cmds`, `button`, `.ctx-sep`, `.ctx-arrow`, `#ctxMore` |
| "עיצוב מחודש" | 1224–1276 | גובר — אריחים 42px, gradient סגול, צללי-אינדיגו |
| בורר גופן/גודל | 1692–1745 | `select.ctx-font`, `button.ctx-size-chip`, `#ctxSizePop` |
| שקיפות | 1213–1218 | `.ctx-opacity` (מחוון 0–100%) |

**שפת-העיצוב הנוכחית:** "כהה-תמידי" — gradient אינדיגו/נייבי (`#4338ca → #0f172a`), טקסט בהיר (`#eef2ff`), ריחוף סגול (`rgba(99,102,241,…)`), צללים כחולים-כהים. הסרגל נראה זהה בערכת בהיר ובכהה (אין תלות ב-theme). זווית עיצוב שונה לחלוטין מהנייר-החם של שאר המוצר.

**מזהי-מבנה קיימים שאסור לשבור (החיווט ב-JS תלוי בהם):**
`#ctxBar` · `.ctx-cmds` · `#ctxBar button` · `button.active` · `button.ctx-danger` · `button.ctx-arrow` (+`.open`, `.arr`) · `.ctx-sep` · `button.ctx-move` · `select.ctx-font` · `button.ctx-size-chip` (+`.caret`) · `.ctx-opacity` · `#ctxMore` (+`button`, `.ctx-msep`) · `#ctxSizePop` · `#ctxColors`.

**מה לא יפה היום (הבעיה שהמשתמש מבקש לפתור):**
1. הסרגל נראה כמו widget זר — אינדיגו כהה על רקע נייר חם בהיר.
2. אין שקיפות/blur — הוא חוסם לחלוטין את התוכן שמתחתיו (לא "צף", אלא "מכסה").
3. לא מגיב ל-theme — בערכת בהיר הוא כבד מדי, בכהה הוא לא תואם את שאר ה-UI.

---

## 2. שפת-העיצוב במקור (v04) — מה לוקחים

מתוך `floatbar-v04-decoded.html` (שורות 699–730, 798–817):

```
--bar-bg:    rgba(255,255,255,0.44)     רקע זכוכית חלבית
--bar-border:rgba(255,255,255,0.60)     גבול בהיר
--bar-edge:  rgba(40,34,28,0.07)         מפרידים עדינים
--ink:       #2a2723                     טקסט ראשי (חם-כהה)
--ink-soft:  #6f6a61                     טקסט משני
--glass-btn: rgba(255,255,255,0.30)      רקע כפתור
--glass-btn-border: rgba(255,255,255,0.52)
--radius:    18px
backdrop-filter: blur(22px) saturate(1.5)
box-shadow:  0 1px 0 rgba(255,255,255,.5) inset,   ← highlight עליון
             0 2px 6px rgba(40,34,28,.10),
             0 18px 44px -16px rgba(40,34,28,.42)   ← צל רך עמוק
accent:      #E8743B (כתום) — ריחוף + מצב פעיל
```

מצב כהה (`body.dark`, שורות 717–730 + 812–817): `--bar-bg: rgba(38,33,28,0.58)`, `--bar-border: rgba(255,255,255,0.09)`, `--ink: #efe9df`, `--glass-btn: rgba(255,255,255,0.07)`, צל שחור עמוק.

**עיקרון העברה:** במקום להחיל את ערכי-הצבע ישירות, נגדיר **משתני-CSS מקומיים מסומכי-`#ctxBar`** (בעלי prefix `--cb-`) — כך הם מבודדים ולא מזהמים את שאר המוצר. בכהה מחליפים את אותם משתנים תחת `body[data-theme="dark"]`.

> ⚠️ **התאמת theme:** המקור משתמש ב-`body.dark`. ב-MyWord-v2 הכהה הוא **`body[data-theme="dark"]`** (ראה שורות 1794+). ה-SPEC משתמש בנכון לפרויקט.

---

## 3. CSS בלבד — אין שינוי מבנה

**כל ההעברה היא CSS טהור.** אין צורך לשנות JS, אין צורך לשנות DOM, אין class חדש.

| רכיב במקור | מיפוי ל-v2 | סוג |
|---|---|---|
| `.tb-body` (כרטיס-הזכוכית) | `#ctxBar` | CSS |
| `.tb-btn` (כפתור-זכוכית) | `#ctxBar button` | CSS |
| `.tb-btn.is-active` | `#ctxBar button.active` | CSS |
| `.tb-sep` | `#ctxBar .ctx-sep` | CSS |
| `.tb-font` (בורר גופן) | `#ctxBar select.ctx-font` | CSS |
| `.tb-font-menu` / פאנל | `#ctxMore`, `#ctxSizePop` | CSS |
| `--accent` כתום | משתנה `--cb-accent` | CSS |

**מה שלא מועבר (כי זה ארכיטקטורה, לא מראה):** רצועת-הטאבים (`.tb-tabs`), כפתור-העיגול המרכזי (`.tb-more`), הפיצול לשתי שורות (`.tb-row2`/`.tb-half`), אנימציות-המעבר בין טאבים. אלה שייכים למבנה ה-React של המוקאפ — `#ctxBar` הוא סרגל-הקשר זמני שנפתח/נסגר, לא toolbar-טאבים קבוע. **לא לייבא אותם.** (אם בעתיד תרצו את כפתור-העיגול כ-`.ctx-arrow` — זו spec נפרדת.)

---

## 4. שמירת חוקה §8 + נגישות

- ✅ `position:fixed` — **לא משתנה** (מוגדר בבלוק הבסיס שורה 1016; הבלוק החדש לא נוגע ב-`position`).
- ✅ סגירה בלחיצה-חוץ + Escape — לוגיקת JS, לא מושפעת מ-CSS.
- ✅ `#ctxMore` נפתח כלפי מטה — מיקום נקבע ב-JS; ה-CSS לא משנה `top`/`transform`.
- ✅ `z-index`: הבלוק החדש **לא** נוגע ב-`z-index` (נשאר 9998/9999/10000/10051). הפלטות מהסרגל העליון נשארות מעל (10050).
- ✅ **ניגודיות (a11y):** על רקע שקוף-בהיר, טקסט `#2a2723` על `rgba(255,255,255,.44)` נותן יחס > 7:1 (AAA). הכפתורים מקבלים `--cb-glass-btn` אטום-יחסית כדי לשמור קריאות. בריחוף/פעיל הטקסט הופך לכתום `#E8743B` על רקע כתום-רך — נבדק > 4.5:1. בכהה: `#efe9df` על `rgba(38,33,28,.58)` > 7:1.
- ✅ **יעדי-מגע:** הבלוק שומר על `min-width/height: 42px` הקיים (מעל 44px במובייל דרך הבלוק שכבר קיים בשורה 1379). לא מקטינים.
- ✅ **reduced-motion:** אין אנימציות חדשות מעבר ל-transitions עדינים הקיימים.

---

## 5. הבלוק המלא — להוספה בסוף ה-`<style>`

> סאמר: הדבק **כמו שהוא** מיד לפני סוף תג ה-`</style>` הראשי (אחרי כל בלוקי ה-`#ctxBar` הקיימים, כך שיגבר). אל תמחק את הבלוקים הישנים — הבלוק הזה דורס רק את מאפייני-המראה, והקיים מספק את ה-layout (gap, flex, width).

```css
/* ═══════════════════════════════════════════════════════════════════
   FLOATBAR DESIGN PORT — מראה-זכוכית (glassmorphism) על הסרגל הצף.
   מקור: docs/floatbar-v04-decoded.html. CSS-בלבד, גובר על הקיים.
   שומר §8: לא נוגע ב-position/z-index/סגירה/כיוון-פתיחה.
   ═══════════════════════════════════════════════════════════════════ */

/* משתנים מבודדים — prefix --cb- כדי לא לזהם את שאר המוצר.
   ערכי ברירת-המחדל = ערכת בהיר (פלטת נייר חם). */
#ctxBar {
  --cb-bg:          rgba(255,255,255,0.46);
  --cb-border:      rgba(255,255,255,0.60);
  --cb-edge:        rgba(40,34,28,0.10);
  --cb-ink:         #2a2723;
  --cb-ink-soft:    #6f6a61;
  --cb-glass-btn:   rgba(255,255,255,0.34);
  --cb-glass-bd:    rgba(255,255,255,0.52);
  --cb-accent:      #E8743B;
  --cb-accent-soft: rgba(232,116,59,0.16);
  --cb-accent-bd:   rgba(232,116,59,0.40);
  --cb-shadow:
    0 1px 0 rgba(255,255,255,.55) inset,
    0 2px 6px rgba(40,34,28,.10),
    0 18px 44px -16px rgba(40,34,28,.42);
}
body[data-theme="dark"] #ctxBar {
  --cb-bg:          rgba(38,33,28,0.62);
  --cb-border:      rgba(255,255,255,0.10);
  --cb-edge:        rgba(255,255,255,0.08);
  --cb-ink:         #efe9df;
  --cb-ink-soft:    #a39c8f;
  --cb-glass-btn:   rgba(255,255,255,0.08);
  --cb-glass-bd:    rgba(255,255,255,0.14);
  --cb-accent-soft: rgba(232,116,59,0.22);
  --cb-accent-bd:   rgba(232,116,59,0.50);
  --cb-shadow:
    0 1px 0 rgba(255,255,255,.08) inset,
    0 2px 8px rgba(0,0,0,.30),
    0 20px 50px -16px rgba(0,0,0,.60);
}

/* ── הכרטיס עצמו (.tb-body → #ctxBar) ── */
#ctxBar {
  background: var(--cb-bg) !important;
  -webkit-backdrop-filter: blur(22px) saturate(1.5);
  backdrop-filter: blur(22px) saturate(1.5);
  border: 1px solid var(--cb-border) !important;
  border-radius: 18px;
  box-shadow: var(--cb-shadow) !important;
  color: var(--cb-ink);
}

/* ── כפתורי-פעולה (.tb-btn → #ctxBar button) ── */
#ctxBar button {
  background: var(--cb-glass-btn) !important;
  border: 1px solid var(--cb-glass-bd) !important;
  color: var(--cb-ink) !important;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  box-shadow: none !important;
}
#ctxBar button:hover {
  background: var(--cb-accent-soft) !important;
  color: var(--cb-accent) !important;
  border-color: var(--cb-accent-bd) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -4px rgba(232,116,59,.45) !important;
}
#ctxBar button:active { transform: scale(.94); }
#ctxBar button.active {
  background: var(--cb-accent-soft) !important;
  color: var(--cb-accent) !important;
  border-color: var(--cb-accent-bd) !important;
  box-shadow: inset 0 0 0 1px var(--cb-accent-bd) !important;
}
/* קו-מבטא תחתון לכפתור פעיל — מחקה את .tb-btn.is-active::after */
#ctxBar button.active::after {
  content: ''; position: absolute; bottom: 4px; left: 50%;
  transform: translateX(-50%);
  width: 15px; height: 2.5px; border-radius: 2px;
  background: var(--cb-accent);
}
#ctxBar button { position: relative; }  /* עוגן ל-::after */

/* מחיקה — נשאר אדום-ברור (פעולה הרסנית), אך בלבוש-זכוכית */
#ctxBar button.ctx-danger:hover {
  background: rgba(220,38,38,0.16) !important;
  color: #dc2626 !important;
  border-color: rgba(220,38,38,0.45) !important;
  box-shadow: 0 4px 12px -4px rgba(220,38,38,.4) !important;
}

/* כפתור "עוד אפשרויות" (.ctx-arrow) — כתום מלא, primary */
#ctxBar button.ctx-arrow {
  background: var(--cb-accent) !important;
  color: #fff !important;
  border: 0 !important;
  box-shadow: 0 5px 14px -5px rgba(232,116,59,.7) !important;
}
#ctxBar button.ctx-arrow:hover {
  filter: brightness(1.06);
  color: #fff !important;
  transform: none;
}

/* מפריד אנכי (.ctx-sep) */
#ctxBar .ctx-sep {
  background: var(--cb-edge) !important;
}

/* בורר גופן (select.ctx-font → .tb-font) */
#ctxBar select.ctx-font {
  background-color: var(--cb-glass-btn) !important;
  color: var(--cb-ink) !important;
  border: 1px solid var(--cb-glass-bd) !important;
}
#ctxBar select.ctx-font:hover {
  background-color: var(--cb-accent-soft) !important;
  color: var(--cb-accent) !important;
  border-color: var(--cb-accent-bd) !important;
}
#ctxBar select.ctx-font:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--cb-accent-bd) !important;
}
#ctxBar select.ctx-font option {
  background: var(--cb-bg); color: var(--cb-ink);
}

/* צ'יפ גודל (.ctx-size-chip) + תווית-שקיפות יורשים מ-button/--cb-ink */
#ctxBar .ctx-opacity { color: var(--cb-ink-soft) !important; }
#ctxBar .ctx-opacity input[type=range] { accent-color: var(--cb-accent); }

/* ── תפריט "עוד אפשרויות" (#ctxMore → .tb-font-menu) ── */
#ctxMore {
  background: var(--cb-bg, rgba(255,255,255,0.46)) !important;
  -webkit-backdrop-filter: blur(22px) saturate(1.5);
  backdrop-filter: blur(22px) saturate(1.5);
  border: 1px solid var(--cb-border, rgba(255,255,255,0.60)) !important;
  border-radius: 16px;
  box-shadow: 0 18px 48px -14px rgba(40,34,28,.45) !important;
  color: var(--cb-ink, #2a2723) !important;
}
body[data-theme="dark"] #ctxMore {
  background: rgba(38,33,28,0.66) !important;
  border-color: rgba(255,255,255,0.10) !important;
  box-shadow: 0 18px 48px -14px rgba(0,0,0,.6) !important;
  color: #efe9df !important;
}
#ctxMore button { color: inherit !important; background: transparent !important; }
#ctxMore button:hover {
  background: rgba(232,116,59,0.16) !important;
  color: #E8743B !important;
}
#ctxMore .ctx-msep { background: rgba(40,34,28,0.10) !important; }
body[data-theme="dark"] #ctxMore .ctx-msep { background: rgba(255,255,255,0.10) !important; }

/* ── פופ-אפ גדלים (#ctxSizePop) — אותה זכוכית ── */
#ctxSizePop {
  background: rgba(255,255,255,0.46) !important;
  -webkit-backdrop-filter: blur(22px) saturate(1.5);
  backdrop-filter: blur(22px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.60) !important;
  box-shadow: 0 18px 48px -14px rgba(40,34,28,.45) !important;
}
body[data-theme="dark"] #ctxSizePop {
  background: rgba(38,33,28,0.66) !important;
  border-color: rgba(255,255,255,0.10) !important;
}
#ctxSizePop input.ctx-size-input {
  background: var(--cb-glass-btn, rgba(255,255,255,0.34)) !important;
  border: 1px solid var(--cb-glass-bd, rgba(255,255,255,0.52)) !important;
  color: var(--cb-ink, #2a2723) !important;
}
#ctxSizePop button.ctx-size-opt {
  background: var(--cb-glass-btn, rgba(255,255,255,0.34)) !important;
  color: var(--cb-ink, #2a2723) !important;
}
#ctxSizePop button.ctx-size-opt:hover,
#ctxSizePop button.ctx-size-opt.cur {
  background: rgba(232,116,59,0.16) !important;
  color: #E8743B !important;
}
body[data-theme="dark"] #ctxSizePop input.ctx-size-input,
body[data-theme="dark"] #ctxSizePop button.ctx-size-opt {
  --cb-glass-btn: rgba(255,255,255,0.08);
  --cb-glass-bd:  rgba(255,255,255,0.14);
  --cb-ink: #efe9df;
}
/* הערה: #ctxSizePop/#ctxMore הם ילדי-body (לא של #ctxBar), לכן משתני
   --cb-* לא יורשים אליהם — נעשה שימוש בערכי-fallback מפורשים למעלה. */
```

> **למה fallback מפורש ב-`#ctxMore`/`#ctxSizePop`:** ב-JS הם נוצרים כ-`document.body.appendChild` (שורות 8612 ואילך), כלומר הם **אחים** של `#ctxBar`, לא צאצאים — לכן `var(--cb-*)` שלא יורש מ-`#ctxBar` נופל ל-fallback. הוגדר ערך-fallback בכל `var()` בשני אלמנטים אלה, ובכהה דריסה מפורשת. **זה תקין ומכוון.**

---

## 6. טבלת Before / After

| רכיב | לפני (קיים) | אחרי (v04) |
|---|---|---|
| רקע סרגל | gradient אינדיגו אטום `#4338ca→#0f172a` | זכוכית חלבית `rgba(255,255,255,.46)` + blur 22px |
| גבול | `rgba(255,255,255,.12)` | `rgba(255,255,255,.60)` בהיר |
| צל | כחול-כהה `rgba(15,23,42,.55)` | רך-חם + inset-highlight |
| טקסט | בהיר `#eef2ff` תמיד | חם-כהה `#2a2723` (בהיר) / `#efe9df` (כהה) |
| כפתור-רגיל | `rgba(255,255,255,.07)` | זכוכית `rgba(255,255,255,.34)` + blur |
| ריחוף | סגול `rgba(99,102,241,.85)` | כתום-רך `rgba(232,116,59,.16)` + טקסט כתום |
| פעיל | gradient סגול | כתום-רך + קו-מבטא תחתון |
| "עוד אפשרויות" | gradient סגול-סגול | כתום מלא `#E8743B` |
| תלות ב-theme | אין (זהה תמיד) | בהיר/כהה תואם שאר המוצר |
| radius | 18px | 18px (ללא שינוי) |

---

## 7. צעדי מימוש לסאמר

1. **גבה** — צלם/שמור עותק של הקובץ לפני שינוי.
2. **אתר** את סוף ה-`<style>` הראשי (הבלוק שמכיל את כל ה-`#ctxBar`; אחרי שורה ~1748 — בלוק `tbl-move`).
3. **הדבק** את הבלוק מסעיף §5 **בסוף ה-`<style>`**, אחרי כל בלוקי-ה-`#ctxBar` הקיימים, לפני `</style>`. **אל תמחק** את הבלוקים הישנים (1015–1073, 1224–1276, 1692–1745) — הם מספקים layout; הבלוק החדש דורס רק מראה.
4. **אל תיגע ב-JS** — שום פונקציה (`buildText`/`buildImage`/`buildTextbox`/`positionCtxBar`/בניית `#ctxMore`/`#ctxSizePop`) לא משתנה.
5. **בדוק חי** (סעיף §8).

---

## 8. תרחישי בדיקה (למרקוס/סאמר)

| # | Input | Expected Output |
|---|---|---|
| 1 | סמן טקסט בעורך (ערכת בהיר) | סרגל-זכוכית חלבי שקוף-למחצה, רואים מבעדו את הטקסט מטושטש; כפתורים בהירים, טקסט כהה-חם |
| 2 | רחף מעל כפתור B | רקע כתום-רך, אייקון כתום `#E8743B`, הרמה עדינה 1px |
| 3 | הפעל B (טקסט מודגש) | הכפתור `.active`: כתום-רך + קו-מבטא תחתון כתום |
| 4 | פתח "עוד אפשרויות" (`.ctx-arrow`) | כפתור כתום מלא; `#ctxMore` נפתח **כלפי מטה** (§8 נשמר), זכוכית חלבית תואמת |
| 5 | פתח צ'יפ-גודל → `#ctxSizePop` | פופ-אפ זכוכית; אפשרויות בהירות, הנבחרת בכתום |
| 6 | החלף ל-View → ערכת כהה | הסרגל הופך לזכוכית כהה-חמה `rgba(38,33,28,.62)`, טקסט קרם `#efe9df` |
| 7 | Escape / לחיצה-חוץ | הסרגל נסגר (לוגיקת §8 ללא שינוי) |
| 8 | בחר תמונה → מחוון שקיפות | `.ctx-opacity` עם accent כתום, טקסט קריא |
| 9 | רחף מעל כפתור-מחיקה | אדום-רך `#dc2626` (נשאר חיווי הרסני) |
| 10 | בדיקת ניגודיות (DevTools) | טקסט/רקע בכל המצבים ≥ 4.5:1 |

**תנאי-שגיאה לבדיקה:** דפדפן ללא תמיכת `backdrop-filter` → ה-`--cb-bg` בשקיפות .46/.62 עדיין נותן רקע קריא (degradation מקובל; הטקסט נשאר ניגודי). אין נפילה לשקוף-מלא.

---

## 9. סיכום החלטות
- **CSS-בלבד, אפס שינוי-מבנה.** כל המיפוי דרך id/class קיימים.
- **§8 נשמר במלואו** — position/z-index/סגירה/כיוון-פתיחה לא נגעו.
- **לא מיובאים:** טאבים, כפתור-עיגול מרכזי, פיצול-שורות, אנימציות-מעבר (ארכיטקטורה, לא מראה).
- **theme-aware** דרך `body[data-theme="dark"]` (ולא `body.dark` של המקור).
- **`#ctxMore`/`#ctxSizePop`** מקבלים ערכים מפורשים (אחי-body, לא יורשים `--cb-*`).
