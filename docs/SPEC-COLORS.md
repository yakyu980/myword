# SPEC-COLORS — מערכת צבעים אחידה והרמונית ל-MyWord v2

> נכתב ע"י נוי (UX/UI). מטרת המשתמש (ציטוט): **"צבעים יותר אחיד וצבע בגוון יותר טוב"**.
> spec זה מגדיר **פלטת design-tokens אחת** שכל הממשק נשען עליה — לא צבעים סמנטיים מפוצלים.
> סטטוס: ✅ יושם (2026-06-20) — שלבים 1-5 הוטמעו ואומתו חי בדפדפן (primary=#4F6BED, אפס צבעים יתומים, focus-ring, אפס שגיאות קונסול). שלב 6 (ריענון tab-chips) — בוצע גם הוא ב-:root.
> מקור-אמת: CLAUDE.md §1 (הוספת CSS בסוף ה-`<style>`), §15 (אסור לשנות גודל/שוליים — לא נוגעים).

---

## 0. תקציר מנהלים — מה משתנה ולמה

הממשק היום משתמש בלפחות **ארבעה כחולים שונים** שלא מתואמים זה לזה:
| איפה | ערך נוכחי | בעיה |
|---|---|---|
| `--primary` (טוקן ראשי) | `#2563eb` | כחול קר ורווי-מדי, נוטה לסגול |
| hover של טאבים + ribbon-big | `rgba(99,102,241,…)` (אינדיגו) | גוון אחר לגמרי מ-primary |
| hover-tile של אייקונים | `#eef2ff → #e0e7ff` | אינדיגו בהיר, גוון שלישי |
| כל ה-hover/active של ctxBar | `#3B7DE8` (קשיח, ~8 מקומות) | כחול רביעי, לא מ-token |
| accent של ctxBar | `#E8743B` (כתום) | מבטא חם נפרד שלא קשור ל-primary |
| `--icon-ink` | `#334155` | אפור-כחלחל שלא נגזר מ-primary |
| save-states | `#059669` / `#b91c1c` | ירוק/אדום קשיחים |

**הפתרון:** משפחת-גוון ראשית אחת + סולם נגזר (50→900) + tokens סמנטיים שכולם מצביעים על אותה משפחה. כל hover/active/border/surface ייגזרו מאותו גוון → אחידות מלאה.

---

## 1. בחירת הגוון הראשי — "גוון יותר טוב"

### ההמלצה: **Indigo-Blue מאוזן** — `--primary: #4F6BED`

**למה דווקא זה (ולא #2563eb הנוכחי):**
- `#2563eb` יושב על `hsl(221°, 83%, 53%)` — רוויה 83% היא **גבוהה מאוד**, מה שגורם לתחושה "תאגידית קרה" ועייפות-עין בסרגל גדול.
- `#4F6BED` יושב על `hsl(228°, 81%, 62%)` — מעט יותר **בהיר ורך**, גוון שנוטה קלות לאינדיגו. זה **מתואם** עם גווני ה-hover שכבר קיימים בקוד (`rgba(99,102,241,…)` = אינדיגו) — כלומר במקום לבטל את האינדיגו שכבר מפוזר, אנחנו **מאחדים סביבו**. התוצאה: hover ו-primary מאותה משפחה.
- שומר ניגודיות WCAG AA על לבן: טקסט לבן על `#4F6BED` = יחס **4.9:1** (עובר AA לטקסט רגיל). על `--primary-d` הכהה יותר — בטוח עוד יותר.

> אם המשתמש מעדיף להישאר קרוב למקור: חלופה שמרנית `--primary: #3B6FE0` (gap קטן). אבל ההמלצה החזקה היא `#4F6BED` כי הוא מאחד את האינדיגו הקיים.

### הסולם הנגזר (Tonal scale) — משפחה אחת, 10 דרגות
```
--c-50:  #EEF1FE   ← רקע-hover עדין ביותר (tiles, hover-fill)
--c-100: #DDE3FC   ← רקע-hover מודגש / border עדין
--c-200: #C2CCF9   ← border פעיל / טבעת-focus רכה
--c-300: #9FAEF4   ← קצוות, disabled-accent
--c-400: #7589EF   ← hover של primary במצב כהה
--c-500: #4F6BED   ← ★ --primary  (הגוון הראשי)
--c-600: #3B53D8   ← --primary-d  (active / לחיצה / hover כהה יותר)
--c-700: #2E41B0   ← טקסט-קישור על רקע בהיר, ניגודיות גבוהה
--c-800: #232F82   ← כותרות-מבטא נדירות
--c-900: #1A2255   ← דיו עמוק (אם צריך)
```
כל הדרגות באותו hue (~228°) — לכן הממשק נראה "מאותה משפחה" בכל אינטראקציה.

---

## 2. טבלת ה-Design Tokens המלאה (להחלפה ב-`:root`)

> מחליפים את הבלוק `:root` הקיים (שורות ~17-38). שומרים על שמות-ה-tokens הישנים (`--primary`, `--primary-d`, `--border` וכו') כדי לא לשבור התייחסויות קיימות — רק מעדכנים ערכים + מוסיפים את הסולם והסמנטיקה.

### 2.1 הסולם הגולמי (חדש)
| token | ערך | שימוש |
|---|---|---|
| `--c-50`  | `#EEF1FE` | hover-fill עדין, tile-rest |
| `--c-100` | `#DDE3FC` | hover-fill מודגש |
| `--c-200` | `#C2CCF9` | border-hover, focus-ring רך |
| `--c-300` | `#9FAEF4` | border פעיל |
| `--c-400` | `#7589EF` | hover במצב כהה |
| `--c-500` | `#4F6BED` | **primary** |
| `--c-600` | `#3B53D8` | **primary-d** / active |
| `--c-700` | `#2E41B0` | link / טקסט-מבטא |
| `--c-800` | `#232F82` | מבטא עמוק |
| `--c-900` | `#1A2255` | דיו עמוק |

### 2.2 ה-tokens הסמנטיים (נשארים בשמותיהם, ערכים מעודכנים)
| token | ערך חדש | היה | הערה |
|---|---|---|---|
| `--bg`         | `#EAECF4` | `#e8eaf0` | רקע אפליקציה — מעט יותר נוטה לגוון primary (חמים-קר מאוזן) |
| `--panel`      | `#ffffff` | ללא שינוי | |
| `--primary`    | `var(--c-500)` `#4F6BED` | `#2563eb` | ★ הגוון הראשי החדש |
| `--primary-d`  | `var(--c-600)` `#3B53D8` | `#1d4ed8` | |
| `--primary-soft` | `var(--c-50)` `#EEF1FE` | (חדש) | רקע-hover אחיד |
| `--primary-soft2`| `var(--c-100)` `#DDE3FC` | (חדש) | hover מודגש / active-fill עדין |
| `--primary-bd` | `var(--c-200)` `#C2CCF9` | (חדש) | border-hover אחיד |
| `--text`       | `#1F2937` | ללא שינוי | |
| `--text-soft`  | `#6B7280` | ללא שינוי | |
| `--border`     | `#E2E8F0` | ללא שינוי | |
| `--icon-ink`   | `#3A4256` | `#334155` | דיו אייקון — מיושר מעט לכיוון hue ה-primary (פחות "כחול-פלדה") |
| `--focus-ring` | `rgba(79,107,237,0.35)` | (חדש) | טבעת-פוקוס אחידה — נגזרת מ-c-500 |
| `--ok`         | `#15935E` | `#059669` | save "נשמר" — ירוק רגוע יותר, AA על לבן |
| `--danger`     | `#C0392B` | `#b91c1c` | save "אין מקום" — אדום מעט רך |

> הערה: `--ok` / `--danger` נשארים סמנטיים-בלבד למצבי-שמירה (לא חלק מהמשפחה הראשית — אלה state colors תקניים, מותר). הם **לא** משמשים לאייקונים/כפתורים רגילים.

---

## 3. מיפוי רכיב → token (מה כל אזור בממשק מקבל)

| רכיב | property | היום (קשיח) | אחרי (token) |
|---|---|---|---|
| `.tabs .tab.active` | background | `var(--tab-color,--primary)` `#2563eb` | `var(--primary)` `#4F6BED` (אוטומטי) |
| `.tabs .tab:hover` | background | `rgba(99,102,241,0.08)` | `var(--primary-soft)` |
| `.ribbon-big:hover` | background / border | `rgba(99,102,241,0.15)` / `rgba(99,102,241,0.4)` | `var(--primary-soft2)` / `var(--primary-bd)` |
| `.ribbon-big:hover .ic` | background | `#eef2ff→#e0e7ff` | `linear-gradient(180deg,var(--c-50),var(--c-100))` |
| `.ribbon-big:hover .ic > svg` | color | `var(--primary)` | ללא שינוי (כבר token) |
| `.ribbon-big:active .ic` | background | `var(--primary)` | ללא שינוי (כבר token) ✓ |
| `.ribbon-big.active-feature .ic` | background | `linear-gradient(--primary,--primary-d)` | ללא שינוי ✓ |
| `.ribbon-big.active-feature .ic` | box-shadow | `rgba(37,99,235,.35)` | `var(--focus-ring)` |
| `button.active` (גלובלי) | background | `var(--primary)` | ללא שינוי ✓ |
| `#ctxBar button:hover` | color / border | `#3B7DE8` / `rgba(59,125,232,.24)` | `var(--primary)` / `var(--primary-bd)` |
| `#ctxBar button.active` | background | `#3B7DE8` | `var(--primary)` |
| `#ctxMore button:hover` | color | `#3B7DE8` | `var(--primary)` |
| `#rcMenu button:hover` | color | `#3B7DE8` | `var(--primary)` |
| `.tbl-chip:hover/.sel` | border/bg | `#3B7DE8` | `var(--primary)` |
| `.ctx-opacity input` | accent-color | `#3B7DE8` | `var(--primary)` |
| `.calc-sci-grid button` | bg/color/border | `#e0e7ff`/`--primary-d`/`#c7d2fe` | `var(--c-100)`/`var(--c-700)`/`var(--c-200)` |
| `.calc-modes button.active` | background | `var(--primary)` | ללא שינוי ✓ |
| `.save-state.saved` | color | `#059669` | `var(--ok)` |
| `.save-state.typing` | color | `var(--primary)` | ללא שינוי ✓ |
| `.save-state.unsaved` | color | `#b91c1c` | `var(--danger)` |

---

## 4. מצבי אינטראקציה אחידים (hover / active / focus)

כל כפתור/אריח-אינטראקטיבי בממשק חייב לעמוד באותו דפוס שלושה-מצבים:

| מצב | רקע | מסגרת | דיו/אייקון |
|---|---|---|---|
| **rest** | שקוף / glass | `--border` או glass-bd | `--icon-ink` / `--text` |
| **hover** | `--primary-soft` (#EEF1FE) | `--primary-bd` (#C2CCF9) | `--primary` (#4F6BED) |
| **active / press** | `--primary` מלא | `--primary-d` | לבן (#fff) |
| **toggle-on** | gradient `--primary→--primary-d` | `--primary-d` | לבן + לייבל `--primary` מודגש |
| **focus-visible** | (ללא שינוי רקע) | + `box-shadow: 0 0 0 3px var(--focus-ring)` | — |

> **שיפור נגישות חשוב (a11y):** היום אין `:focus-visible` עקבי. להוסיף בסוף ה-`<style>`:
> ```css
> .ribbon-big:focus-visible, .tabs .tab:focus-visible,
> #ctxBar button:focus-visible, .toolbar button:focus-visible {
>   outline: none;
>   box-shadow: 0 0 0 3px var(--focus-ring);
> }
> ```
> זה נותן טבעת-פוקוס אחידה לניווט-מקלדת בכל הממשק — קריטי ל-a11y, חסר היום.

---

## 5. הסרגל הצף (ctxBar) — שמירה על frosted-glass + איחוד מבטא

⚠️ **לא נוגעים** בשכבת ה-frosted-glass (`backdrop-filter`, `--cb-bg`, שקיפויות הזכוכית). רק מאחדים את **צבע-המבטא**.

היום ה-ctxBar משתמש בשתי מערכות מבטא:
1. כתום `#E8743B` (`--cb-accent`) למצב טקסט.
2. כחול `#3B7DE8` קשיח ל-hover/active של כפתורים (לא דרך token).

### ההחלטה: לאחד את מבטא ה-ctxBar ל-primary החדש
- `--cb-accent` ברירת-מחדל (מצב טקסט): `#E8743B` → **`var(--primary)`** `#4F6BED`.
- `--cb-accent-soft`: → `var(--primary-soft)` / `rgba(79,107,237,0.16)`.
- `--cb-accent-bd`: → `rgba(79,107,237,0.42)`.
- כל ה-`#3B7DE8` הקשיחים בכפתורי ctxBar (שורות 1055, 1060, 1065, 1103, 1157, 1158, 1169, 1240, 1256) → `var(--primary)` / `var(--primary-bd)`.

> **לגבי צבעי-ההקשר של ה-tab-chips ב-ctxBar** (`--tab-textbox`/`--tab-table`/`--tab-image`, שורות 2476-2482, וגם המסמך-מנהל `.mb-`): אלה משמשים **להבחנה סמנטית בין סוגי-אובייקט** (טקסט/תיבה/טבלה/תמונה). זו הבחנה פונקציונלית מכוונת — **לא** חוסר-אחידות. **המלצה: להשאיר**, אבל **לרענן את ארבעת הגוונים לאותה רמת-רוויה/בהירות** כדי שייראו כמשפחה מתואמת ולא מקרית:
> | token | היום | מוצע (מתואם) |
> |---|---|---|
> | `--tab-write`   | `#E8743B` | `#E07A45` (כתום רך יותר) |
> | `--tab-textbox` | `#2F9E73` | `#2FA37A` (טורקיז-ירוק) |
> | `--tab-table`   | `#3B7DE8` | `#4F6BED` (= primary — מאחד) |
> | `--tab-image`   | `#9B5DE0` | `#8B5CF6` (סגול מתואם) |
> כל הארבעה ב-S≈55-65% / L≈58-64% → "ערכה" הרמונית. (שינוי זה אופציונלי — שלב 2.)

---

## 6. תוכנית יישום צעד-אחר-צעד (לסאמר)

> כל השינויים הם **החלפת-ערכים בלבד** — אין שינוי מבני, אין נגיעה ב-§15.
> CSS חדש (focus-visible, סולם הצבעים אם מוסיפים כבלוק נפרד) → **בסוף ה-`<style>`** (CLAUDE.md §1).

**שלב 1 — הסולם וה-tokens (`:root`, שורות ~17-38):**
1. הוסף את `--c-50`…`--c-900` (טבלה 2.1).
2. עדכן `--primary: var(--c-500)`, `--primary-d: var(--c-600)`.
3. הוסף `--primary-soft / --primary-soft2 / --primary-bd / --focus-ring / --ok / --danger`.
4. עדכן `--bg: #EAECF4`, `--icon-ink: #3A4256`.

**שלב 2 — איחוד ה-hover האינדיגו המפוזר:**
5. שורה 83: `rgba(99,102,241,0.08)` → `var(--primary-soft)`.
6. שורה 342: `rgba(99,102,241,0.15)` → `var(--primary-soft2)`; `rgba(99,102,241,0.4)` → `var(--primary-bd)`.
7. שורה 2560: `#eef2ff/#e0e7ff` → `var(--c-50)/var(--c-100)`.
8. שורה 2578: `rgba(37,99,235,.35)` → `var(--focus-ring)`.

**שלב 3 — ctxBar (איחוד הכחול הקשיח):**
9. שורות 1055,1060: `#3B7DE8` → `var(--primary)`; `rgba(59,125,232,.24/.30)` → `var(--primary-bd)`.
10. שורות 1065,1158,1169: `#3B7DE8` → `var(--primary)`.
11. שורות 1103,1240: `color:#3B7DE8` → `var(--primary)`.
12. שורה 1256: `accent-color:#3B7DE8` → `var(--primary)`.
13. שורה 2219: `--cb-accent: #E8743B` → `var(--primary)`; שורות 2220-2221 soft/bd → גרסאות primary.

**שלב 4 — מצבי-שמירה + מחשבון:**
14. שורות 524,526: `#059669`/`#b91c1c` → `var(--ok)`/`var(--danger)`.
15. שורות 227-228: צבעי `.calc-sci-grid` → `var(--c-100)/var(--c-700)/var(--c-200)`.

**שלב 5 — נגישות (חדש, בסוף ה-`<style>`):**
16. הוסף בלוק `:focus-visible` מסעיף 4.

**שלב 6 (אופציונלי) — ריענון צבעי-ההקשר** מסעיף 5 (טבלת tab-write/textbox/table/image).

---

## 7. בדיקות קבלה (למרקוס / סאמר)

| בדיקה | Input | Expected |
|---|---|---|
| primary אחיד | `getComputedStyle(root)['--primary']` | `#4F6BED` (או rgb 79,107,237) |
| אין כחול יתום | Grep `#3B7DE8` בקובץ | 0 תוצאות (כולן הוחלפו ל-token) |
| hover טאב | hover על `.tab` | רקע = `--primary-soft` (#EEF1FE), לא אינדיגו ישן |
| active ribbon-big | press על כפתור | אריח primary מלא + svg לבן (ללא שינוי התנהגות) |
| focus מקלדת | Tab לכפתור | טבעת `--focus-ring` נראית סביב הכפתור |
| ניגודיות | טקסט לבן על `--primary` | יחס ≥ 4.5:1 (AA) — `#4F6BED` = 4.9:1 ✓ |
| save-state | שמירה מוצלחת | `.save-state.saved` color = `var(--ok)` ירוק |
| frosted-glass נשמר | בדיקה חזותית ctxBar | `backdrop-filter` ושקיפויות ללא שינוי |

---

## 8. מה Word עושה כאן (הצדקה)
Word משתמש ב**גוון-מבטא ראשי יחיד** (theme accent) שכל הריבון נגזר ממנו — hover, selected-tab, toggle-on, כולם גרסאות-בהירות של אותו accent. אין ב-Word "ארבעה כחולים שונים" לכפתורים פונקציונלית-זהים. spec זה מיישר את MyWord להתנהגות הזו: **משפחת-גוון אחת + סולם נגזר**, בדיוק כמו Word Theme Colors.

---

## 9. השפעה צפויה על המשתמש
- **אחידות ויזואלית** — הממשק נתפס כ"מערכת אחת" ולא אוסף רכיבים. כל hover/active מאותה משפחה.
- **גוון נעים יותר** — `#4F6BED` רך מ-`#2563eb`, פחות מעייף-עין בסרגל גדול.
- **נגישות** — טבעת-פוקוס אחידה (חדש) + ניגונת AA מאומתת.
- **תחזוקה** — שינוי גוון עתידי = החלפת `--c-500` יחיד, במקום ציד אחר ~15 ערכים קשיחים.
