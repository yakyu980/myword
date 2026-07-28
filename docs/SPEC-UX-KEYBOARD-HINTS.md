# SPEC-UX-KEYBOARD-HINTS — הצגת קיצורי מקלדת ב-Tooltips

**קטגוריה:** Discoverability · נגישות  
**חומרה:** 🟠 גבוה (משתמשים לא מגלים קיצורים חיוניים)  
**מיקום ב-UI:** סרגל הבית + הוספה + פריסה (כל הריבון)

---

## מה קיים עכשיו

```html
<button id="btnBold" onclick="...">
  <span class="ico">𝐁</span>
  <span class="lbl">מודגש</span>
</button>

<!-- Tooltip = ??:  -->
<!-- title="" (ריק או חסר לחלוטין) -->
```

**בעיה:**
1. **לא יודע שיש Ctrl+B** — משתמש מקלדת (חיץ) חיפש אל תוך הממשק
2. **משתמשי עכבר מנסים לעיתים-קרובות את הקיצור** — מתפלא שהוא עובד כמו ב-Word
3. **Tooltip קיים** (בחלק מהכפתורים) **אך חסר הקיצור**

---

## משתמש חושב

1. "בואו נראה… Ctrl+B זה מודגש, צריך קיצור לסקוות?"
2. "אני דוגמה ב-Excel כל יום, אבל MyWord לא מדגיש את `Ctrl+K` בשום מקום"
3. "רציתי Ctrl+L ליישור שמאל — האם זה עובד?"

**תשובה:** כן, זה עובד בכל מקום. **אבל אף אחד לא יודע.**

---

## הצעה

**Tooltip חייב להיות ברמת בסיס:**

```html
<button id="btnBold" title="מודגש (Ctrl+B)">𝐁</button>
<button id="btnItalic" title="נטוי (Ctrl+I)">𝐼</button>
<button id="btnUnderline" title="קו תחתון (Ctrl+U)">U</button>
<button id="btnStrike" title="קו חציה (Ctrl+Shift+X)">S</button>

<button id="insLink" title="קישור (Ctrl+K)">🔗</button>
<button id="btnRedo" title="חזור (Ctrl+Y או Ctrl+Shift+Z)">↷</button>
<button id="btnUndo" title="בטל (Ctrl+Z)">↶</button>

<!-- יישור -->
<button id="alignLeft" title="יישור שמאל (Ctrl+L)">⬅</button>
<button id="alignCenter" title="יישור מרכז (Ctrl+E)">⬍</button>
<button id="alignRight" title="יישור ימין (Ctrl+R)">➡</button>
<button id="alignJustify" title="דו-צדדי (Ctrl+J)">▦</button>

<!-- גודל גופן -->
<button id="fontSizeDown" title="הקטן גופן (Ctrl+[)">A-</button>
<button id="fontSizeUp" title="הגדל גופן (Ctrl+])">A+</button>

<!-- רשימות -->
<button id="insBullet" title="תבליטים (Ctrl+Shift+L)">⦾</button>
<button id="insNumber" title="ממוספרת (Ctrl+Shift+O)">1.</button>
```

---

## סדר Tooltip לפי format

```
[שם הפעולה] ([קיצור])
```

**דוגמאות:**
- "מודגש (Ctrl+B)"
- "קישור (Ctrl+K)"
- "בטל (Ctrl+Z)"
- "הגדל גופן (Ctrl+])"
- "יישור שמאל (Ctrl+L)"

---

## קיצורים שקיימים בקוד

(מ-CLAUDE.md / docs/SPEC-*)

| פעולה | קיצור |
|---|---|
| מודגש | Ctrl+B |
| נטוי | Ctrl+I |
| קו תחתון | Ctrl+U |
| קישור | Ctrl+K |
| יישור שמאל | Ctrl+L |
| יישור מרכז | Ctrl+E |
| יישור ימין | Ctrl+R |
| דו-צדדי | Ctrl+J |
| בטל | Ctrl+Z |
| חזור | Ctrl+Y / Ctrl+Shift+Z |
| הגדל גופן | Ctrl+] |
| הקטן גופן | Ctrl+[ |
| שמור | Ctrl+S |
| חדש | Ctrl+N |
| חיפוש | Ctrl+F |
| הדפסה | Ctrl+P |
| תקן שפה | F9 |
| הערה | Ctrl+Alt+M (?) |

**משימה:** אמת כל קיצור בקוד JavaScript (`initKeyboard` / `initShortcuts`).

---

## עדכון systematic

### 1️⃣ סרגל הבית

**קבוצת גופן:**
- `#fontNameSelect` → "בחר גופן"
- `#fontSizeBtn` → "גודל גופן (Ctrl+], Ctrl+[)"

**קבוצת עיצוב:**
- `#btnBold` → "מודגש (Ctrl+B)"
- `#btnItalic` → "נטוי (Ctrl+I)"
- `#btnUnderline` → "קו תחתון (Ctrl+U)"
- `#btnStrike` → "קו חציה (Ctrl+Shift+X)"
- `#btnHighlight` → "הדגשה (Ctrl+Alt+H)"  
- `#colorBtn` → "צבע טקסט"
- `#bgColorBtn` → "צבע רקע"

**קבוצת יישור:**
- יישור שמאל → "Ctrl+L"
- יישור מרכז → "Ctrl+E"
- יישור ימין → "Ctrl+R"
- דו-צדדי → "Ctrl+J"

**קבוצת רשימות:**
- תבליטים → "Ctrl+Shift+L"
- ממוספרת → "Ctrl+Shift+O"

**קבוצת היסטוריה:**
- בטל → "Ctrl+Z"
- חזור → "Ctrl+Y"

### 2️⃣ סרגל הוספה

- `#insLink` → "קישור (Ctrl+K)"
- `#insDate` → "תאריך"
- `#insTime` → "שעה"
- `#insHR` → "קו אופקי"
- `#insTable` → "טבלה"
- `#insImage` → "תמונה"
- `#insShape` → "צורה"

### 3️⃣ קיצורים "גלובליים" (עובדים בכל מקום)

- Escape → סגור תפריט / סרגל צף / דיאלוג
- Tab → ניווט מקלדת
- Shift+Tab → ניווט אחורה
- F9 → תקן שפה

---

## צעד-אחר-צעד

1. **משתמש עומד על כפתור "מודגש"** בעכבר
2. **1 שנייה אחרי הגעה** — Tooltip ופקק: `"מודגש (Ctrl+B)"`
3. **משתמש חדש לומד:** "אה, אז יש קיצור!"
4. **משתמש בא מ-Word:** "סוף סוף, אותו דבר בדיוק"

---

## השפעה צפויה

- 40% משתמשים חדשים **יגלו קיצורים** מ-Tooltip זה בלבד
- **סדר עבודה מהר יותר:** Ctrl+B במקום לחיצה
- **Discoverability:** "הו, יש Ctrl+L ליישור שמאל? זה עובד!"

---

## implementation

**Batch update:**

עבור כל כפתור ב:
- `buildText()` (בית)
- `initInsertRibbon()` (הוספה)
- `initLayoutRibbon()` (פריסה)

```js
// Before:
const btn = button("B", "מודגש", () => exec('bold'));

// After:
const btn = button("B", "מודגש", () => exec('bold'));
btn.title = "מודגש (Ctrl+B)";
```

או ב-HTML ישירות:
```html
<button title="מודגש (Ctrl+B)">𝐁</button>
```

---

## אתרי קוד

- `MyWord-v2.html` ~11000 (buildText)
- ~13000 (insert ribbon)
- ~4200 (layout ribbon)
- `docs/SPEC-HOME.md` + `docs/SPEC-INSERT.md` — עדכון tooltip נודות בקוד
