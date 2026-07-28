# SPEC-TABS.md — מפרט לשוניות פריסה / כלים / תצוגה + תקן-שפה F9
> מבוסס על קריאת קוד חיה: `MyWord-v2.html` — HTML שורות 2255–2443, JS שורות 10558–11365.
> השוואה מול `ישן/MyWord.html` (לשוניות layout/tools/view, שורות 3483–3681).
> סונכרן: 2026-06-11. מחבר: דאן (האורקל).

> ### ⚠️ שינויים מבניים — שדרוג שלב 1 (2026-06-12b)
> ההתנהגות של כל פיצ'ר נשארה זהה; רק **מיקום ב-UI** השתנה:
> - **רקע דף** (§1.2 במסמך זה) — עבר מלשונית **פריסה** ל-**תצוגה**. מזהים `loBg*`, JS ללא שינוי. תרחיש מרקוס: `view-page-bg-color`.
> - **ייצוא Word/PDF/HTML** (§2.7) — עבר מלשונית **כלים** ל-**קובץ** (onclick → `exportDocWord`/`exportAndPrint`/`exportHTML`). מזהי `tlExport*` הוסרו.
> - **מצב מצגת** (§3.3) — **הוסר לגמרי** (כפתור `#vwPresent`, IIFE `initPresentation`, CSS `#presoOverlay`, `window.exitPreso`).
> - **הכתבה קולית** (§2.3) — נדרש `window.isSecureContext`; בקשת `getUserMedia` מפורשת; טיפול שגיאות מורחב (network/audio-capture). file:// חוסם מיקרופון.

---

## 0. תשתית משותפת (JS, שורות 10562–10581)

| עזר | שורה | התנהגות |
|---|---|---|
| `detectScript(text)` | 10563 | סופר תווים עבריים (`[֐-׿]`) מול לטיניים (`[A-Za-z]`). מחזיר `'he'` / `'en'` / `'none'`. תיקו → `'he'` (כי `he >= en`). |
| `_mwPanelDismiss(panel)` | 10571 | סוגר פנל `.mw-panel` בקליק-חוץ (`pointerdown` capture) או Escape (עם `stopPropagation`). המאזינים נרשמים אחרי 50ms (כדי שהקליק הפותח לא יסגור). מחבר גם את כפתור `.mw-close`. |
| CSS `.mw-panel` | 1829–1839 | פנל גנרי, `z-index: 9990` (מתחת ל-`#ctxBar` 9998 ולפלטות 10050). |
| `@media print` | 1862–1866 | מסתיר `#presoOverlay, #focusExitBtn, #micIndicator, .mw-panel, #goalProgress`; כופה `#editor { background:#fff !important }` (רקע-דף צבעוני לא מודפס). |

---

# 1. לשונית פריסה (`data-ribbon="layout"`, HTML 2255–2325)

## 1.1 כיוון טקסט — `#loDirRtl` / `#loDirLtr` / `#loDirAuto` (JS 10692–10746)

### `#loDirRtl` ("עברית") / `#loDirLtr` ("English")
- **טריגר:** `mousedown` → `_saveLiveSel()` + `preventDefault` (שימור הבחירה); `click` → `restoreSelection()` + `setParaDir(dir)`.
- **מה קורה:** `_selectedBlocks()` → לכל בלוק: `setAttribute('dir', ...)` + `style.textAlign = right/left` → `scheduleSave()` → `rAF(updatePagination)`.
- **Input → Output:** סמן בפסקה עברית + לחיצה על English → הפסקה מקבלת `dir="ltr"` + `text-align:left`.
- **מצב קצה — אין בחירה/סמן:** `_selectedBlocks()` ריק → `showHint('הצב את הסמן בפסקה או סמן טקסט')`, אין שינוי.
- **עימוד:** קורא `rAF(updatePagination)` — תקין.

### `#loDirAuto` ("חכם") — toggle
- **State:** משתנה מודול `_smartDirOn` (boolean, **לא נשמר** — מתאפס ברענון).
- **הפעלה:** `autoDetectDirAll()` — סורק `p, h1, h2, h3, li, blockquote, div:not(.free-obj)`, **רק בלוקי-עלים** (מדלג על בלוק שמכיל בלוקים אחרים או בתוך `.free-obj`). לכל בלוק: `detectScript` → אם הכיוון שונה מהרצוי, מיישם. מחזיר מס' פסקאות ששונו → `showHint("כיוון חכם פעיל — N פסקאות יושרו")`.
- **בהקלדה (input listener, 10731):** debounce 350ms, מתקן **רק את הבלוק הנוכחי** שתחת הסמן.
- **ויזואלי:** `classList.toggle('active-feature')` על הכפתור.
- **מצבי קצה:** מסמך ריק → 0 שינויים, hint "כיוון חכם פעיל"; פסקה ללא אותיות (מספרים/סימנים) → `'none'` → לא נוגעים.
- **עימוד:** `autoDetectDirAll` קורא `rAF(updatePagination)` רק אם `changed > 0`. ההאזנה-בהקלדה **לא** קוראת updatePagination (שינוי dir לא משנה גובה — סביר).
- **אינטראקציה עם F9:** `convertLayout()` בודק `_smartDirOn` ומיישר את הבלוק לשפה החדשה אחרי המרה (שורה 11344).

## 1.2 רקע דף — `#loBgWhite` / `#loBgCream` / `#loBgBlue` / `#loBgCustom` (JS 10748–10781)
- **טריגר:** click (לבן→`''`, קרם→`#fdf6e3`, תכלת→`#eff6ff`); `#loBgCustom` הוא `<input type=color>` מוסתר בתוך label — אירוע `input` (שינוי חי תוך-כדי גרירה בבורר).
- **מה קורה:** `applyPageBg(color)` → `_pageBg = color` → `editor.style.background = _pageBg` → `scheduleSave()`.
- **שמירה:** שדה `pageBg` במסמך — דרך **עטיפה שלישית** של `window.saveDoc`/`window.loadDoc` (10759–10781): saveDoc כותב `docs[currentDocId].pageBg = _pageBg`; loadDoc קורא ומחיל. ⚠️ סדר העטיפות קריטי — זו העטיפה החיצונית ביותר.
- **הדפסה:** `@media print #editor { background:#fff !important }` — תמיד לבן.
- **מצבי קצה:** "לבן" = מחרוזת ריקה (מסיר inline style), לא `#ffffff`; מסמך חדש ללא `pageBg` → `''`.
- **עימוד:** לא קורא updatePagination — רקע לא משנה גובה. תקין.

## 1.3 רווח פסקה — `#loSpaceBefore` / `#loSpaceAfter` (selects) + `#loSpaceSel` / `#loSpaceAll` (JS 10783–10802)
- **ערכים:** 0 / 6 / 8 / 12 / 18 / 24 pt.
- **`#loSpaceSel` ("על הבחירה"):** mousedown שומר בחירה; click → `restoreSelection()` + `applyParaSpacing('sel')` → היעד `_selectedBlocks()`.
- **`#loSpaceAll` ("על הכל"):** היעד כל `p, h1, h2, h3, blockquote, li` שלא בתוך `.free-obj`.
- **מה קורה:** `style.marginTop = Npt` / `style.marginBottom = Npt`; ערך 0 → **מסיר** את ה-style (וגם `removeAttribute('style')` אם ריק). inline style גובר על חוק `#editor p, div { margin:0 }` (CLAUDE §16).
- **Output:** `showHint("רווח פסקה הוחל (N פסקאות)")`.
- **מצבי קצה:** אין בחירה ב'על הבחירה' → hint "הצב את הסמן..."; מסמך ריק ב'על הכל' → אותו hint (targets ריק).
- **שמירה:** ה-margin נשמר ב-`content` (innerHTML) — אין מפתח נפרד.
- **עימוד:** `rAF(updatePagination)` — חובה כי margins משנים גובה. ✅
- ⚠️ **הערת אורקל:** `paginateBlocks` משתמש ב-`margin-top` לדחיפות עימוד. הוא שומר `data-orig-mt` ומשחזר — אז רווח-לפני של המשתמש אמור לשרוד, אבל זו נקודת-רגישות לבדיקת מרקוס (פסקה עם margin-top ידני שגם נדחפת לעמוד הבא).

## 1.4 אוטו-עיצוב — `#loAutoFmt` (JS 10804–10954)
- **תצורה:** `_afCfg` = `{ quotes, dash, url, hr, md }`, כולם `true` כברירת מחדל; נשמר ב-`localStorage['myword2_autofmt']` בכל שינוי checkbox.
- **הפנל (`openAutoFormatPanel`):** `.mw-panel.af` מתחת לכפתור, מיושר לימינו; 5 checkboxes + שורה נעולה "רשימות אוטומטיות — פעיל תמיד" (disabled checked). נסגר ב-`_mwPanelDismiss`.
- **מנוע ההחלפות — שני מאזינים:**
  - **keyup** (10854): פועל רק כשהסמן collapsed בתוך text node בעורך (`_afTextNodeBeforeCaret`).
    - `dash`: על `-` או רווח — `--` בטווח 3 תווים אחורה → **`–` (en-dash)**.
    - `quotes`: על `"` — פותח (`“`) אחרי רווח/סוגריים, אחרת סוגר (`”`). **לא נוגע אם התו הקודם עברי** (גרשיים של ראשי-תיבות).
    - `md`: על `*` — `**טקסט**` → `<b>`, `*טקסט*` → `<i>` (Range + insertNode, סמן אחרי האלמנט, `rAF(updatePagination)`).
  - **keydown** (10915): על רווח/Enter.
    - `hr`: שורה שכולה `---` + Enter → הבלוק מוחלף ב-`<hr>` + `<p><br></p>` חדש עם הסמן בתוכו. `rAF(updatePagination)`.
    - `url`: `https?://...` או `www.x.yy` לפני הסמן → עטיפה ב-`<a target=_blank rel=noopener>` (www מקבל קידומת https). לא פועל אם כבר בתוך `<a>`.
- **מצבי קצה:** בחירה לא-collapsed → המנוע לא רץ; הקלדה בתוך `.tb-content` (תיבת טקסט) → `editor.contains` נכשל → לא רץ (אוטו-עיצוב **רק בעורך הראשי**).
- ⚠️ **`_afReplace` ו-md/url לא נכנסים למחסנית undo הילידית** (מניפולציית text-node ישירה) — Ctrl+Z תלוי במנגנון ההיסטוריה המותאם.

---

# 2. לשונית כלים (`data-ribbon="tools"`, HTML 2328–2394)

## 2.1 איות — `#tlSpell` (JS 10956–10970)
- **Toggle** של `editor.spellcheck`; רענון סימונים ע"י `blur()+focus()`.
- **שמירה:** `localStorage['myword2_spell']` = `'1'`/`'0'`. בטעינה: אם אין מפתח → ברירת מחדל **פעיל** (תואם `spellcheck="true"` ב-HTML 2448).
- **ויזואלי:** `active-feature` כשפעיל.
- **מצב קצה:** ה-blur/focus עלול לאבד את מיקום הסמן — by-design (מחיר רענון הסימונים).

## 2.2 סטטיסטיקה + יעד — `#tlStats` (JS 10972–11029)
- **פנל `.mw-panel.stats`:** מילים (split על רווחים), תווים (עם/בלי רווחים), פסקאות (`p,h1,h2,h3,li`), עמודים (`_pageCounts().effective`), זמן קריאה (`words/200`, מינ' 1 דק').
- **יעד מילים:** input מספרי + כפתור "קבע" → `_setGoal(n)` → `localStorage['myword2_goals']` = מילון `{docId: goal}` — **יעד פר-מסמך**. ערך 0/ריק → מחיקת היעד.
- **מד התקדמות `#goalProgress`:** נוצר דינמית ב-`.status .left`; `🎯 pct% [bar] words/goal`; pct מוגבל ל-100. מתעדכן ב-input עם debounce 600ms — **רק אם האלמנט קיים** (אין יעד → אין עלות).
- **מצבי קצה:** מסמך ריק → 0 מילים, זמן קריאה "~1 דק'"; אין `currentDocId` → יעד לא נשמר; מחיקת יעד → `el.remove()` מהסטטוס.
- **עימוד:** לא רלוונטי (קריאה בלבד).

## 2.3 הכתבה קולית — `#tlDictate` (JS 11145–11212)
- **אין API (`SpeechRecognition`/`webkitSpeechRecognition`):** הכפתור `disabled`, opacity 0.45, title "אינה נתמכת... נסה Chrome/Edge". **זו ההתנהגות הנכונה — לא באג.**
- **הפעלה:** toggle. יוצר `SR` עם `lang='he-IL'`, `continuous=true`, `interimResults=false` (אין טקסט-ביניים). מציג `#micIndicator` ("מקליט… דבר עכשיו").
- **הכנסת טקסט (`insertFinal`):** רק תוצאות `isFinal`; `restoreSelection()` (או focus), מחיקת הבחירה, הכנסת text node + רווח, סמן אחריו, `_saveLiveSel()`, `scheduleSave()`, `rAF(updatePagination)` ✅.
- **restart אחרי שתיקה:** `onend` → אם עדיין `active` → `rec.start()` מחדש.
- **שגיאות:** רק `not-allowed`/`service-not-allowed` → stop + hint "אין הרשאת מיקרופון". שגיאות אחרות (network, no-speech) נבלעות בשקט — ה-restart ב-onend מכסה אותן.
- **ניקוי:** `beforeunload` → stop.
- **מצב קצה:** mousedown על הכפתור שומר את הבחירה → ההכתבה נכנסת במקום הסמן האחרון בעורך, לא בסוף המסמך.

## 2.4 הקראה — `#tlSpeak` (JS 11214–11248)
- **אין `speechSynthesis`:** disabled + opacity — תקין.
- **קלט:** בחירה שמורה (`_savedRange` לא-collapsed) → רק הבחירה; אחרת **כל** `editor.innerText`. (⚠️ ה-tooltip ב-HTML אומר "מהסמן עד הסוף" — בפועל זה **כל המסמך**. פער תיעוד קטן.)
- **שפה פר-משפט:** פיצול ב-lookbehind על `.!?׃:\n`; כל משפט → `SpeechSynthesisUtterance` עם `lang` לפי `detectScript` (en→en-US, אחרת he-IL).
- **Toggle:** לחיצה בזמן הקראה → `speechSynthesis.cancel()`. ה-utterance האחרון מקבל `onend=stop` לכיבוי אוטומטי.
- **מצב קצה:** מסמך ריק → hint "אין טקסט להקראה".

## 2.5 קטעים שמורים — `#tlSnippets` (JS 11031–11081)
- **אחסון:** `localStorage['myword2_snippets']` = מערך `{id, name, html, updated}` — **גלובלי, לא פר-מסמך**.
- **שמירת קטע:** דורש שם + `_savedRange` לא-collapsed (נשמר ב-mousedown על הכפתור). `cloneContents()` → **מסיר `.free-obj` מהעותק** → שומר innerHTML. הפנל מתרענן (קריאה חוזרת ל-`openSnippetsPanel`).
- **הוספה ("הוסף"):** `restoreSelection()` או focus → `execCommand('insertHTML')` (נכנס ל-undo) → `scheduleSave()` + `rAF(updatePagination)` ✅.
- **מחיקה (🗑):** splice + רענון פנל. **אין אישור-מחיקה.**
- **מצבי קצה:** אין שם → hint "תן שם לקטע"; אין בחירה → hint "סמן קודם טקסט בעורך"; רשימה ריקה → "אין קטעים שמורים עדיין."
- ⚠️ שם הקטע מוזרק ל-innerHTML של הפנל ללא escaping — שם עם `<` עלול לשבור את תצוגת הרשימה (קוסמטי, ערך מקומי בלבד).

## 2.6 תוכן עניינים — `#tlTOC` (JS 11083–11110)
- **build:** אוסף `h1,h2,h3` (לא בתוך `.free-obj`, עם טקסט). מקצה `id="toc_<timestamp+n>"` לכותרות חסרות-id. בונה `div.mw-toc[data-mwtoc="1"]`: שורת "תוכן עניינים" + `<p><a href="#id">` לכל כותרת (H2/H3 עם class הזחה `toc-l2`/`toc-l3`).
- **מיקום:** אם קיים `[data-mwtoc]` → `replaceWith` (עדכון במקום); אחרת **בראש המסמך** (`insertBefore firstChild`).
- **ניווט:** click-delegate על העורך — קישור בתוך `.mw-toc` → `preventDefault` + `scrollIntoView({smooth})`.
- **מצב קצה:** אין כותרות → hint "אין כותרות (H1-H3) במסמך", לא נוצר בלוק.
- **עימוד:** `scheduleSave()` + `rAF(updatePagination)` ✅. ה-TOC הוא DIV רגיל ב-content — נשמר עם המסמך, ומפוצל בעימוד ע"י `splitContainer` אם ארוך.
- ⚠️ ה-TOC **editable** (בניגוד לישן שהיה `contenteditable=false`) — משתמש יכול לשבור אותו בהקלדה; עדכון מחדש פותר.

## 2.7 ייצוא — `#tlExportWord` / `#tlExportPdf` / `#tlExportHtml` (JS 11112–11143)
- **Word (.doc):** clone של העורך → מסיר `.free-obj`, מנקה דחיפות עימוד (`data-pushed`/`data-orig-mt`), מסיר `tr._pgspacer`, מאחה chunks של רשימות (`_mergeListChunks`). עוטף ב-HTML rtl עם CSS בסיסי + BOM → `Blob type application/msword` → הורדה `<title>.doc`. שם קובץ מסונן מתווים אסורים. **אין ספרייה חיצונית** (§1). ⚠️ **תמונות חופשיות לא מיוצאות** — by-design.
- **PDF:** hint "בחר שמור כ-PDF" → `window.print()` אחרי 600ms. נשען על `@media print`.
- **HTML:** מפנה ל-`exportHTML()` הקיים (בדיקת קיום לפני קריאה).

## 2.8 תקן שפה — `#tlLangFix` + F9 (JS 11250–11365)
- **מיפוי:** `KBD_EN2HE` (פריסה ישראלית, כולל `q→/`, `w→'`, `;→ף`, `,→ת`, `.→ץ`, `'→,`, `/→.`); `KBD_HE2EN` נבנה הפוך אוטומטית. תווים לא-ממופים נשארים (מספרים, רווחים).
- **בחירת הטווח (`convertLayout`):** בחירה לא-collapsed בעורך → היא הטווח; אחרת `_lastWordRange()` — המילה האחרונה לפני הסמן (הליכה אחורה עד רווח, באותו text node; אם הסמן בין אלמנטים — TreeWalker ל-text-node האחרון).
- **כיוון ההמרה:** `detectScript(text)` על הטווח — רוב אנגלי → EN2HE, אחרת HE2EN.
- **undo:** `window._historyRecord()` לפני השינוי — Ctrl+Z מחזיר בצעד אחד.
- **המרה משמרת-עיצוב:** TreeWalker על text nodes שחותכים את הטווח; כל node מומר רק בקטע שבטווח (offsets של start/end נשמרים). `<b>`/`<i>`/spans לא נפגעים.
- **בחירה-מחדש:** הטווח שהומר נבחר שוב → **F9 נוסף = toggle חזרה**.
- **כיוון-חכם:** אם `_smartDirOn` — הבלוק מיושר לשפה החדשה.
- **טריגרים:** כפתור `#tlLangFix` (mousedown שומר בחירה, click ממיר); F9 גלובלי — **רק** כשהפוקוס ב-`#editor` או `.tb-content` (`preventDefault`).
- **Output:** hint "הומר לעברית ⇄" / "הומר לאנגלית ⇄"; `scheduleSave()` + `rAF(updatePagination)` ✅.
- **מצבי קצה:** אין בחירה ואין מילה לפני הסמן → hint "סמן טקסט או הקלד מילה ואז F9"; טווח של רווחים בלבד → return שקט; פוקוס מחוץ לעורך → F9 לא נתפס (מתנהג כברירת-מחדל של הדפדפן).

---

# 3. לשונית תצוגה (`data-ribbon="view"`, HTML 2397–2443)

## 3.1 ערכת נושא — `#vwLight` / `#vwDark` (JS 10583–10593)
- `applyTheme('dark')` → `body[data-theme="dark"]`; `'light'` → הסרת האטריביוט.
- **UI בלבד:** ה-CSS (1779–1796) צובע tabs/ribbon/toolbar/status/editor-area — **הדף (`.page`) נשאר לבן** (אין סלקטור על `#editor`/`.page`).
- **שמירה:** `localStorage['myword2_theme']`; מוחל מיד בטעינה (שורה 10593).
- **ויזואלי:** `active-feature` על הכפתור הפעיל (בהיר פעיל כברירת מחדל).

## 3.2 מיקוד — `#vwFocus` (JS 10595–10611)
- Toggle של `body.focus-mode` → CSS מסתיר tabs/ribbon/toolbar/status (`display:none !important`), editor-area בגובה 100vh.
- **יציאה:** Esc (listener גלובלי, רק כשהמצב פעיל), או כפתור צף `#focusExitBtn` ("✕ יציאה ממיקוד") שנוצר ב-init ומוצג רק ב-focus-mode.
- **לא נשמר** — מתאפס ברענון (by-design).
- ⚠️ מאזין ה-Esc **לא** עוצר propagation — Esc במיקוד עשוי גם לסגור ctxBar פתוח. זניח.

## 3.3 מצגת — `#vwPresent` (JS 10624–10690)
- **בניית שקופיות (`buildSlides`):** clone של העורך **בלי** `.free-obj` ובלי דחיפות עימוד. ילדים רלוונטיים = נראים או עם טקסט/img/table.
  - יש H1/H2 במסמך → שקופית לכל כותרת (הכותרת + התוכן עד הבאה).
  - אין כותרות → שקופית כל **3 פסקאות**.
  - מסמך ריק → שקופית אחת "(מסמך ריק)".
- **Overlay `#presoOverlay`:** `position:fixed`, `z-index:10060` (מעל הכל), מונה `cur+1 / total`, רמז ניווט. `requestFullscreen()` (כשל נבלע — עדיין עובד כ-overlay).
- **ניווט:** ArrowLeft/PageDown = הבא; ArrowRight/PageUp = הקודם (RTL!); click על ה-overlay = הבא; Esc = יציאה.
- **יציאה:** `exitPreso` — הסרת overlay + מאזינים + `exitFullscreen`. `fullscreenchange` → יציאה מ-fullscreen (גם ב-F11/Esc של הדפדפן) סוגרת את המצגת.
- **עימוד:** עובד על clone — אפס השפעה על המסמך. ✅

## 3.4 שורת סטטוס — `#vwStatusBar` (JS 10613–10617)
- Toggle של `body.hide-status` → `.status { display:none !important }`. `active-feature` כשמוסתר. לא נשמר.

## 3.5 זום — `#vwZoomIn` / `#vwZoomOut` / `#vwZoomReset` (JS 10619–10622)
- **Proxy בלבד:** מפנים ל-click על פקדי הסטטוס `#zoomIn`/`#zoomOut`/`#zoomReset` — מקור אמת יחיד ללוגיקת הזום (§10: `style.zoom`, 50%–200%, צעד 10%, `window._docZoom`).
- **מצב קצה:** אם הסטטוס מוסתר (`hide-status`) — `click()` תכנותי עדיין עובד (display:none לא חוסם). ✅

---

# 4. טבלת פערים מול הגרסה הישנה (`ישן/MyWord.html`)

| # | מה היה בישן | בישן (שורה) | ב-v2 | מומלץ להעביר? |
|---|---|---|---|---|
| 1 | **שוליים + כיוון דף** (צרים/רחבים, לאורך/לרוחב) | `setMargins` 5301, `setOrientation` 5308 | הושמט **בכוונה** | ❌ **אסור לעד** — CLAUDE §15 (21×29.7, שוליים 2.5cm קבועים). לא פער — החלטה. |
| 2 | **ערכת נושא מותאמת-אישית** — modal עם 4 בוררי צבע, עד 10 ערכות שמורות (`wl_saved_themes`, `wl_active_theme`) | 7591–7650 | רק בהיר/כהה | ⚠️ **בינוני.** עלות נמוכה (CSS vars כבר קיימים), תועלת נישתית. אם מעבירים — `.mw-panel` עם 3–4 משתנים, מפתח `myword2_custom_theme`. לא דחוף. |
| 3 | **smartLog ויזואלי** — תווית "→ עברית"/"← אנגלית" בכל יישור (3.5s) | `_updateSmartLog` 5231 | hint חד-פעמי בהפעלה בלבד | ✅ **מומלץ, זול.** showHint בתוך debounce ה-input כשהכיוון השתנה (~5 שורות). |
| 4 | **יעדים כמודאל נפרד** + `clearGoals` | 7577–7584 | משולב בסטטיסטיקה; יעד **פר-מסמך** (שיפור!) | ❌ v2 עדיף. אפשר כפתור "נקה יעד" — קוסמטי. |
| 5 | **הקראה עם זיהוי שפה** — שפה אחת לכל הטקסט | 6430 | v2: שפה **פר-משפט** | ❌ v2 עדיף. |
| 6 | **הכתבה — דיווח כל שגיאה** ב-toast | 6416 | v2 מדווח רק על חסימת מיקרופון | ⚠️ **קטן.** מומלץ hint גם על `network`/`audio-capture` (~3 שורות). |
| 7 | **מצגת מתקדמת:** מעברים, צפיפות, ערכת שקופית, הערות-מציג, פס התקדמות, שוברי-שקופית | 9800–9912 | מצגת מינימלית | ⚠️ מדורג: (א) פס התקדמות — זול, שווה. (ב) שובר-שקופית ידני — בינוני. (ג) השאר — לדחות. |
| 8 | **ordinals** (42nd → 42ⁿᵈ) | 6663–6683 | אין | ❌ אנגלית בלבד, מוצר עברי. |
| 9 | **גרש בודד חכם** (' → ' ') | 6617–6635 | רק כפולים | ⚠️ nice-to-have (~10 שורות, עם הגנת-עברית). |
| 10 | **em-dash `—`** | 6650 | v2 נותן en-dash `–` | ⚠️ Word נותן em-dash; שינוי תו אחד; לתאם עם נוי. |
| 11 | **זום 40%–300%** (transform:scale) | 5325 | 50%–200%, `style.zoom` | ❌ מנגנון transform אסור (§10). הרחבת טווח אפשרית אם תבוקש. |
| 12 | **TOC לא-עריך** עם כפתורי עדכן/הסר + פנל סרגל-צד | 7517–7574 | div עריך | ⚠️ חלקית: contenteditable=false + כפתור הסרה — זול; לבדוק השפעה על סמן. סרגל-צד — לא. |
| 13 | **סרגל צד** | 7654 | אין | ❌ ארכיטקטורה שונה. |
| 14 | **תבניות + Slash-menu** | 3574, 6443 | אין | תבניות: חופף ל"קטעים". Slash: ❌ לא Word-style (§14). |
| 15 | **F2 לפנל אוטו-עיצוב** | 3509 | אין קיצור | ❌ זניח. |

## סיכום המלצות לפי עלות/תועלת
1. **זול ושווה (להעביר):** #3 smartLog חי, #6 דיווח שגיאות הכתבה, #7א פס-התקדמות במצגת.
2. **לשקול (תיאום עם נוי):** #10 em-dash, #12 TOC לא-עריך + הסרה, #9 גרש בודד.
3. **לא להעביר:** #1 (חוקה), #4/#5 (v2 עדיף), #8, #11, #13, #14, #15.

---

# 5. מטריצת התמדה (Persistence)

| מה | היכן | היקף |
|---|---|---|
| ערכת נושא | `myword2_theme` | גלובלי |
| אוטו-עיצוב | `myword2_autofmt` | גלובלי |
| איות | `myword2_spell` | גלובלי |
| יעדי כתיבה | `myword2_goals` (מילון docId→goal) | **פר-מסמך** |
| קטעים | `myword2_snippets` (מערך) | גלובלי |
| רקע דף | שדה `pageBg` במסמך (עטיפת saveDoc/loadDoc) | פר-מסמך |
| רווח פסקה | inline styles ב-`content` | פר-מסמך |
| כיוון פסקאות | `dir` + `text-align` ב-`content` | פר-מסמך |
| **לא נשמרים:** כיוון-חכם, מיקוד, הסתרת-סטטוס, הכתבה/הקראה | — | מתאפסים ברענון (by-design) |

# 6. מטריצת עימוד — מי קורא `rAF(updatePagination)`

| פעולה | קורא? | תקין? |
|---|---|---|
| setParaDir / autoDetectDirAll | ✅ | ✅ |
| כיוון-חכם בהקלדה (debounce) | ❌ | ✅ dir לא משנה גובה |
| רקע דף | ❌ | ✅ לא משנה גובה |
| רווח פסקה | ✅ | ✅ חובה — margins |
| אוטו-עיצוב md/hr | ✅ | ✅ |
| אוטו-עיצוב dash/quotes/url | ❌ | ✅ אורך דומה — זניח |
| snippets הוספה / TOC / הכתבה / F9 | ✅ | ✅ |
| מצגת / ייצוא | ❌ | ✅ עובדים על clone |

---

# 7. תצפיות אורקל למרקוס (לא באגים מאומתים)
1. tooltip ההקראה אומר "מהסמן עד הסוף" אבל הקוד מקריא את **כל** המסמך כשאין בחירה.
2. `--` הופך ל-`–` (en-dash) ולא `—` (em-dash) כמו בישן וכמו Word — מתועד ב-CLAUDE §16, ייתכן מכוון.
3. שם snippet מוזרק ל-innerHTML ללא escaping — קוסמטי בלבד.

---

# 8. שדרוג שלב 2 — פיצ'רים מקצועיים (2026-06-12c)

## §2.1 כיוון חכם — תו-חזק-ראשון (Word / Unicode UAX#9)
`_firstStrongDir(text)` → `'rtl'`/`'ltr'`/`null` לפי **התו הכיווני-החזק הראשון** (עברית/ערבית=rtl, לטינית=ltr; ספרות/סימנים=נייטרלי, מדלגים). מחליף את `detectScript` (ספירת-רוב) ב-`autoDetectDirAll` ובמאזין ה-input של הכיוון-החכם. **תוצאה:** פסקה שמתחילה בעברית עם ציטוט אנגלי ארוך נשארת rtl. `detectScript` נשאר ל-F9 בלבד (מטרה שונה — רוב). תרחיש: `layout-smart-dir-mixed`.

## §2.2 בורר צבע מקצועי — `openColorWheel(opts)`
`opts = { anchor, color, onPick, onLive?, showNone?, title? }`. גלגל גוון/רוויה מבוסס canvas (hue=זווית, sat=רדיוס, מצויר פעם אחת ב-value=1), בהירות ע"י שכבת-עמעום שחורה (opacity=1−v), מחוון בהירות נפרד, שדה HEX דו-כיווני, צבעים אחרונים (`myword2_recent_colors`, עד 10). עוזרים: `_hsvToRgb`/`_rgbToHsv`/`_hexToRgb`/`_rgbToHex` (round-trip מדויק). מחובר: צבע-טקסט + הדגשה (capture-listener על החץ `.cbtn-caret` שמדכא את פלטת-הבועות הישנה; גוף-הכפתור עדיין מחיל מיד), ורקע-דף מותאם (`#loBgCustom`, `onLive`=תצוגה חיה). נסגר ב-`_mwPanelDismiss`. תרחיש: `home-color-wheel`.

## §2.3 הקראה — בחירת קריין + קצב/גובה
`prefs = { voiceURI, rate, pitch }` ב-`myword2_tts`. כפתור `#tlVoiceOpts` (חץ ▾) פותח `.mw-panel.voice`: `<select>` קולות (`speechSynthesis.getVoices()`, מקובץ עברית/English/אחר, מתעדכן ב-`onvoiceschanged`), מחוון קצב (0.5–2), מחוון גובה (0–2), כפתור "נסה קריין". `voiceFor(lang)` בוחר לכל משפט קול תואם-שפה (העדפת-המשתמש אם שפתה תואמת, אחרת קול ראשון בשפה). תרחיש: `tools-voice-opts`.
