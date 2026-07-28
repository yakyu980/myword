# מפרט סרגל פריסה — MyWord v2
> מקור: קריאה ישירה מ-`MyWord-v2.html` + `docs/SPEC-TABS.md` · עדכון: 2026-06-20
> **שימוש:** דאן (spec-expert) + מרקוס + סאמר קוראים קובץ זה לפני בדיקה/תיקון.
> HTML: שורות 3086–3136 | JS: שורות 10692–10954.

> ### ⚠️ שינוי מבני (2026-06-12b)
> **רקע דף** עבר מ-layout ל-view. ראה `SPEC-VIEW.md`. ב-layout נשארו: כיוון, רווח פסקה, אוטו-עיצוב בלבד.

---

## מנגנון בסיסי משותף

כל כפתורי הכיוון ורווח-הפסקה:
- `mousedown` → `_saveLiveSel()` + `preventDefault` (שמירת הסימון)
- `click` → `restoreSelection()` → ביצוע הפעולה → `scheduleSave()` → `rAF(updatePagination)`

---

## קבוצה 1: כיוון טקסט

### `#loDirRtl` — עברית (RTL)

**מה קורה:**
1. `_saveLiveSel()` + `e.preventDefault()` על mousedown
2. `click` → `restoreSelection()` → `setParaDir('rtl')`
3. `_selectedBlocks()` → לכל בלוק: `el.setAttribute('dir','rtl')` + `el.style.textAlign = 'right'`
4. `scheduleSave()` + `rAF(updatePagination)`

**Input → Output:** סמן בפסקה → "עברית" → `dir="rtl"`, `text-align:right`

**Edge Cases:**
- אין בחירה/סמן → `_selectedBlocks()` ריק → `showHint('הצב את הסמן בפסקה או סמן טקסט')`, אין שינוי
- כבר rtl → מיושם שוב (idempotent, אין בעיה)

---

### `#loDirLtr` — English (LTR)

**מה קורה:** זהה ל-`loDirRtl` אבל:
- `setParaDir('ltr')` → `setAttribute('dir','ltr')` + `textAlign = 'left'`

**תרחיש בדיקה:**
```
Input: סמן בפסקה "Hello World" → לחץ "English"
Expected: dir="ltr", text-align:left
```

---

### `#loDirAuto` — כיוון חכם (toggle)

**State:** `_smartDirOn` (boolean, module-level). **לא נשמר** — מתאפס ברענון.

**הפעלה:**
1. Toggle `_smartDirOn`
2. `classList.toggle('active-feature')` על הכפתור
3. `autoDetectDirAll()`:
   - סורק `p, h1, h2, h3, li, blockquote, div:not(.free-obj)` — **בלוקי-עלים בלבד**
   - מדלג על בלוק שמכיל בלוקים אחרים (כדי לא לשנות container div)
   - לכל בלוק: `_firstStrongDir(text)` → `'rtl'/'ltr'/null` לפי **התו הכיווני-החזק הראשון** (UAX#9)
   - אם שונה מהרצוי — מיישם; מחזיר כמות השינויים
   - `showHint("כיוון חכם פעיל — N פסקאות יושרו")`
   - קורא `rAF(updatePagination)` **רק אם** `changed > 0`

**הקלדה (input listener, debounce 350ms):**
- מתקן **רק את הבלוק הנוכחי** תחת הסמן

**`_firstStrongDir(text)` לעומת `detectScript(text)`:**
| פונקציה | שיטה | שימוש |
|---|---|---|
| `_firstStrongDir` | תו חזק ראשון (UAX#9) | כיוון-חכם + autoDetect |
| `detectScript` | ספירת רוב | F9 (תקן שפה) בלבד |

**תרחיש:**
```
Input: פסקה "שלום Hello World World World" → כיוון חכם
Expected: dir="rtl" (התו הראשון ש-strong הוא עברי)
```

**Edge Cases:**
- מסמך ריק → 0 שינויים, hint "כיוון חכם פעיל — 0 פסקאות יושרו"
- פסקה עם מספרים בלבד → `_firstStrongDir` → null → לא נוגעים
- כיבוי → `_smartDirOn=false`, הכפתור לא active, מאזין-input נעצר

---

## קבוצה 2: רווח פסקה

### `#loSpaceBefore` / `#loSpaceAfter` — selects

**ערכים:** 0 / 6pt / 8pt / 12pt / 18pt / 24pt

**לא** מחילים בעצמם — יוצרים ערך שנקרא ע"י הכפתורים `loSpaceSel` / `loSpaceAll`.

---

### `#loSpaceSel` — "על הבחירה"

**מה קורה:**
1. `mousedown` → `_saveLiveSel()` + `preventDefault`
2. `click` → `restoreSelection()` → `applyParaSpacing('sel')`
3. יעד: `_selectedBlocks()` — רק הבלוקים המסומנים
4. `style.marginTop = valuePt + 'pt'` / `style.marginBottom = valuePt + 'pt'`
5. ערך 0 → **מסיר** style + `removeAttribute('style')` אם ריק לגמרי
6. `showHint("רווח פסקה הוחל (N פסקאות)")`
7. `rAF(updatePagination)` — חובה כי margins משנים גובה

**Edge Cases:**
- אין סימון/סמן → hint "הצב את הסמן בפסקה..."

---

### `#loSpaceAll` — "על הכל"

**מה קורה:** זהה ל-`loSpaceSel` אבל:
- יעד: כל `p, h1, h2, h3, blockquote, li` שלא בתוך `.free-obj`

**שמירה:** ה-margin נשמר ב-`content` (innerHTML) — אין מפתח נפרד.

**⚠️ נקודת-רגישות:** `paginateBlocks` משתמש ב-`margin-top` לדחיפות עימוד (`data-orig-mt`). רווח-פסקה ידני + פסקה שנדחפת לעמוד הבא — הדחיפה גוברת, ואחריה הרווח משוחזר. בדוק: `layout-para-spacing-paginated`.

---

## קבוצה 3: אוטו-עיצוב

### `#loAutoFmt` — פנל אוטו-עיצוב

**HTML:** `data-ribbon="layout"` → `id="loAutoFmt"`

**פנל (`openAutoFormatPanel`):**
- `.mw-panel.af` מתחת לכפתור
- 5 checkboxes + שורה נעולה "רשימות אוטומטיות — פעיל תמיד" (disabled checked)
- נסגר ב-`_mwPanelDismiss` (ראה CLAUDE §8)

**5 הגדרות (`_afCfg`, localStorage `myword2_autofmt`):**

| מפתח | תיאור | ברירת מחדל |
|---|---|---|
| `quotes` | גרשיים ישרים → מסולסלים (`"hello"` → `"hello"`) | true |
| `dash` | `--` → `–` (en-dash) | true |
| `url` | URL → קישור לחיץ (`<a>`) | true |
| `hr` | `---` + Enter → `<hr>` | true |
| `md` | `**מודגש**` → `<b>`, `*נטוי*` → `<i>` | true |

**שני מאזינים:**

#### keyup (dash, quotes, md)
- פועל **רק** כשהסמן collapsed בתוך text node בעורך
- `dash`: על `-` או רווח — `--` בטווח 3 תווים → `–`
- `quotes`: על `"` — פותח (`"`) אחרי רווח/סוגריים, סוגר (`"`) אחרת. **לא נוגע לעברית** (גרשיים ראשי-תיבות)
- `md`: על `*` — `**txt**` → `<b>`, `*txt*` → `<i>` (Range + insertNode, `rAF(updatePagination)`)

#### keydown (hr, url)
- על רווח/Enter:
- `hr`: שורה שכולה `---` + Enter → `<hr>` + `<p><br>` חדש, סמן בפנים
- `url`: `https?://...` / `www.x.yy` לפני הסמן → `<a target="_blank" rel="noopener">` (www קבל `https://`)

**Edge Cases:**
- בחירה לא-collapsed → המנוע לא רץ
- הקלדה ב-`.tb-content` (תיבת טקסט) → `editor.contains` נכשל → אוטו-עיצוב **רק בעורך הראשי**
- `_afReplace` ו-md/url לא נכנסים ל-undo הילידי — Ctrl+Z דרך `_historyRecord`

**תרחיש בדיקה:**
```
Input: הקלד "--" + Space
Expected: "--" הוחלף ב-"–"

Input: הקלד "https://example.com" + Space
Expected: URL עטוף ב-<a href="https://example.com" target="_blank">
```

---

## מטריצת שמירה

| מה | היכן | היקף |
|---|---|---|
| כיוון פסקאות | `dir` + `text-align` ב-`content` | פר-מסמך |
| כיוון-חכם (on/off) | לא נשמר | — |
| רווח פסקה | `marginTop/marginBottom` ב-`content` | פר-מסמך |
| אוטו-עיצוב | `localStorage['myword2_autofmt']` | גלובלי |

## טבלת סיכום מהיר

| # | פקד | פעולה | קיצור |
|---|---|---|---|
| 1 | `#loDirRtl` | `setParaDir('rtl')` | — |
| 2 | `#loDirLtr` | `setParaDir('ltr')` | — |
| 3 | `#loDirAuto` | `autoDetectDirAll()` toggle | — |
| 4 | `#loSpaceBefore` | בחירת pt לפני | — |
| 5 | `#loSpaceAfter` | בחירת pt אחרי | — |
| 6 | `#loSpaceSel` | `applyParaSpacing('sel')` | — |
| 7 | `#loSpaceAll` | `applyParaSpacing('all')` | — |
| 8 | `#loAutoFmt` | `openAutoFormatPanel()` toggle | — |

## חוקים שנשמרים

- **CLAUDE §3 (שוליים קבועים):** `setMargins` / `setOrientation` לא קיימים ב-v2 — ⚠️ **אסור לעד**
- **CLAUDE §4 (עימוד):** `rAF(updatePagination)` נקרא אחרי שינוי רווח; dir לבד לא קורא (לא משנה גובה)
- **CLAUDE §16 (כיוון-חכם):** `_firstStrongDir` = UAX#9, לא ספירת-רוב. `detectScript` = F9 בלבד
