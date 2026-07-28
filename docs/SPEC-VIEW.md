# מפרט סרגל תצוגה — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` + `docs/SPEC-TABS.md` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> HTML: שורות 3193–3257 | JS: שורות 10583–10622.

> ### ⚠️ שינוי מבני (2026-06-12b)
> **רקע דף** עבר מלשונית **פריסה** ל-**תצוגה** (קבוצת `loBg*`). מזהי הכפתורים ו-JS נשארו זהים.
> **מצגת** (`#vwPresent`) — **הוסרה לגמרי** ב-2026-06-12b. ראה CLAUDE §16.

---

## קבוצה 1: ערכת נושא

### `#vwLight` — בהיר

**מה קורה:**
1. `applyTheme('light')` → `body.removeAttribute('data-theme')`
2. `classList.add('active-feature')` על `#vwLight`, הסרה מ-`#vwDark`
3. שמירה: `localStorage['myword2_theme'] = 'light'`

**UI בלבד:** CSS צובע tabs/ribbon/toolbar/status/editor-area. **הדף (`.page`) נשאר לבן.**

---

### `#vwDark` — כהה

**מה קורה:**
1. `applyTheme('dark')` → `body.setAttribute('data-theme','dark')`
2. CSS (שורות 1779–1796) מחיל: `--bg: #1a1b1e`, `--panel: #2c2d30`, `--text: #e8eaf6` וכד'
3. שמירה: `localStorage['myword2_theme'] = 'dark'`

**⚠️ חשוב:** `#editor` ו-`.page` **לא** מקבלים רקע כהה — הדף הוירטואלי נשאר לבן בכהה.

**אתחול בטעינה:** `localStorage['myword2_theme']` נקרא ומוחל מיד (שורה 10593).

---

## קבוצה 2: רקע דף

### `#loBgWhite` — לבן

**מה קורה:** `applyPageBg('')` → `_pageBg = ''` → מסיר `editor.style.background` (ברירת מחדל)

**⚠️ לבן = מחרוזת ריקה**, לא `#ffffff`. מסמך חדש ללא `pageBg` → `''`.

---

### `#loBgCream` — קרם

**מה קורה:** `applyPageBg('#fdf6e3')` → `editor.style.background = '#fdf6e3'`

---

### `#loBgBlue` — תכלת

**מה קורה:** `applyPageBg('#eff6ff')` → `editor.style.background = '#eff6ff'`

---

### `#loBgCustom` — מותאם (input type=color)

**HTML:** `<label>` עוטף `<input id="loBgCustom" type="color">` מוסתר

**מה קורה:**
- אירוע `input` (שינוי חי תוך-כדי גרירה בבורר צבע)
- **גם** `openColorWheel(opts)` (ראה CLAUDE §11 שלב 2) — בורר HSV מקצועי
- `onLive` callback → תצוגה חיה בזמן גרירת הגלגל
- `onPick` callback → `applyPageBg(color)` + `scheduleSave()`

**שמירה (`applyPageBg`):**
1. `_pageBg = color`
2. `editor.style.background = color`
3. `scheduleSave()` — שדה `pageBg` נשמר ב-document דרך עטיפה שלישית של `window.saveDoc`/`window.loadDoc`

**הדפסה:** `@media print { #editor { background: #fff !important } }` — תמיד לבן, ללא קשר לבחירה.

**עימוד:** לא קורא `updatePagination` — רקע לא משנה גובה. תקין.

---

## קבוצה 3: מצבי תצוגה

### `#vwFocus` — מצב מיקוד (toggle)

**מה קורה:**
1. `body.classList.toggle('focus-mode')`
2. CSS: `display:none !important` על `.tabs`, `.ribbon`, `.toolbar`, `.status`
3. `editor-area` קיבל `height: 100vh`

**יציאה:**
- Esc (listener גלובלי, רק כשהמצב פעיל)
- כפתור צף `#focusExitBtn` ("✕ יציאה ממיקוד") — נוצר ב-init, מוצג רק ב-focus-mode
- `@media print`: `#focusExitBtn` מוסתר

**לא נשמר** — מתאפס ברענון (by-design).

**Edge Cases:**
- מאזין Esc ב-vwFocus **לא** עוצר propagation — Esc עלול גם לסגור ctxBar פתוח (זניח)

---

### `#vwStatusBar` — שורת סטטוס (toggle)

**מה קורה:**
1. `body.classList.toggle('hide-status')`
2. CSS: `.status { display:none !important }`
3. `classList.toggle('active-feature')` על הכפתור כשמוסתר

**לא נשמר** — מתאפס ברענון.

**Edge Cases:**
- כשסטטוס מוסתר: `#zoomIn`/`#zoomOut`/`#zoomReset` — click() תכנותי עדיין עובד (display:none לא חוסם)

---

## קבוצה 4: זום

### `#vwZoomIn` / `#vwZoomOut` / `#vwZoomReset` — זום

**מנגנון:** פרוקסי בלבד — מפנים ל-click על פקדי הסטטוס:
- `#vwZoomIn` → `document.getElementById('zoomIn').click()`
- `#vwZoomOut` → `document.getElementById('zoomOut').click()`
- `#vwZoomReset` → `document.getElementById('zoomReset').click()`

**מקור האמת (שורת הסטטוס):**
- `#pageStack { style.zoom: X }` — **לא** `transform:scale` (CLAUDE §10)
- טווח: **50%–200%**, צעד 10%
- Ctrl+גלגלת עכבר → גם שם
- `window._docZoom` — ערך נוכחי; מחלק delta בגרירה/שינוי-גודל

**`#vwZoomReset`:** מחזיר `zoom = 1` (100%), `window._docZoom = 1`

**Edge Cases:**
- סטטוס מוסתר (`hide-status`) → click() תכנותי עדיין עובד
- ⚠️ **אסור** `transform:scale` לזום (§10 CLAUDE) — שובר גרירת אובייקטים

---

## מטריצת שמירה

| מה | היכן | היקף |
|---|---|---|
| ערכת נושא | `localStorage['myword2_theme']` | גלובלי |
| רקע דף | שדה `pageBg` ב-document | פר-מסמך |
| **לא נשמרים** | מיקוד, הסתרת-סטטוס | מתאפסים ברענון |

## טבלת סיכום מהיר

| # | פקד | פעולה | קיצור |
|---|---|---|---|
| 1 | `#vwLight` | `applyTheme('light')` | — |
| 2 | `#vwDark` | `applyTheme('dark')` | — |
| 3 | `#loBgWhite` | `applyPageBg('')` | — |
| 4 | `#loBgCream` | `applyPageBg('#fdf6e3')` | — |
| 5 | `#loBgBlue` | `applyPageBg('#eff6ff')` | — |
| 6 | `#loBgCustom` | `openColorWheel` + `applyPageBg` | — |
| 7 | `#vwFocus` | Toggle `body.focus-mode` | Esc (יציאה) |
| 8 | `#vwStatusBar` | Toggle `body.hide-status` | — |
| 9 | `#vwZoomIn` | Proxy → `#zoomIn.click()` | Ctrl+גלגלת |
| 10 | `#vwZoomOut` | Proxy → `#zoomOut.click()` | — |
| 11 | `#vwZoomReset` | Proxy → `#zoomReset.click()` | — |

## חוקים שנשמרים

- **CLAUDE §10 (זום):** `style.zoom`, לא `transform:scale`; `window._docZoom` לחישובי גרירה
- **CLAUDE §3 (דף לבן):** רקע דף מותאם לא מודפס (`@media print`)
- **CLAUDE §15 (מה אסור):** DOM של `.page` לא משתנה בשינוי ערכת נושא
- **CLAUDE §16 (מצגת):** הוסרה לגמרי — `#vwPresent` לא קיים ב-v2
- **CLAUDE §11 (בורר צבע):** `openColorWheel` מחובר ל-`#loBgCustom`
