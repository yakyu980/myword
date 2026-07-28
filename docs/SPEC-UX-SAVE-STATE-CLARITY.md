# SPEC-UX-SAVE-STATE-CLARITY — בהירות מצב השמירה

**קטגוריה:** UX · Feedback  
**חומרה:** 🟠 גבוה (לא ברור אם המסמך נשמר)  
**מיקום ב-UI:** שורת הסטטוס (`#statusBar` → `#saveState`)

---

## מה קיים עכשיו

```html
<span id="saveState">✓ נשמר</span>
```

**מצבי-שמירה:**
1. `"⋯ מקליד"` — משתמש מקלד, עדיין לא שמור
2. `"✓ נשמר"` — שמור בהצלחה
3. `"✗ אין מקום"` — כשל שמירה (IndexedDB פול)

**בעיה:**
1. **"⋯ מקליד" קטן וקשה לראות** — קיצור מתחנית קנס, ולא ברור מה זה הופכים
2. **"✓ נשמר" נשאר כל הזמן** — המשתמש לא יודע "מתי" היא נשמרה (שניה? דקה?)
3. **"✗ אין מקום" נשנן ללא הסבר** — לא יודע מה לעשות (מחק מסמכים? זום מסמכים?)
4. **צבע אדום לא בולט** — צריך התראה בהירה יותר או modal

---

## המשתמש חושב

1. **עברו 5 דקות אחרי עריכה אחרונה:** "האם המסמך שלי נשמר? בואו נביא רענון בעדינות…" (אבל הוא לא רוצה לאבד עבודה)
2. **"אין מקום" מופיע:** "מה זה? יש שגיאה בשמירה? תגיד לי איך לתקן!"
3. **בעורך: שמירה אוטומטית אחרי 800ms** → "רציתי רק שתנסה, האם היא עשתה זאת?"

---

## הצעה — 3 משפרים

### 1️⃣ Timeline מפורשת ל"✓ נשמר"

**הנוכחי:**
```
... (משתמש מקלד)
✓ נשמר
... (משתמש מקלד שוב)
✓ נשמר
```

**הצעה:**
```
⋯ מקליד…
✓ נשמר (עכשיו)
[חכה 3 שניות]
[בדוק שוב אם הקטע הנשמר היה חדש]
✓ נשמר לפני דקה
```

**CSS + JS:**
```js
function updateSaveState(status) {
  const el = document.getElementById('saveState');
  el.textContent = status;
  
  if (status.includes('נשמר')) {
    // הצג "עכשיו" למשך 3 שניות
    el.textContent = '✓ נשמר (עכשיו)';
    setTimeout(() => {
      const elapsed = Math.floor((Date.now() - lastSaveTime) / 1000);
      const label = 
        elapsed < 60 ? `לפני ${elapsed} שניות` :
        elapsed < 3600 ? `לפני ${Math.floor(elapsed/60)} דקות` :
        `לפני ${Math.floor(elapsed/3600)} שעות`;
      el.textContent = `✓ נשמר (${label})`;
    }, 3000);
  }
}
```

---

### 2️⃣ הצגה ברורה יותר של "⋯ מקליד"

**הנוכחי:**
```css
#saveState {
  font-size: 12px;
  color: var(--text-soft);  /* אפור בהיר, בדיוק כמו טקסט אחר */
}
```

**בעיה:** הוא "מתמזג" לתוך השורה, קשה לראות שהמצב השתנה.

**הצעה:**
```css
#saveState {
  font-size: 12px;
  font-weight: 600;  /* בולט */
  color: var(--primary);  /* אינדיגו בולט */
  background: rgba(79,107,237,0.08);  /* רקע עדין */
  padding: 3px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

#saveState.typing {
  background: rgba(79,107,237,0.12);  /* בולט עוד יותר */
  animation: pulse-save 1s infinite;
}

@keyframes pulse-save {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

**תוצאה:** כשמשתמש מקלד, הוא רואה **"⋯ מקליד"** מהבהבת בפינה הימנית של הסטטוס בר, ברור ובולט.

---

### 3️⃣ Modal/Notification ל"אין מקום"

**הנוכחי:**
```
✗ אין מקום
```

**בעיה:** משתמש קורא "אין מקום"… איפה? בדיסק? ב-memory? במקום אחר?

**הצעה: Dialog הסבר + פעולה**

```html
<dialog id="saveErrorDialog">
  <div class="error-icon">⚠️</div>
  <h2>לא היתה אפשרות לשמור את המסמך</h2>
  <p>
    ה-IndexedDB חסום או מלא. נסה:
    <ul>
      <li>🔄 רענן את הדף (Ctrl+Shift+R)</li>
      <li>🗑️ מחק מסמכים ישנים מ<strong>מנהל מסמכים</strong></li>
      <li>🔄 סגור טאבים אחרים של MyWord</li>
    </ul>
  </p>
  <button onclick="this.parentElement.close()">הבנתי</button>
  <button onclick="openDocManager()">פתח מנהל מסמכים</button>
</dialog>
```

**JS:**
```js
if (saveFailed) {
  document.getElementById('saveErrorDialog').showModal();
}
```

**CSS:**
```css
#saveErrorDialog {
  background: var(--panel);
  border: 2px solid var(--danger);
  border-radius: 12px;
  padding: 20px;
  max-width: 400px;
  z-index: 10000;
}

#saveErrorDialog .error-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

#saveErrorDialog h2 {
  color: var(--danger);
  margin-bottom: 10px;
}

#saveErrorDialog ul {
  margin-left: 20px;
}

#saveErrorDialog li {
  margin: 6px 0;
}

#saveErrorDialog button {
  margin-top: 10px;
  margin-right: 10px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

#saveErrorDialog button:first-of-type {
  background: var(--border);
}

#saveErrorDialog button:last-of-type {
  background: var(--danger);
  color: #fff;
}
```

---

## צעד-אחר-צעד

### תרחיש 1: הקלדה רגילה
1. משתמש מתחיל לכתוב
2. **"⋯ מקליד" מופיע בפינה ימנית, מהבהבת אינדיגו**
3. משתמש מפסיק לכתוב
4. **"✓ נשמר (עכשיו)" מופיע לשלוש שניות**
5. **"✓ נשמר (לפני 5 שניות)" מופיע בהמשך**

### תרחיש 2: כשל שמירה
1. שמירה נכשלת (IndexedDB פול)
2. **Modal מופיע:** "⚠️ לא היתה אפשרות לשמור"
3. משתמש לוחץ "פתח מנהל מסמכים"
4. משתמש מוחק מסמכים ישנים
5. **שמירה מתחדשת אוטומטית**

---

## השוואה ל-Word

Word Online:
- **"Saving…"** מופיע בעדינות בעת שמירה
- **"Saved"** מופיע בהצלחה
- **"Couldn't save"** עם סוג אדום והודעה

Google Docs:
- **"Saving…"** עם אייקון סיבוב
- **"Last edit was seconds ago"** מודיע על הערכת-זמן מדויקת
- **"Offline"** כשאין רשת

---

## implementation

**קוד:**

```js
const lastSaveTime = {};

function setSaveState(status) {
  const el = document.getElementById('saveState');
  
  if (status === 'typing') {
    el.textContent = '⋯ מקליד…';
    el.classList.add('typing');
    el.style.opacity = '1';
  } else if (status === 'saved') {
    el.textContent = '✓ נשמר (עכשיו)';
    el.classList.remove('typing');
    lastSaveTime[currentDocId] = Date.now();
    
    setTimeout(() => updateSaveTimestamp(), 3000);
  } else if (status === 'error') {
    el.textContent = '✗ אין מקום';
    el.classList.add('error');
    document.getElementById('saveErrorDialog').showModal();
  }
}

function updateSaveTimestamp() {
  const el = document.getElementById('saveState');
  if (!el.classList.contains('typing')) {
    const elapsed = Date.now() - (lastSaveTime[currentDocId] || 0);
    const label = formatTimeAgo(elapsed);
    el.textContent = `✓ נשמר (${label})`;
  }
}

// הקו זה עובד כל חמש שניות
setInterval(updateSaveTimestamp, 5000);
```

---

## אתרי קוד

- `MyWord-v2.html` ~line 2000 (CSS `#saveState`)
- ~line 300 (HTML `#statusBar`)
- ~line 8500 (JS `scheduleSave` / `saveDoc`)
