# SPEC-RCMENU — תפריט קליק-ימני (`#rcMenu`) · עודכן 2026-07-20
> IIFE `initRightClick` (Grep על השם — לא לפי שורה). מאזין `contextmenu` **יחיד** בכל המוצר, על `#editor`.
> כיסוי-בדיקות: suite `rcmenu` (7 תרחישים, `node marcus.mjs --suite rcmenu`).
> קריאה משלימה: `CLAUDE.md` §8 (חוק `#rcMenu`), §13 (קיצורים).

---

## עקרון-העל (2026-07-20): התפריט המותאם מוצג רק כשיש לו ערך מוסף
אין ב-MyWord מנוע-איות משלו — `spellcheck` הוא נייטיב של הדפדפן, ותפריט-הדפדפן הוא ה**מסלול היחיד** להצעות-תיקון ("הקו האדום") ול"הוסף למילון". לכן `preventDefault` גורף אסור.

| הקשר-הקליק | מה קורה | למה |
|---|---|---|
| סמן-מכווץ בטקסט רגיל + `editor.spellcheck` דלוק | **תפריט-הדפדפן** (אין `preventDefault`) | הצעות-איות + הדבקה מלאת-עיצוב |
| סמן-מכווץ + `spellcheck` כבוי (`#tlSpell`) | התפריט שלנו | אין מה להפסיד |
| **בחירת-טקסט** | התפריט שלנו: גזור/העתק/הדבק · B/I/U · קישור | ערך מוסף אמיתי |
| **תא-טבלה** (גם סמן-מכווץ!) | התפריט שלנו + פעולות-טבלה | שורה/עמודה/מיזוג/פיצול/מחק — `window._mergeBlock`/`_splitCell` (שימוש-חוזר, לא שכפול) |
| **קישור `<a[href]`** | פתח / העתק-כתובת / ערוך / הסר (**לא** "הוסף קישור") | ערוך חוסם כתובת-מסוכנת דרך `_isSafeUserUrl` (**לא** `/javascript:/` נאיבי — נעקף ב-`java\nscript:`, ר' SPEC-INSERT); הסרה = `selectNodeContents`+`unlink`, **לא** `remove()` (שומר את טקסט-המשתמש) |
| תמונה / צורה / ציור / מחבר (`.free-obj`) | **אין תפריט** (return מוקדם) | יש להם סרגל-צף — החלטה מכוונת |
| **`.tb-content`** (תיבת-טקסט/פתק) | **כן** מקבל תפריט (חריג ל-guard) | זו עריכת-טקסט אמיתית; עד 07-20 נבלעה בטעות |
| מחוץ ל-`#editor` (ריבון/סיידבר/לשוניות) | תפריט-הדפדפן | אין מאזין — מכוון |

## נגישות (W3C APG)
- `role="menu"` על `#rcMenu` · `role="menuitem"` על כל כפתור · `role="separator"` על `.rc-sep` · `aria-disabled` על מושבתים.
- ניווט: ↓/↑ (מעגלי) · Home/End · Enter/Space מפעיל · Escape סוגר. המאזין ב-**capture** ופעיל רק כשהתפריט פתוח (`display==='block'`).
- **⚠️ ההדגשה היא `class="rc-active"` + `aria-activedescendant` — לא `focus()`.** הזזת-פוקוס אל הכפתור מוציאה אותו מה-contenteditable ושוברת את `execCommand` (מאותה סיבה כל כפתור עושה `preventDefault` ב-`mousedown`).

## מיקום (RTL)
- הקצה **הימני** של התפריט בסמן, גדל שמאלה; אם אין מקום משמאל — מתהפך ימינה; אם אין מקום למטה — נפתח מעל.
- מקש-התפריט של Windows / Shift+F10 שולחים `clientX/Y=0` → נופלים למלבן-הבחירה/הסמן (`getBoundingClientRect` של ה-Range, ואם ריק — של התא/ה-target).

## סגירה
mousedown-מחוץ · scroll (capture) · resize · Escape. `hide()` מנקה גם `aria-activedescendant` ואינדקס-ההדגשה.

## מלכודות
- **בידוד-בדיקות:** `#rcMenu` הוא singleton קבוע ב-`<body>` ואינו `.mw-panel` → `__reset()` חייב לנקות אותו במפורש (נוסף 07-20). תרחישי rcmenu משנים `editor.spellcheck` — `__reset` מחזיר ל-`true`.
- בבדיקות: `dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,...}))` (setup רץ ב-`page.evaluate`, אין `page.mouse`); הפעלת-פריט ב-`.click()` — **לא** pointerup (rcMenu ≠ ctxBar) ו**לא** לדמות mousedown (סוגר את התפריט).
- "הדבק" מהתפריט = `navigator.clipboard.readText` → `insertText` (טקסט-שטוח). ב-`file://` אין clipboard-API → נופל ל-hint. זו מגבלה מוכרת; ההדבקה המלאה היא Ctrl+V (או תפריט-הדפדפן על סמן-מכווץ).
- z-index: `#rcMenu` 10001 > `#ctxBar` 9998 > `.mw-panel` 9990.

## פתוח במכוון (לא באג)
- אין תפריט לתמונה/צורה (סרגל-צף מכסה; פער מול Word מדווח בביקורת 07-20 — ממתין להחלטת-משתמש).
- אין "הדבק ללא עיצוב" ואין 3-מצבי-הדבקה כמו Word.
