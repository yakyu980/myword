# מפרט סרגל כלים — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` + `docs/SPEC-TABS.md` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> HTML: שורות 3138–3191 | JS: שורות 10956–11365.

---

## קבוצה 1: הגהה

### `#tlSpell` — בדיקת איות (toggle)

**מה קורה:**
1. Toggle `editor.spellcheck` (true ↔ false)
2. `editor.blur()` + `editor.focus()` — רענון סימונים אדומים של הדפדפן
3. `classList.toggle('active-feature')` על הכפתור
4. שמירה: `localStorage['myword2_spell'] = '1'/'0'`

**ברירת מחדל:** פעיל (HTML: `spellcheck="true"`). אם אין localStorage — ברירת מחדל פעיל.

**Edge Cases:**
- `blur()/focus()` עלול לאבד מיקום סמן — by-design (מחיר רענון)
- בדיקת איות תלויה בדפדפן — Chrome ו-Edge תומכים עברית

---

### `#tlStats` — סטטיסטיקה + יעד כתיבה

**פנל `.mw-panel.stats`:**

**נתונים מחושבים בפתיחה:**
- מילים: `editor.innerText.trim().split(/\s+/).filter(Boolean).length`
- תווים (עם רווחים): `editor.innerText.length`
- תווים (בלי רווחים): `editor.innerText.replace(/\s/g,'').length`
- פסקאות: `editor.querySelectorAll('p,h1,h2,h3,li').length`
- עמודים: `_pageCounts().effective`
- זמן קריאה: `Math.ceil(words/200)` דקות, מינימום 1

**יעד מילים:**
- input מספרי + כפתור "קבע" → `_setGoal(n)`
- שמירה: `localStorage['myword2_goals']` = `{docId: n}` — **פר-מסמך**
- ערך 0/ריק → מחיקת היעד + הסרת `#goalProgress`

**מד התקדמות `#goalProgress`:**
- נוצר דינמית ב-`.status .left`
- `🎯 pct% [bar] words/goal`; pct מוגבל ל-100%
- מתעדכן ב-input עם debounce 600ms — **רק אם האלמנט קיים**

**Edge Cases:**
- מסמך ריק → 0 מילים, "~1 דק'"
- אין `currentDocId` → יעד לא נשמר
- מחיקת יעד → `el.remove()` מהסטטוס

---

## קבוצה 2: קול

### `#tlDictate` — הכתבה קולית (toggle)

**תנאי קדם:**
- API: `window.SpeechRecognition || window.webkitSpeechRecognition` — אם אין → `disabled`, `opacity:0.45`
- `window.isSecureContext` (https/localhost) — אם false → hint ברור (file:// חוסם מיקרופון)

**הפעלה:**
1. `navigator.mediaDevices.getUserMedia({audio:true})` — מפורש לפני `rec.start()` (מציג prompt)
2. יוצר `SpeechRecognition` עם `lang='he-IL'`, `continuous=true`, `interimResults=false`
3. מציג `#micIndicator` ("מקליט… דבר עכשיו")

**הכנסת טקסט (`insertFinal`):**
- רק תוצאות `isFinal`
- `restoreSelection()` (או focus)
- מחיקת הבחירה → text node + רווח → סמן אחריו
- `_saveLiveSel()` + `scheduleSave()` + `rAF(updatePagination)`

**restart אחרי שתיקה:** `onend` → אם עדיין active → `rec.start()` מחדש

**שגיאות:**
- `not-allowed` / `service-not-allowed` → stop + hint "אין הרשאת מיקרופון"
- שאר שגיאות (network, no-speech) → נבלעות, ה-restart ב-onend מכסה

**ניקוי:** `beforeunload` → stop

**Edge Cases:**
- `mousedown` על הכפתור שומר בחירה → ההכתבה נכנסת במיקום הסמן האחרון, לא בסוף

---

### `#tlSpeak` — הקראה (toggle)

**תנאי קדם:** `window.speechSynthesis` — אם אין → `disabled`, hint

**קלט:**
- בחירה שמורה (`_savedRange` לא-collapsed) → **רק הבחירה**
- אחרת → **כל** `editor.innerText`
- ⚠️ tooltip אומר "מהסמן עד הסוף" — **פועל** בפועל על כל המסמך

**מנגנון:**
1. פיצול ב-lookbehind על `.!?׃:\n`
2. לכל משפט → `SpeechSynthesisUtterance` עם שפה לפי `detectScript`:
   - `'en'` → `lang='en-US'`
   - אחרת → `lang='he-IL'`
3. `voiceFor(lang)` בוחר קול תואם-שפה מה-`prefs` של המשתמש
4. Toggle: לחיצה בזמן הקראה → `speechSynthesis.cancel()`
5. Utterance אחרון: `onend` → כיבוי אוטומטי

**Edge Cases:** מסמך ריק → hint "אין טקסט להקראה"

---

### `#tlVoiceOpts` — פנל קריין + הגדרות קול (עודכן 2026-07-06)

**HTML:** `id="tlVoiceOpts"` (כפתור חץ ▾)

**2 קריינים בלבד** (`PERSONA_ORDER=['ben','bat']`) — **אין** קריין-מותאם-אישית ("קריין שלי" הוסר לגמרי, כולל כל שדות ה-UI שלו: שם/קול-נבחר/קצב-נפרד/גובה-נפרד/Azure-מותאם/קובץ-קלונינג).

**3 מסלולי-קול, נבחרים לפי סדר-עדיפות ב-`_playFrom` (עודכן 2026-07-06 — `synthMode`/`_SYNTH` הוסרו לגמרי, אין יותר קריין-מובנה):**
1. **`prefs.azureKey`** — Azure Neural TTS (Avri/Hila) דרך SSML; `<prosody rate='±N%' pitch='±N%'>` עוטף כל משפט.
2. **`prefs.xttsUrl`** — שרת-קול-מקומי (edge-tts/XTTS, למשל `http://127.0.0.1:8021` — קוד השרת חי מחוץ ל-`MyWord-v2.html`, ב-`ttslab/edge_server.py`) דרך `fetch(url+'/tts', {text, language, narrator, rate:'±N%', pitch:'±NHz'})`; נופל אוטומטית ל-Web Speech אם השרת לא עונה.
3. **ברירת-מחדל** — Web Speech API (`speechSynthesis`), קול-מערכת לפי `voiceFor(lang)`.

**מחווני קצב (0.5–2) וגובה (0–2)** — תמיד גלויים ללא תנאי. משפיעים על כל 3 המסלולים כאחד.

**קטע "🖥 שרת קול מקומי":** שדה URL יחיד (`#_xttsUrl`) + כפתור שמור (`#_engineSave`). ברירת-מחדל ריק (משתמש בקול-מערכת).

**כפתור "נסה קריין"** (`#_ttsTest`) → utterance קצרה דרך המסלול הפעיל, בקריין הנוכחי.

**שמירה:** `localStorage['myword2_tts'] = { persona, rate, pitch, azureKey, azureRegion, synthMode, xttsUrl, voiceURI }`

---

## קבוצה 3: שפה · F9

### `#tlLangFix` + מקש F9 — תקן שפה

**מיפוי מקלדת ישראלית:**
- `KBD_EN2HE`: מפה מ-QWERTY לעברית (כולל `;→ף`, `,→ת`, `.→ץ`, `'→,`, `/→.`, `q→/`, `w→'`)
- `KBD_HE2EN`: נבנה אוטומטית (ה-reverse של KBD_EN2HE)
- תווים לא-ממופים (מספרים, רווחים) → נשארים

**בחירת טווח (`convertLayout`):**
- בחירה לא-collapsed בעורך → היא הטווח
- אחרת → `_lastWordRange()` — מילה אחרונה לפני הסמן (TreeWalker ל-text-node האחרון)

**כיוון המרה:** `detectScript(text)`:
- רוב אנגלי → `EN2HE`
- אחרת → `HE2EN`

**המרה משמרת-עיצוב:** TreeWalker על text-nodes בטווח; offsets start/end נשמרים. `<b>`/`<i>`/spans לא נפגעים.

**undo:** `window._historyRecord()` לפני השינוי → Ctrl+Z מחזיר בצעד אחד.

**בחירה-מחדש:** הטווח שהומר נבחר שוב → F9 שוב = toggle חזרה.

**כיוון-חכם:** אם `_smartDirOn` → הבלוק מיושר לשפה החדשה.

**טריגרים:**
- כפתור `#tlLangFix`: `mousedown` → `_saveLiveSel()`, `click` → המרה
- F9 גלובלי: **רק** כשפוקוס ב-`#editor` או `.tb-content` (+ `preventDefault`)

**Output:** hint "הומר לעברית ⇄" / "הומר לאנגלית ⇄" + `scheduleSave()` + `rAF(updatePagination)`

**Edge Cases:**
- אין בחירה ואין מילה לפני סמן → hint "סמן טקסט או הקלד מילה ואז F9"
- טווח של רווחים בלבד → return שקט
- פוקוס מחוץ לעורך → F9 לא נתפס (ברירת-מחדל דפדפן)

---

## קבוצה 4: מסמך

### `#tlSnippets` — קטעים שמורים

**אחסון:** `localStorage['myword2_snippets']` = מערך `{id, name, html, updated}` — **גלובלי** (לא פר-מסמך)

**שמירת קטע:**
1. `mousedown` → `_saveLiveSel()` (שמירת הסימון)
2. פנל נפתח: שדה שם + רשימה
3. כפתור "שמור קטע": דורש שם + בחירה לא-collapsed
4. `cloneContents()` → **מסיר `.free-obj` מהעותק** → שומר innerHTML
5. רענון רשימת הפנל

**הוספה ("הוסף"):**
1. `restoreSelection()` או focus
2. `execCommand('insertHTML')` → נכנס ל-undo
3. `scheduleSave()` + `rAF(updatePagination)`

**מחיקה (🗑):** splice + רענון. **אין אישור-מחיקה.**

**Edge Cases:**
- אין שם → hint "תן שם לקטע"
- אין בחירה → hint "סמן קודם טקסט בעורך"
- רשימה ריקה → "אין קטעים שמורים עדיין."
- ⚠️ שם עם `<` → שובר תצוגת רשימה (אין escaping — קוסמטי בלבד)

---

### `#tlTOC` — תוכן עניינים

**build:**
1. אוסף `h1,h2,h3` (לא בתוך `.free-obj`, עם טקסט)
2. מקצה `id="toc_<timestamp+n>"` לכותרות חסרות id
3. בונה `div.mw-toc[data-mwtoc="1"]`:
   - שורת "תוכן עניינים"
   - `<p><a href="#id">` לכל כותרת
   - H2/H3 → `class="toc-l2"/"toc-l3"` (הזחה)

**מיקום:**
- קיים `[data-mwtoc]` → `replaceWith` (עדכון במקום)
- אחרת → `insertBefore firstChild` (ראש המסמך)

**ניווט:** click-delegate על `#editor` → קישור בתוך `.mw-toc` → `preventDefault` + `scrollIntoView({smooth})`

**שמירה:** `scheduleSave()` + `rAF(updatePagination)`

**Edge Cases:**
- אין כותרות → hint "אין כותרות (H1-H3) במסמך"; לא נוצר בלוק
- ⚠️ TOC **עריך** (contenteditable) — משתמש יכול לשבור; עדכון מחדש פותר
- TOC ארוך → `splitContainer` בעימוד (נשמר עם content)

---

## מטריצת שמירה

| מה | היכן | היקף |
|---|---|---|
| איות (on/off) | `localStorage['myword2_spell']` | גלובלי |
| יעדי כתיבה | `localStorage['myword2_goals']` `{docId→n}` | פר-מסמך |
| קטעים | `localStorage['myword2_snippets']` | גלובלי |
| הגדרות קריין | `localStorage['myword2_tts']` | גלובלי |
| **לא נשמרים** | הכתבה פעילה, הקראה פעילה | — |

## טבלת סיכום מהיר

| # | פקד | פעולה | קיצור |
|---|---|---|---|
| 1 | `#tlSpell` | Toggle `editor.spellcheck` | — |
| 2 | `#tlStats` | פנל סטטיסטיקה + יעד | — |
| 3 | `#tlDictate` | Toggle SpeechRecognition | — |
| 4 | `#tlSpeak` | Toggle speechSynthesis | — |
| 5 | `#tlVoiceOpts` | פנל קריין + קצב/גובה | — |
| 6 | `#tlLangFix` | `convertLayout()` | F9 |
| 7 | `#tlSnippets` | `openSnippetsPanel()` | — |
| 8 | `#tlTOC` | בנה/עדכן תוכן עניינים | — |

## חוקים שנשמרים

- **CLAUDE §13 (קיצורי מקלדת):** F9 = תקן שפה, פועל רק כשפוקוס בעורך
- **CLAUDE §4 (עימוד):** הכתבה + TOC + קטעים קוראים `rAF(updatePagination)` ✅
- **CLAUDE §8 (פנלים):** כל פנל נסגר ב-`_mwPanelDismiss` (pointerdown+Esc)
- **CLAUDE §2 (ייצוא):** ייצוא Word/PDF/HTML עבר ל-**קובץ** — ⚠️ לא בכלים עוד
