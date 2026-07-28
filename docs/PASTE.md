# PASTE.md — הדבקה ⭐⭐⭐

> קרא כשהמשימה נוגעת ל-clipboard, Ctrl+V, העתק/הדבק/גזור.
> ⚠️ כפוף תמיד ל-[`PAGE_RULES.md`](PAGE_RULES.md) — קרא אותו קודם.

---

## חוק 1 — שני סוגי הדבקה

יש ב-MyWord **שני מנגנוני הדבקה נפרדים**:

| סוג | מה מודבק | איך עובד |
|-----|----------|----------|
| **טקסט רגיל** | טקסט מהדפדפן/מחוץ | הדפדפן מטפל ב-contenteditable |
| **אובייקט חופשי** | תמונה/תיבה/צורה שהועתקה מתוך MyWord | `_serializeObj` / `_deserializeFreeObjs` |

---

## חוק 2 — הדבקת טקסט + מחטא הדבקה (initPasteSanitizer)

✅ **קיים מאזין `paste` מותאם על `editor`** (פונקציה `initPasteSanitizer`, נקראת ב-`init()`).

```js
// initPasteSanitizer — מאזין paste על editor:
editor.addEventListener('paste', e => {
  const dt = e.clipboardData;
  // 1) תמונה מהלוח → free-obj (ראה חוק 6)
  // 2) HTML מעוצב → sanitize(html) + execCommand('insertHTML')
  // 3) טקסט רגיל → התנהגות דפדפן רגילה (ללא preventDefault)
});

// sanitize: מנקה HTML מ-Word/אינטרנט
function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script,style').forEach(el => el.remove());
  tpl.content.querySelectorAll('*').forEach(el => {
    if (!ALLOWED.has(el.tagName)) { el.replaceWith(...el.childNodes); return; }
    [...el.attributes].forEach(a => {
      const n = a.name.toLowerCase();
      if (el.tagName === 'A' && n === 'href') {
        if (/^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
      } else { el.removeAttribute(a.name); }
    });
  });
  return tpl.innerHTML;
}
```

**מה נשמר:** תגיות בסיס בלבד — `b/strong/i/em/u/s/br/p/div/span/h1–h3/ul/ol/li/a/blockquote/pre/code/table/tr/td/th`.
**מה מוסר:** כל `style`/`class`/attribute אחר, `<script>`/`<style>` (כולל תוכן), ו-`href="javascript:"`.
**הדבקה מתפריט ימני (fallback):** `navigator.clipboard.readText()` → `execCommand('insertText')`.

---

## חוק 3 — הדבקת אובייקט חופשי (Ctrl+C / Ctrl+V על free-obj)

```js
// העתקה:
clip = _serializeObj(selectedObj);  // שומר JSON של האובייקט
// הדבקה:
const d = Object.assign({}, clip);
d.left = (parseFloat(clip.left) + 24) + 'px';  // ← הזזת 24px ימינה
d.top  = (parseFloat(clip.top)  + 24) + 'px';  // ← הזזת 24px למטה
_deserializeFreeObjs([d]);
_clamp(newObj); // ← חובה אחרי הדבקה
```

**כללים:**
- הדבקה חוזרת מדרגת כל פעם +24px
- קשרי מחבר (`connId`) **לא** עוברים לעותק
- אם יש טקסט מסומן → Ctrl+V מדביק טקסט (לא אובייקט)

---

## חוק 4 — גזור (Ctrl+X)

```js
// גזור אובייקט נבחר:
clip = _serializeObj(obj);
obj.remove();
_selectObj(null);
scheduleSave();
requestAnimationFrame(updatePagination);
```

- גזור **מוחק מיד** מה-DOM
- אם גוזרים טקסט (לא אובייקט) → `clip = null` כדי ש-Ctrl+V ידביק טקסט

---

## חוק 5 — מחיקת אובייקט במקלדת

```js
// Delete / Backspace על אובייקט נבחר (לא טקסט):
document.addEventListener('keydown', e => {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  const o = selectedObj();
  if (!o || editingText(o)) return;  // ← אם עורכים טקסט — לא נוגעים
  e.preventDefault();
  o.remove();
  _selectObj(null);
  scheduleSave();
  requestAnimationFrame(updatePagination);
});
```

---

## חוק 6 — הדבקת תמונה מ-Clipboard (מחוץ ל-MyWord)

✅ **ממומש** (בתוך `initPasteSanitizer`):
- הדבקת תמונה שצולמה (Ctrl+V מ-screenshot) נכנסת כ-`.free-obj`
- כל פריט `image/*` בלוח → מומר ל-base64 ומוכנס דרך `_buildImageObjFromSrc()`

```js
const items = dt.items || [];
for (const it of items) {
  if (it.type && it.type.indexOf('image/') === 0) {
    const file = it.getAsFile();
    if (!file) continue;
    e.preventDefault();
    const r = new FileReader();
    r.onload = ev => {
      _buildImageObjFromSrc(ev.target.result);   // → free-obj תקין
      scheduleSave();
      requestAnimationFrame(updatePagination);
    };
    r.readAsDataURL(file);
    return;
  }
}
// אחרת — נופל ל-HTML sanitize / טקסט רגיל
```

> הערה: התמונה מתווספת במיקום ברירת המחדל של `_buildImageObjFromSrc` (`left:60px, top:60px`) — ולא ליד הסמן (ראה `IMAGES.md` חוק 11 / `BUGS.md`).

---

## ❌ מה לא קיים (not in scope)

- הדבקה כ-"טקסט רגיל בלבד" יזומה (Paste as Plain Text / Ctrl+Shift+V) — כרגע ה-HTML עובר ניקוי אך לא מופשט לחלוטין
- שמירת היסטוריית clipboard

---

## ✅ צ'קליסט לפני שינוי בהדבקה

```
[ ] שינוי ב-Ctrl+V — בדקת שלא שובר הדבקת אובייקטים (initObjClipboard)?
[ ] שינוי ב-Ctrl+V — בדקת שלא שובר הדבקת טקסט?
[ ] שינוי במחטא — תגית חדשה ב-ALLOWED נוספה במכוון? script/style עדיין מוסרים?
[ ] הדבקת HTML/תמונה — scheduleSave() + requestAnimationFrame(updatePagination)?
[ ] אחרי הדבקת אובייקט — _clamp() נקרא?
[ ] editingText() נבדק לפני פעולת Delete/Backspace?
```
