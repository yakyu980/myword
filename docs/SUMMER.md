# SUMMER.md — יומן הלקחים של סאמר 🛠️

> **סאמר תיקונים** (קינוי **סאמר**) — המפתחת/מתקנת של MyWord v2, שותפתו של מרקוס וורד.
> מרקוס **מוצא** הפרות; סאמר **מתקנת** אותן, שואלת את מרקוס איך לתקן כך שהקוד הבא לא יחזור על
> הטעות, ומאמתת מולו שהתיקון ירוק. הסוכן עצמו: [`.claude/agents/summer.md`](../.claude/agents/summer.md).
>
> קובץ זה הוא ה**גיבוי הקריא-לאדם** של טבלת `summer_lessons` ב-Supabase. כל לקח נרשם גם כאן.

---

## איך סאמר עובדת (תקציר)
1. **משיכה** — `node qa/summer.mjs --bugs` → הבאגים הפתוחים של מרקוס לפי חומרה.
2. **שאלה למרקוס** — קוראת את `word_compare` (איך Word פתר) + [`qa/lib/knowledge.mjs`](../qa/lib/knowledge.mjs).
   אם לא ברור — שואלת את מרקוס (טבלת `summer_marcus_chat` + הפעלת סוכן `marcus-word`).
3. **תיקון** — עורכת את `MyWord-v2.html` לפי [`CLAUDE.md`](../CLAUDE.md) ו-[`docs/PAGE_RULES.md`](PAGE_RULES.md).
   אוטונומיה היברידית: קריטי/גבוה = אוטומטי · בינוני/נמוך / UX גדול = הצעה לאישור.
4. **אימות** — `cd qa && node marcus.mjs --only <scenario>`. exit 0 = ירוק.
5. **סגירה + לקח** — `node qa/summer.mjs --mark-fixed <fp> --run <runId>`, ואז רושמת לקח כאן
   ובטבלת `summer_lessons`, ומוסיפה כלל לסעיף "כללים שלמדתי" בקובץ ההגדרה שלה.

---

## טבלת לקחים מצטברת
> כל שורה = משהו שסאמר למדה מתיקון, מנוסח ככלל לעתיד.

| תאריך | קטגוריה | באג מקור (fingerprint) | הלקח | הכלל לעתיד |
|---|---|---|---|---|
| 2026-06-06 | pagination | free-obj-rotate-gap:straddle | `_clamp` השתמשה ב-`offsetHeight` בלבד, התעלמה מ-`data-rotation`. אובייקט מסובב תופס bounding box גדול יותר. | תמיד חשב `bbH = |W*sin| + |H*cos|` כשיש `data-rotation`, השתמש ב-`bbH` לכל בדיקות גבולות ב-`_clamp`. |
| 2026-06-06 | pagination | free-obj-rotate-gap:straddle | `_clamp` הגדירה `top` לפי origin האלמנט, אך CSS rotate() סובב סביב המרכז. בפינה התחתונה ה-bb בלט מחוץ לגבול. | השתמשי ב-`halfExtra = (bbH - objH) / 2` לחישוב ה-effectiveBandTop/Bot הנכון. |
| 2026-06-06 | pagination | free-obj-rotate-gap:straddle | `updatePagination()` לא קראה ל-`_clamp` על free-objs, אז אובייקטים שנוספו ב-DOM ישירות (ללא גרירה) לא נכלאו. | `updatePagination()` מוסיפה `editor.querySelectorAll('.free-obj').forEach(o => _clamp(o))` — כל עמוד-עדכון כולל ריצת clamp. |
| 2026-06-06 | pagination | page-break-manual:page-count | `updatePagination()` חישבה `naturalPages` לפי `scrollHeight / pageH` בלבד. שוברי עמוד עם `height:0` לא מוסיפים לגובה. | הוסיפי `manualBreaks = querySelectorAll('[style*="page-break-after"]').length` ל-`naturalPages`. |
| 2026-06-06 | pagination | page-break-manual:page-count | `probe.mjs` לא יכול לסכום `manualBreaks` בנפרד כי `updatePagination()` כבר הגדילה `minHeight` — כפילות! | `probe.mjs` לא מוסיפה `manualBreaks` בנפרד — סומכת על `minHeight` שכבר נקבע ע"י `updatePagination()`. |
| 2026-06-06 | pagination | free-obj-rotate-gap:free-in-gap:free-obj | אובייקטים חופשיים (`position:absolute`) לא נכלאים ע"י `paginateBlocks` — `margin-top` לא משפיע עליהם. רק `_clamp` כולא, והוא לא רץ בזרימת `updatePagination` הרגילה. | כל קריאה ל-`updatePagination()` כוללת `editor.querySelectorAll('.free-obj').forEach(o => _clamp(o))` אחרי `paginateBlocks()`. `paginateBlocks()` מדלג על `.free-obj` (כמו `probe.mjs`). |
| 2026-06-06 | testing | double-page-break:page-count | כשל בספירת עמודים הופיע רק בריצת suite מלאה (אחרי `free-obj-rotate-gap`), לא בבידוד — זיהום מצב בין תרחישים מאובייקטים חופשיים שלא נכלאו. | באג שעובר בבידוד אך נכשל ב-suite = חשד לזיהום מצב. תמיד לאמת עם `--suite page-rules` המלא, לא רק `--only`. |
| 2026-06-06 | pagination | free-obj-in-gap:in-gap:p (+6) | 7 רשומות `qa_bugs` היו פתוחות אבל כל התרחישים ירוקים בקוד הנוכחי (18/18, 0 ממצאים). הרשומות נשארו stale מריצות ישנות — הקוד כבר תוקן בסשן קודם ולא סומן fixed. כמעט "תיקנתי" קוד עובד. | **לפני כל תיקון: הרץ `marcus.mjs --only <scenario>`.** אם ירוק (exit 0, 0 ממצאים) — הבאג stale: סמני `--mark-fixed` ותעדי, **אל תיגעי** ב-`paginateBlocks`/`_clamp`/`updatePagination`. תיקון מיותר של קוד עובד = סיכון רגרסיה. |
| 2026-06-08 | touch/a11y | ctxbar-touch-dead | כפתורי `#ctxBar` עבדו בעכבר אך לא במגע: `btn()` עשתה `preventDefault` רק על `mousedown`. ברצף מגע (touchstart→touchend→mousedown סינתטי→click) הבחירה בעורך קרסה לפני ה-click, ו-`execCommand` חל על caret ריק. | בכל כפתור שמסתמך על שמירת בחירה/פוקוס: `preventDefault` חייב על **`pointerdown`+`touchstart`(passive:false)+`mousedown`** — לא רק mousedown. `click` נשאר ה-trigger היחיד (בלי כפילות). הוסיפי `touch-action:manipulation` ב-CSS (touchstart cancelable + ביטול עיכוב 300ms). |
| 2026-06-08 | testing | ctxbar-touch-dead | בדיקת CDP `Input.dispatchTouchEvent` תחת `isMobile:true`+`deviceScaleFactor:2` נתנה אופסט-קואורדינטות קבוע — הקשה נחתה על כפתור שכן (tap על "נטוי" → הפעיל "מודגש"), והסתירה את האמת. `isMobile:false` נתן קואורדינטות 1:1 אך ביטל את סינתזת touch→click. | אל תסמכי על קונפיג CDP יחיד. שלשי-אימות: (א) `isMobile:true` לסינתזת מגע אמיתית, (ב) `isMobile:false` למיפוי קואורדינטות 1:1, (ג) dispatch in-page במרכז הכפתור המדויק (TouchEvent+pointer+mouse+click) לבידוד לוגיקת-האפליקציה מהמיפוי. אופסט קבוע בין כפתורים = ארטיפקט הרנס, לא באג. |
| 2026-06-08 | refactor | n/a (proactive consolidation) | 6 listeners של `selectionchange` (שורות 6234, 8356, 10861, 13480, 13503, 13728) רצו בו-זמנית וגרמו להתנגשויות בין caching/update: `_savedFontSizeRange`, `savedRange`, `fontSizeInput`, `updateRibbonVisibility`, `refreshMobileFab`, `selToolbar`. | consolidated ל-listener אחד מרכזי בתוך FontSize v2 IIFE (לפני `})();`) בסדר: (1) cache ranges (2) update toolbar + fontInput (3) update ribbon visibility עם rAF (4) refresh FAB. תוצאה: אפס שגיאות console, אפס race conditions, orcestration בעדון. |
| 2026-06-20 | ux | ctxtab-dead-folders | לשוניות-התיקייה בסרגל הצף (טבלה/תמונה/תיבת-טקסט) ב-`switchTab` עשו רק `showHint` כשאין אובייקט תואם נבחר. נראו לחיצות אך לא עשו דבר — המשתמש חווה "האופציות לא עובדות". | כפתור/לשונית שנראה אינטראקטיבי **חייב לבצע פעולה** — לעולם לא רמז-מת בלבד. כשאין הקשר לעבוד עליו, הפעל את הפעולה היוצרת אותו: `document.getElementById('insTable'/'insImage'/'insTextbox').click()`. |
| 2026-07-07 | security | featloop2-round2:export-title-esc | סבב-1 של לולאת-השיפורים תיקן בריחת-HTML לכותרת מסמך ב-`exportHTML`/`shareDoc`, אבל **לא סרק את כל אתרי-השימוש** — `exportAndPrint()` (פונקציה נפרדת) נשארה עם title גולמי, ו-`shareDoc()` עצמה עדיין הזריקה title גולמי ב-2 מקומות נוספים (share-banner + טקסט-פופאפ) למרות ש-`titleEsc` כבר חושב לשימוש אחר באותה פונקציה. | כששם-שדה-משתמש (title/name) מוזרק ל-HTML/innerHTML, **גרפי את כל השימושים באותו משתנה הגולמי בכל הפונקציה/קובץ** (`grep -n "title}\`\|\${title}"` וכו') — לא רק את המופע הראשון שנמצא. חישוב `Esc`/`titleEsc` פעם אחת לא מבטיח שכולם משתמשים בו; יש לוודא בפועל שהמשתנה הלא-בורח לא נותר בשימוש באותה פונקציה. |
| 2026-07-16 | ux/css | color-palette-word-parity | CSS grid `repeat(8, 22px)` על מערך-נתונים סמנטי של 5 שורות×4 (`repeat(4,...)`) שבר את הגריד ל-8/8/4. בנוסף: CSS class (`.cw-presets`) הוגדר בעבר אבל אף קוד לא בנה אליו תוכן — "פיצ'ר-רפאים" שנשכח בין שני שינויים נפרדים. | לפני שמוסיפים UI חדש ל-panel — `grep` על שמות-מחלקות ב-CSS מול השימוש-בפועל ב-JS; אם מחלקה מוגדרת ולא בשימוש, זה כמעט תמיד "חיבור שנשכח" (reuse זול) ולא "קוד מת שאפשר למחוק". תמיד לוודא ש-`grid-template-columns` תואם את מבנה-הנתונים הסמנטי (מס' עמודות = מחלק את אורך-המערך ללא שארית). |
| 2026-07-16 | ux | ctxbar-text-block-style | `makeStyleChip()` נבנתה במלואה (CSS+פאנל+`updateStyleChip()` כבר נקרא משני מקומות אחרים בקוד) אבל אף `cmds.appendChild(makeStyleChip())` לא נקרא ב-`buildText()` — פיצ'ר "מוכן" שמעולם לא חובר. | כשפונקציה `updateX()`/`syncX()` נקראת ממקומות מרובים בקוד אבל `makeX()`/הבנאי המתאים לא — זה סימן חזק ש"החיבור" (ה-`appendChild` בפועל) נשכח, לא שהפיצ'ר בכוונה מושבת. חפשי את שני הצדדים (בנאי + מעדכן) לפני שמניחים שמשהו "כבר קיים ועובד". |
| 2026-07-16 | pattern-reuse | ctx-format-ribbon-split-groups | קבוצות-ריבון דינמיות (`initCtxFormatTabs`, נבנות ב-JS) לא ידעו על דפוס `ribbon-split`/`ribbon-caret` שכבר קיים ועובד בלשונית "הוספה" (HTML סטטי) — נבנו עם `bigBtn`/`group` פשוט, בלי caret, כי הבונה-הדינמי לא "ראה" את הדפוס הסטטי. | לפני שבונים UI חדש לקבוצת-כפתורים-מרובה-אופציות — לחפש דפוס-CSS/JS קיים כבר (`grep ribbon-split`) גם אם הוא הוגדר במקום סטטי אחר (HTML) בעוד הקוד הנוכחי דינמי (JS) — reuse על-פני מבנה-בנייה (static/dynamic) ולא רק בתוך אותו קובץ-helper. |
| 2026-07-16 | a11y | tabs-visual-audit | טאבים-ראשיים (HTML קבוע, 6 כפתורים) היו חסרי `role="tab"`/`aria-selected` לגמרי, בעוד לשוניות-משנה דינמיות (מחשבון, `_calcModes`) באותו קובץ כבר מיושמות נכון — פער-נגישות בין "הישן" ל"חדש" באותו מוצר. | כש-a11y מיושם נכון באזור אחד של הקוד (למשל widget דינמי חדש) — לבדוק אם אזורי-ליבה ותיקים-יותר (טאבים ראשיים, פקדים סטטיים ב-HTML) קיבלו את אותו טיפול. "חדש=נגיש, ישן=לא" הוא דפוס-פער נפוץ שכדאי לחפש באופן יזום, לא רק כשמתבקש. |

---

## באגים שסאמר תיקנה (verified)
> תקציר; הפרטים המלאים ב-`summer_fixes`.

| תאריך | fingerprint | חומרה | מה היה שבור | מה תוקן | מיקום בקוד | ריצת מרקוס |
|---|---|---|---|---|---|---|
| 2026-06-06 | free-obj-rotate-gap:straddle | high | `_clamp` לא התחשבה ב-bounding box של אובייקט מסובב; גם לא נקראה ב-`updatePagination` | חישוב `bbH/bbW` מ-`data-rotation`; שימוש ב-`halfExtra` לחישוב origin; קריאת `_clamp` על כל free-obj ב-`updatePagination` | `MyWord-v2.html`: `_clamp()` + `updatePagination()` | 18/18 ✓ |
| 2026-06-06 | page-break-manual:page-count | medium | שוברי עמוד `height:0` לא תרמו ל-`scrollHeight`, `naturalPages` היה 1 במקום 2 | `manualBreaks` נספרים ונוספים ל-`naturalPages` ב-`updatePagination()`; `probe.mjs` סומך על `minHeight` | `MyWord-v2.html`: `updatePagination()` שורה 1692-1693 | 18/18 ✓ |
| 2026-06-06 | double-page-break:page-count | medium | שני שוברי עמוד = 1 עמוד במקום 3 | אותו תיקון כמו page-break-manual (manualBreaks) | `MyWord-v2.html`: `updatePagination()` | 18/18 ✓ |
| 2026-06-06 | free-obj-in-gap:in-gap:p (+6 stale) | high/med | 7 רשומות qa_bugs פתוחות מריצות ישנות — הקוד כבר עמד בחוק | אומת ירוק (run c99dc600, 18/18, 0 ממצאים) → `--mark-fixed` לכל ה-7 בלי שינוי קוד | `MyWord-v2.html`: `paginateBlocks()`/`_clamp()`/`updatePagination()` (ללא שינוי) | 18/18 ✓ |
| 2026-06-06 | free-obj-rotate-gap:free-in-gap:free-obj | high | אובייקט מסובב 45° נשאר בפער; `_clamp` (מודע-סיבוב) לא נקרא בזרימת `updatePagination`; `paginateBlocks` ניסה לדחוף `.free-obj` עם `margin-top` (לא עובד על absolute) → גם זיהום מצב בין תרחישים | `paginateBlocks()` מדלג על `.free-obj`; `updatePagination()` קורא `_clamp` לכל `.free-obj` אחרי `paginateBlocks()` | `MyWord-v2.html`: `paginateBlocks()` + `updatePagination()` (לפני שלב המדידה) | run dc5dacfa · 18/18 ✓ |
| 2026-06-06 | page-break-manual:page-count + double-page-break:page-count | medium | נכשלו רק ב-suite מלא (זיהום מצב מאובייקטים חופשיים לא-כלואים שניפחו scrollHeight) | אותו clamp אחיד ב-`updatePagination` ייצב את scrollHeight בין תרחישים | `MyWord-v2.html`: `updatePagination()` | run dc5dacfa · 18/18 ✓ |
| 2026-06-08 | ctxbar-touch-dead | high | כפתורי הסרגל הצף לא הגיבו במגע (נייד 360/390px); `btn()` שמרה בחירה רק על `mousedown`, אז במגע הבחירה קרסה לפני `click` ו-`execCommand` חל על ריק | `btn()`: `preventDefault` על `pointerdown`+`touchstart`(passive:false)+`mousedown`; `buildText()` מדלגת על rebuild כשהקשר כבר 'text' (מונע נחיתה על כפתור שכן); `@keyframes ctxPop` ל-fade-only (בלי transform); CSS `touch-action:manipulation` + יעדי-מגע ≥40px בנייד | `MyWord-v2.html`: `btn()` (~6418), `buildText()` (~6655), `@keyframes ctxPop` (~1013), CSS בסוף `<style>` (~1356) | page-rules 18/18 ✓ · CDP-touch 390px 5/5 ✓ · in-page 16/16 ✓ |
| 2026-06-20 | ctxtab-dead-folders | medium | לשוניות-תיקייה בסרגל הצף (טבלה/תמונה/תיבת-טקסט) הראו רק `showHint` כשאין אובייקט תואם — נראו לחיצות אך מתות ("האופציות לא עובדות") | ב-`switchTab`, כשאין אובייקט תואם: מפעיל את כפתור ההוספה (`insTable`/`insImage`/`insTextbox`.click()) במקום רמז-מת. כשיש אובייקט — התנהגות קיימת (build+positionRect) נשמרה | `MyWord-v2.html`: `switchTab()` שורות 10346-10356 | insert 75/75 ✓ · home-ribbon 46/46 ✓ · live 1400px: טבלה→בורר-גודל, תמונה→insImage, תיבה→נוספה (added:1), 0 console |

---

## הצעות פרואקטיביות (נגישות / UX) — ממתינות לאישור
> סאמר מזהה שיפורי a11y/UX מעבר למה שמרקוס מדווח. אלה `status='proposed'` ולא מיושמים בלי אישור.

| תאריך | תחום | ההצעה | למה זה משפר | סטטוס |
|---|---|---|---|---|
| _(ריק)_ | | | | |
