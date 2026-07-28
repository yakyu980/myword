# SPEC-RIBBON-V03-PORT — העברת עיצוב הסרגל הראשי מ-V.03 ל-MyWord v2

> מחברת: נוי (UX/UI). מטרה: שהסרגל הראשי (לשונית "בית") של MyWord-v2 ייראה כמו
> "MyWord 3.0 Pro" (V.03) — **בלי לגעת בחיווט/JS, בלי להפר את חוקת הדף, בלי לפגוע ב-#mwRulerWrap.**
> **כל ה-CSS החדש נכתב בסוף ה-`<style>` (CLAUDE.md §1, §15).** לא להחליף בלוקים קיימים.

---

## 0. סיכום מנהלים — מה ההבדל שמרגישים

הסרגל הראשי של v2 היום הוא **"זכוכית"** (glassmorphism): רקע שקוף-לבן עם טשטוש,
ללא גובה קבוע, כפתורי-כלי קומפקטיים בשורה אחת, ומפרידי קבוצה דקים.

הסרגל של V.03 הוא **"Word קלאסי"**: רקע אטום בהיר (`--ribbon-bg`), **גובה קבוע 82px**,
צללית רכה מתחת, קבוצות בעמודות עם **תווית קטנה אפורה uppercase מתחת לכל קבוצה**,
ומפריד `border-left` בין קבוצות.

המעבר הוא **קוסמטי בלבד** — אנחנו לא מזיזים אף כפתור, לא משנים `id`, לא נוגעים ב-`onclick`/`data-cmd`.
רק מחליפים את שכבת ה-CSS שצובעת/ממקמת את הסרגל.

---

## 1. עוגנים בקוד (לאימות לפני עבודה)

### V.03 — מקור העיצוב `ישן/MyWord.html`
| מה | שורה |
|---|---|
| `:root` משתני צבע | 21–62 |
| `.ribbon` | 256–272 |
| `.group` / `.group-content` / `.group-label` | 274–300 |
| `button.tool` + `.tool.big` | 303–348 |
| `.ribbon-align-bar` (CSS) | 631–648 |
| יישור ריבון `[data-icon-align]` | 649–652 |
| HTML ribbon הבית `data-ribbon="home"` | 3172+ |
| floating toolbars (glassmorphism) | 997+ |

### v2 — היעד `MyWord-v2.html`
| מה | שורה |
|---|---|
| `:root` משתני צבע | 17–35 |
| `.ribbon` / `.ribbon.active` (glass) | 91–101 |
| `.toolbar` + `.toolbar .group` | 104–124 |
| `.toolbar .group-titled` + `.label` | 127–149 |
| `.ribbon .group-titled` (לשונית הוספה) | 714–726 |
| `#mwRulerWrap` (סרגל מדידה — **לא לגעת**) | 2180–2219 |
| `.app` grid-template-rows | 55 |
| HTML הסרגל הראשי `header.toolbar.ribbon.active[data-ribbon="home"]` | 2445–2621 |

> **קריטי:** הסרגל הראשי ב-v2 הוא `<header class="toolbar ribbon active" data-ribbon="home">` —
> **שני** ה-classes חלים עליו. כללי `.toolbar` (104–149) **גוברים** על `.ribbon.active` (כי מוגדרים אחריו, אותה ספציפיות).
> לכן כדי לשנות את מראה לשונית הבית **חייבים** לדרוס את כללי `.toolbar` — לא רק את `.ribbon`.

---

## 2. מיפוי משתני-צבע — V.03 ↔ v2

V.03 משתמש בפלטה עשירה יותר. ב-v2 חלק מהמשתנים **חסרים**. ההמלצה: **לא** לשנות את `:root` הקיים של v2
(זה משפיע על כל האפליקציה) — אלא **להוסיף בסוף ה-`<style>`** את המשתנים החסרים שהפורט צריך.

| תפקיד | משתנה V.03 | ערך V.03 (בהיר) | קיים ב-v2? | פעולה |
|---|---|---|---|---|
| רקע ריבון | `--ribbon-bg` | `#f8fafc` | ❌ | להוסיף `--ribbon-bg:#f8fafc` |
| רקע פאנל | `--panel` | `#ffffff` | ✅ `#ffffff` | להשתמש בקיים |
| גבול | `--border` | `#e2e8f0` | ✅ `#e2e8f0` | להשתמש בקיים |
| גבול-ביניים | `--border-mid` | `#cbd5e1` | ❌ | להוסיף `--border-mid:#cbd5e1` |
| טקסט-רך (תוויות) | `--text-soft` | `#64748b` | ✅ `#6b7280` | להשתמש בקיים |
| hover | `--hover` | `#eff6ff` | ❌ | להוסיף `--hover:#eff6ff` |
| רקע-פעיל | `--active-bg` | `#dbeafe` | ❌ | להוסיף `--active-bg:#dbeafe` |
| צבע מותג | `--primary` | `#2563eb` | ✅ `#6366f1` | **להשאיר את `#6366f1` של v2** (זה ה-brand הסגול שלנו; לא לאמץ את הכחול של V.03) |
| צללית-S | `--shadow-sm` | `0 1px 3px…` | ✅ | להשתמש בקיים |
| צללית-M | `--shadow-md` | `0 4px 12px…` | ✅ | להשתמש בקיים |
| רדיוס | `--r-sm/-md` | `6/10px` | חלקית (`--r:8px`) | להוסיף `--r-sm:6px; --r-md:10px` |

**החלטת מותג:** אנחנו מאמצים את **המבנה והפריסה** של V.03, אבל שומרים על **צבע המותג הסגול (`#6366f1`)** של v2
לעקביות עם שאר הלשוניות (הוספה/פריסה) שכבר משתמשות בסגול. כך הסרגל ייראה "Word-קלאסי" אבל נשאר MyWord.

**הוספה בסוף ה-`<style>` (תחת `:root` חדש שמרחיב את הקיים):**
```css
/* ── V.03 ribbon port: משתנים חסרים ── */
:root{
  --ribbon-bg:#f8fafc;
  --border-mid:#cbd5e1;
  --hover:#eff6ff;
  --active-bg:#dbeafe;
  --r-sm:6px;
  --r-md:10px;
}
[data-theme="dark"]{
  --ribbon-bg:#1e293b;
  --border-mid:#475569;
  --hover:#1e3a5f;
  --active-bg:#1e3a5f;
}
```
> מקור הערכים הכהים: V.03 שורות 68–70.

---

## 3. טבלת Before / After — מה משתנה ויזואלית

| תכונה | v2 כיום (glass) | V.03 (יעד) | משפיע על |
|---|---|---|---|
| רקע הסרגל | `rgba(255,255,255,0.44)` + `blur(22px)` | אטום `var(--ribbon-bg)` `#f8fafc` | `.toolbar.ribbon.active` |
| גובה | ללא min-height (משתנה) | **`min-height:82px`** קבוע | `.toolbar.ribbon.active` |
| padding | `8px 12px` | `5px 12px` | `.toolbar.ribbon.active` |
| gap בין קבוצות | `6px` | `4px` | `.toolbar.ribbon.active` |
| יישור פריטים | `align-items:center` | `align-items:stretch` (קבוצות נמתחות לגובה) | `.toolbar.ribbon.active` |
| צללית | `0 18px 44px…` כבדה | `0 2px 8px -2px rgba(0,0,0,0.08)` רכה | `.toolbar.ribbon.active` |
| גבול תחתון | `1px solid rgba(255,255,255,0.6)` | `1px solid var(--border)` | `.toolbar.ribbon.active` |
| מפריד בין קבוצות | `border-inline-end` (קיים) | `border-inline-end` 1px (נשאר) | `.toolbar .group(-titled)` |
| תווית קבוצה | `.label` 10px רגיל | 9.5px **uppercase**, letter-spacing 0.6, opacity .75 | `.toolbar .label` |
| כפתורי-כלי | `button` כללי (rounded 8) | `.tool` 28px, hover עם border-mid + shadow-sm | כפתורי הסרגל |
| מצב active | `background:var(--primary)` מלא כחול | `--active-bg` תכלת + border primary + טקסט primary | `button.active` בתוך הסרגל |

> **לא משתנה:** מספר הקבוצות, סדר הכפתורים, ה-`id`-ים, ה-`title`-ים, וה-`data-cmd`/`onclick`.
> סרגל המדידה `#mwRulerWrap` יושב **מתחת** לסרגל (ב-grid row נפרד) — לא מושפע.

---

## 4. שינויי CSS — בדיוק מה לכתוב (בסוף ה-`<style>`)

> כל הסלקטורים מכוונים ל-`[data-ribbon="home"]` או ל-`.toolbar.ribbon` כדי **לא** לפגוע
> בלשוניות `.ribbon` האחרות (הוספה/פריסה/כלים/תצוגה) שכבר עוצבו ל-glassmorphism.
> אם רוצים את אותו מראה גם בשאר הלשוניות — מרחיבים את הסלקטור (ראה §7).

### 4.1 מיכל הסרגל — דורס את ה-glass

```css
/* ════ V.03 RIBBON PORT — מראה "Word קלאסי" ללשונית הבית ════ */
/* דורס את .toolbar + .ribbon.active עבור הסרגל הראשי בלבד */
.toolbar.ribbon[data-ribbon="home"].active{
  background: var(--ribbon-bg) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border-bottom: 1px solid var(--border) !important;
  box-shadow: 0 2px 8px -2px rgba(0,0,0,0.08) !important;
  padding: 5px 12px !important;
  gap: 4px !important;
  align-items: stretch !important;       /* קבוצות נמתחות לגובה אחיד */
  min-height: 82px;                       /* גובה קבוע כמו V.03 */
  flex-wrap: wrap;
}
```
> שימוש ב-`!important` כאן הכרחי כי כללי `.ribbon.active` (91) ו-`.toolbar` (104) כבר מגדירים
> את אותן תכונות באותה ספציפיות. הסלקטור `.toolbar.ribbon[data-ribbon="home"].active`
> ספציפי יותר משניהם — ה-`!important` הוא חגורת-בטיחות מול ה-`!important` שב-`.ribbon.active`.

### 4.2 קבוצות — עמודה + מפריד + תווית תחתית

ב-v2 יש שני סוגי קבוצות בסרגל הבית: `.group` (פסקה/יישור/רשימות/היסטוריה) ו-`.group-titled` (גופן).
ב-V.03 כולן אחידות (`.group` בעמודה + `.group-label`). נאחד את המראה:

```css
/* כל הקבוצות בסרגל הבית — עמודה, מפריד שמאלי, גובה אחיד */
.toolbar.ribbon[data-ribbon="home"] .group,
.toolbar.ribbon[data-ribbon="home"] .group-titled{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: stretch;                    /* מתיחה לגובה הסרגל */
  padding: 3px 8px 0;
  gap: 2px;
  border-inline-end: 1px solid var(--border);   /* RTL: המפריד בצד שמאל ויזואלית */
  border-left: none;                      /* מבטל border-left ישיר אם קיים */
}
.toolbar.ribbon[data-ribbon="home"] .group:last-of-type,
.toolbar.ribbon[data-ribbon="home"] .group-titled:last-of-type{
  border-inline-end: none;
}

/* שורת הכלים בתוך קבוצה רגילה (ל-.group שאין לו .rows) */
.toolbar.ribbon[data-ribbon="home"] .group{
  flex-direction: column;                 /* כלים למעלה, מקום לתווית למטה */
}
```

> **הערה ל-RTL:** ב-V.03 (LTR-flex) המפריד הוא `border-left`. ב-v2 העברית RTL, לכן
> `border-inline-end` נותן את אותו אפקט ויזואלי (קו בצד שמאל של הקבוצה). זה כבר הקונבנציה
> שב-v2 (שורות 116, 130, 718) — אנחנו עקביים איתה ולא חוזרים ל-`border-left` פיזי.

### 4.3 תווית קבוצה — סגנון V.03

V.03 משתמש ב-`.group-label`; v2 משתמש ב-`.label` בתוך `.group-titled`, ולקבוצות `.group` **אין תווית כלל**.
שני צעדים:

**(א) עיצוב התווית הקיימת** (`.label` של קבוצת הגופן):
```css
.toolbar.ribbon[data-ribbon="home"] .label{
  font-size: 9.5px;
  color: var(--text-soft);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 500;
  opacity: 0.75;
  padding-top: 4px;
  margin-top: auto;                       /* נדבק לתחתית הקבוצה */
}
```

**(ב) הוספת תוויות לקבוצות `.group` חסרות-תווית** — דורש שינוי HTML קטן (ראה §5).
אם רוצים מינימום-נגיעה ב-HTML, אפשר לדלג על (ב) ולחיות עם קבוצות ללא תווית, אבל זה **פוגע בדמיון** ל-V.03.
ההמלצה שלי: לבצע (ב) — זה מה שעושה את ה"Word-look".

### 4.4 כפתורי-כלי — סגנון `.tool` של V.03

כפתורי הסרגל ב-v2 הם `<button>` רגילים (ירשו את הכלל הגלובלי בשורות 46–52, כולל
`button.active{background:var(--primary)}` כחול-מלא). V.03 נותן להם מראה עדין יותר:

```css
/* כפתורי כלי בסרגל הבית — מראה V.03 */
.toolbar.ribbon[data-ribbon="home"] .group button,
.toolbar.ribbon[data-ribbon="home"] .group-titled button{
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  min-width: 28px;
  height: 28px;
  padding: 3px 7px;
  color: var(--text);
  transition: background .12s, border-color .12s, box-shadow .12s, transform .08s;
}
.toolbar.ribbon[data-ribbon="home"] .group button:hover,
.toolbar.ribbon[data-ribbon="home"] .group-titled button:hover{
  background: var(--hover);
  border-color: var(--border-mid);
  box-shadow: var(--shadow-sm);
}
.toolbar.ribbon[data-ribbon="home"] .group button:active,
.toolbar.ribbon[data-ribbon="home"] .group-titled button:active{
  transform: scale(0.94);
}
/* מצב פעיל (B/I/U מופעלים) — תכלת עדין במקום כחול-מלא */
.toolbar.ribbon[data-ribbon="home"] .group button.active,
.toolbar.ribbon[data-ribbon="home"] .group-titled button.active{
  background: var(--active-bg) !important;
  border-color: var(--primary) !important;
  color: var(--primary) !important;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.06) !important;
}
```
> ה-`!important` ב-`.active` הכרחי כדי לעקוף את `button.active{background:var(--primary);color:#fff}` הגלובלי (שורה 52).
> **לא לגעת** ב-class `.active` עצמו ב-JS — אותו class נשאר; רק ה-CSS שצובע אותו משתנה.

### 4.5 שדות select / input בסרגל

כדי שה-`#fontNameSelect` / `#fontSizeBtn` וכו' יתאימו לגובה 28px ולמראה:
```css
.toolbar.ribbon[data-ribbon="home"] select,
.toolbar.ribbon[data-ribbon="home"] .font-size-btn,
.toolbar.ribbon[data-ribbon="home"] .bs-btn{
  height: 28px;
}
```
> בדיקה ויזואלית בלבד — אם הם כבר 28px, לדלג.

---

## 5. שינויי HTML — מינימליים, בלי לשבור חיווט

> **כלל זה ברזל:** לא להסיר/לשנות `id`, `data-cmd`, `onclick`, `title`. רק **להוסיף** עטיפות/תוויות.

### 5.1 הוספת תוויות לקבוצות `.group` (להשלמת מראה V.03)

לכל `<div class="group">` שאין בו תווית, **להוסיף בסוף הקבוצה** אלמנט תווית:

| מיקום (שורה ~) | קבוצה | תווית להוספה |
|---|---|---|
| 2539–2558 | סגנון פסקה (`blockStyleBtn`) | `<div class="label">סגנונות</div>` |
| 2560–2578 | יישור + הזחה + מרווח | `<div class="label">פסקה</div>` |
| 2580–2611 | רשימות (תבליטים/ממוספרת) | `<div class="label">רשימות</div>` |
| 2613–2620 | בטל/חזור | `<div class="label">היסטוריה</div>` |

דוגמה (קבוצת היסטוריה, שורות 2613–2620) — **רק הוספה של השורה האחרונה**:
```html
<div class="group">
  <div class="undo-wrap" style="position:relative;display:inline-flex;">
    <button id="btnUndo" ... data-cmd="undo">↶</button>
    <button id="btnUndoMenu" class="undo-caret" ...>▾<span id="undoCount" class="undo-count"></span></button>
    <div id="undoMenu" class="undo-menu"></div>
  </div>
  <button id="btnRedo" ... data-cmd="redo">↷</button>
  <div class="label">היסטוריה</div>      <!-- ★ נוסף -->
</div>
```

> **חשוב:** ב-`.group` (בניגוד ל-`.group-titled`) הכלים הם ילדים ישירים ללא עטיפת `.rows`.
> ה-CSS ב-§4.2 הופך את `.group` ל-`flex-direction:column`, אז הכלים יסתדרו בשורה דרך wrapper פנימי
> או — פשוט יותר — לעטוף את הכלים הקיימים ב-`<div class="group-content">` כמו ב-V.03.
> **המלצה (אופציונלית, ליישור מושלם):** לעטוף את הכלים של כל `.group` ב-`<div class="group-content" style="display:flex;gap:4px;align-items:center;flex:1;">…</div>`
> ומתחתיו ה-`.label`. זה זהה למבנה V.03 ושומר על השורה האופקית של הכלים.

### 5.2 אם לא רוצים לגעת ב-HTML בכלל (חלופה CSS-only)

אפשר לוותר על התוויות החסרות ולהפוך כל `.group` ל-`flex-direction:row` (כלים בשורה, בלי תווית).
זה משאיר את הסרגל "Word-קלאסי בצבע ובגובה" אבל בלי התוויות התחתונות בקבוצות הלא-מתויגות.
**פחות נאמן ל-V.03**, אבל אפס-סיכון חיווט. בחירת המשתמש.

---

## 6. שמירה על האיסורים (checklist לסאמר)

- [ ] **חוקת הדף (§3, §15):** לא נגעתי ב-`.page` (21×29.7), שוליים 2.5cm, GAP 1.5cm, `mask`, `cycle`. ✔ הפורט נוגע רק בסרגל העליון.
- [ ] **`grid-template-rows` (שורה 55):** `auto auto auto 1fr auto` — לא משתנה. הסרגל נשאר באותו row. `min-height:82px` מתווסף בתוך התא הקיים (row=auto), לא מוסיף row. ✔
- [ ] **`#mwRulerWrap` (2180–2219):** סלקטורים שלי מכוונים ל-`[data-ribbon="home"]` בלבד — הרולר לא נוגע. הוא יושב מתחת לסרגל ונשאר 26px. ✔
- [ ] **חיווט/JS:** אפס שינוי ב-`id`/`data-cmd`/`onclick`/listeners. רק CSS + הוספת `<div class="label">`. ✔
- [ ] **מיקום קוד (§1):** כל ה-CSS בסוף ה-`<style>`. אין JS חדש. ✔
- [ ] **לשוניות אחרות:** הסלקטורים ב-`[data-ribbon="home"]` — הוספה/פריסה/כלים/תצוגה נשארות glass. ✔ (אלא אם §7).
- [ ] **dark mode:** הוספתי משתני `[data-theme="dark"]` (§2) כך שהסרגל לא נשבר בכהה. ✔

---

## 7. אופציה: להחיל את אותו מראה על *כל* הלשוניות

אם המשתמש ירצה את מראה V.03 גם בלשוניות הוספה/פריסה/כלים/תצוגה (כיום glass), מרחיבים את הסלקטורים:
מחליפים `.toolbar.ribbon[data-ribbon="home"]` ב-`.ribbon` (לכל הסרגלים) — אבל אז צריך לדרוס גם את
`.ribbon.active` (שורה 92–101) בעצמו. **שווה סבב סקירה נפרד** — לא חלק מהמשימה הנוכחית.
כרגע הספק מכוון ללשונית הבית בלבד (כפי שביקש המשתמש: "הסרגל הראשי").

---

## 8. סדר מימוש מומלץ לסאמר

1. הוסף בלוק המשתנים מ-§2 בסוף ה-`<style>`.
2. הוסף בלוק §4.1 (מיכל) — רענן, ודא שהרקע אטום בהיר והגובה 82px.
3. הוסף §4.2 + §4.3 (קבוצות + תוויות) — ודא מפרידים ותווית גופן.
4. הוסף §4.4 (כפתורים) — ודא ש-B/I/U מקבלים תכלת ולא כחול-מלא בלחיצה.
5. בצע §5.1 (הוספת `<div class="label">` ל-4 הקבוצות) — אם בחרת בנאמנות מלאה.
6. רענן ובדוק את §6 checklist + dark mode + שהרולר מתחת לא זז.

---

## 9. תרחישי בדיקה (למרקוס/סאמר)

| Input | Expected Output |
|---|---|
| טען מסמך, לשונית "בית" פעילה | רקע סרגל אטום בהיר `#f8fafc`, גובה ~82px, צללית רכה מתחת |
| רחף מעל כפתור B | רקע `--hover` תכלת בהיר + border `--border-mid` + shadow קל |
| סמן טקסט ולחץ B | הכפתור מקבל רקע `--active-bg` תכלת + טקסט/border בצבע `--primary` (לא כחול-מלא) |
| הסתכל בין קבוצת גופן לקבוצת פסקה | קו מפריד דק `1px var(--border)` בצד שמאל של כל קבוצה (RTL) |
| הסתכל מתחת לכל קבוצה | תווית קטנה אפורה uppercase: "גופן" / "סגנונות" / "פסקה" / "רשימות" / "היסטוריה" |
| מדוד את `#mwRulerWrap` | נשאר 26px, יושב מתחת לסרגל, ללא חפיפה |
| עבור ל-dark mode (data-theme=dark) | רקע סרגל `#1e293b`, hover/active כהים — לא לבן-זוהר |
| עבור ללשונית "הוספה" | נשארת במראה glass הקיים (לא הושפעה) |
| הדפסה (Ctrl+P) | הסרגל מוסתר כרגיל (אין רגרסיה ב-`@media print`) |

---

## 10. נספח — עיצוב האלמנט הצף ב-V.03 (לשיקול עתידי)

> המשתמש שוקל לאמץ גם את הסרגל הצף של V.03. תיעוד קצר — **לא חלק מהמשימה הנוכחית**, סבב נפרד.

ב-V.03 (שורות 997–1066) הסרגלים הצפים (`.selection-toolbar`, `.img-controls`, `.table-menu`)
הם **כהים-זכוכיתיים** — היפך מהסרגל הראשי הבהיר:

- **רקע:** `linear-gradient(135deg, rgba(38,42,68,0.92), rgba(70,53,116,0.92))` — כחול-סגול כהה.
- **טשטוש:** `backdrop-filter: blur(14px) saturate(160%)`.
- **גבול:** `1px solid rgba(255,255,255,0.12)` (קו לבן עדין).
- **צללית:** `0 12px 40px rgba(0,0,0,0.45)` + `inset 0 1px 0 rgba(255,255,255,0.08)` (הדגשת-זכוכית עליונה).
- **רדיוס:** `12px`.
- **אנימציית כניסה:** `@keyframes fx-toolbar-in` — `opacity 0→1` + `translateY(6px)→0` + `scale(.96)→1` ב-0.18s.
- **כפתורים:** רדיוס 8px, hover = `translateY(-1px) scale(1.06)` + רקע `rgba(255,255,255,0.18)`, active = `scale(.92)`, טקסט לבן.
- **select/input:** רקע `rgba(255,255,255,0.1)`, גבול לבן-שקוף, טקסט לבן, אפשרויות על רקע `#2c2c2c`.

**מיפוי ל-v2:** ב-v2 הסרגל הצף הוא `#ctxBar` (CLAUDE.md §8, `position:fixed`, `z-index:9998`).
אם נאמץ — נכתוב SPEC נפרד שדורס את עיצוב `#ctxBar` לערכי הזכוכית-הכהה לעיל, **בלי** לגעת
בהתנהגות (פתיחה/סגירה/Escape/`_mwPanelDismiss`). שים לב: ל-v2 פלטות צבע צריכות `z-index:10050`
מעל ה-ctxBar (§8) — אימוץ הרקע הכהה לא משנה את ה-z-index. **נושא לסבב הבא.**
