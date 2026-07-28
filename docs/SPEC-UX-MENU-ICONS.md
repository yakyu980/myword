# SPEC-UX-MENU-ICONS — אייקונים ברור בתפריט קליק-ימני

**קטגוריה:** Discoverability · UX ויזואלית  
**חומרה:** 🟡 בינוני (טקסט בלבד מבלבל יותר מאיקון+טקסט)  
**מיקום ב-UI:** `#rcMenu` (תפריט קליק-ימני)

---

## מה קיים עכשיו

```html
<div id="rcMenu" role="menu">
  <button role="menuitem">גזור</button>
  <button role="menuitem">העתק</button>
  <button role="menuitem">הדבק</button>
  <button role="menuitem">עיצוב</button>
  <button role="menuitem">קישור</button>
  <button role="menuitem">שורה</button>
  <!-- ... -->
</div>
```

**בעיה:**
1. **רק טקסט** — משתמש צריך **לקרוא** כל פריט כדי להבין
2. **"שורה"?** — לא ברור אם זה "הוסף שורה" או "מחק שורה" (קשר-dependent)
3. **"עיצוב"** — אנו מתכוונים ל"הדבקה מלאת עיצוב", לא "פתח דיאלוג עיצוב"
4. **בתפריט Word** — כל פריט יש **אייקון בר-זיהוי מיידי**

---

## המשתמש חושב

1. "קליק-ימני בטקסט… הו, יש כלים, אבל אני לא רואה אייקונים כמו ב-Word"
2. "שורה? אני בטבלה, זה הוסף או מחק? יוצא שזה הוסף, נחמד להיות זהיר"
3. "גזור/העתק/הדבק — בטוח הם סטנדרטיים, אבל אייקון יעזור"

---

## הצעה

**הוסף אייקونים לכל פריט ב-rcMenu:**

```html
<div id="rcMenu" role="menu">
  <button role="menuitem" title="גזור (Ctrl+X)">
    <span class="mi-icon">✂️</span>
    <span class="mi-label">גזור</span>
  </button>
  
  <button role="menuitem" title="העתק (Ctrl+C)">
    <span class="mi-icon">📋</span>
    <span class="mi-label">העתק</span>
  </button>
  
  <button role="menuitem" title="הדבק (Ctrl+V)">
    <span class="mi-icon">📌</span>
    <span class="mi-label">הדבק</span>
  </button>
  
  <hr class="mi-divider"/>
  
  <button role="menuitem">
    <span class="mi-icon">🎨</span>
    <span class="mi-label">הדבקה מלאת עיצוב</span>
  </button>
  
  <button role="menuitem" title="קישור (Ctrl+K)">
    <span class="mi-icon">🔗</span>
    <span class="mi-label">עריכת קישור</span>
  </button>
  
  <!-- טבלה-ספציפי -->
  <button role="menuitem" data-ctx="table">
    <span class="mi-icon">⬆️</span>
    <span class="mi-label">הוסף שורה מעל</span>
  </button>
  
  <button role="menuitem" data-ctx="table">
    <span class="mi-icon">⬇️</span>
    <span class="mi-label">הוסף שורה מתחת</span>
  </button>
  
  <button role="menuitem" data-ctx="table">
    <span class="mi-icon">➕</span>
    <span class="mi-label">הוסף עמודה</span>
  </button>
  
  <button role="menuitem" data-ctx="table">
    <span class="mi-icon">❌</span>
    <span class="mi-label">מחק שורה/עמודה</span>
  </button>
</div>
```

**CSS:**

```css
#rcMenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  z-index: 9995;
}

#rcMenu button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  text-align: start;
  font-size: 13px;
  white-space: nowrap;
}

#rcMenu button:hover {
  background: var(--primary-soft);
  color: var(--primary);
}

#rcMenu button:active {
  background: var(--primary-soft2);
}

#rcMenu .mi-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

#rcMenu .mi-label {
  flex: 1;
  user-select: none;
}

#rcMenu .mi-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}

/* ערכות כהות */
body[data-theme="night"] #rcMenu,
body[data-theme="dark"] #rcMenu,
body[data-theme="neon"] #rcMenu {
  background: rgba(13,22,48,.94);
  border-color: rgba(150,200,255,.18);
}

body[data-theme="night"] #rcMenu button:hover,
body[data-theme="dark"] #rcMenu button:hover,
body[data-theme="neon"] #rcMenu button:hover {
  background: rgba(79,107,237,.15);
  color: #E8F1FB;
}
```

---

## סדר פריטים בתפריט

**סטנדרט:**
```
✂️ גזור         (Ctrl+X)
📋 העתק        (Ctrl+C)
📌 הדבק        (Ctrl+V)
────────────────
🎨 הדבקה מלאת עיצוב
🔗 עריכת קישור (Ctrl+K)

┌─ [אם בטבלה]
│  ⬆️ הוסף שורה מעל
│  ⬇️ הוסף שורה מתחת
│  ➕ הוסף עמודה
│  ❌ מחק שורה/עמודה
└─

┌─ [אם בקישור]
│  🔗 פתח קישור
│  📋 העתק כתובת
│  ✏️ ערוך קישור
│  ❌ הסר קישור
└─
```

---

## צעד-אחר-צעד

1. משתמש קליק-ימני על טקסט
2. **תפריט מופיע עם אייקונים + תווים**
3. משתמש רואה `✂️ גזור` — **מיד מבין** מה זה
4. משתמש קליק-ימני בטבלה
5. **תפריט מוסיף `⬆️ הוסף שורה מעל`** — ברור מיד
6. משתמש קליק-ימני על קישור
7. **תפריט משתנה ל-`🔗 פתח קישור`** — הקשר-ברור

---

## השוואה ל-Word

Word (קליק-ימני בטקסט):
```
✂️ גזור
📋 העתק
📌 הדבק
────────────
🔤 בחר הכל
🎨 הדבקה מיוחדת
────────────
📝 כתות
💬 יכולות הערות
```

**MyWord צריך:**
```
✂️ גזור
📋 העתק
📌 הדבק
────────────
🎨 הדבקה מלאת עיצוב
🔗 עריכת קישור
```

---

## תלוי-בהקשר (דינמי)

**טבלה:** הסתר `📌 הדבק`, הוסף `⬆️⬇️➕❌` שורות/עמודות.  
**קישור:** תצניע `🎨 הדבקה`, הוסף `🔗 קישור` אפשרויות.  
**בחירה מרובה:** הצג רק `✂️ ✂️ 📌`.

---

## implementation

**HTML:**
כל פריט בתפריט קבל `<span class="mi-icon">`.

**CSS:**
אריחים דקיקים (18px icon + 10px gap + לייבל) ומרווח אחיד.

**JS:**
בתפריט דינמי (`initRightClick` / `showContextMenu`):
- טקסט → דיכוי טבלה + קישור
- טבלה → הצגת שורות/עמודות
- קישור → הצגת אפשרויות קישור

---

## אתרי קוד

- `MyWord-v2.html` ~line 13500 (`initRightClick` / `#rcMenu`)
- `docs/SPEC-RCMENU.md` — עדכון
