# SPEC-UX-RIBBON-TAB-ORDER — סדר לשוניות ריבון

**קטגוריה:** Discoverability · נוחות ניווט  
**חומרה:** 🟠 גבוה (בלבול יומיומי)  
**מיקום ב-UI:** סרגל לשוניות עליון (`.tabs`)

---

## מה קיים עכשיו

```html
<nav class="tabs">
  <button data-tab="file">📁 קובץ</button>
  <button data-tab="home">בית</button>
  <button data-tab="insert">הוספה</button>
  <button data-tab="layout">פריסה</button>
  <button data-tab="tools">כלים</button>
  <button data-tab="view">תצוגה</button>
</nav>
```

הסדר **מימין לשמאל** (RTL): קובץ → בית → הוספה → פריסה → כלים → תצוגה.

---

## מה המשתמש חושב?

1. **בית צריך להיות ממוקום לקצה (טבעי):** בעברית, הכרטיס הראשון שקוראים הוא מימין. "בית" הוא הסרגל שמשתמש משתמש בו **כל הזמן** (עיצוב טקסט). צריך להיות הקרוב ביותר אליו כשחוזר לעורך.

2. **מבלבל: "קובץ" בעמוד-1:** כש-Shift+Tab מהעורך, המשתמש לא מצפה לקובץ; הוא מצפה ל"כדי לעצב טקסט, לחץ על בית". בעברית זה טבעי יותר: **קובץ ← כלים ← תצוגה | בית ← הוספה ← פריסה** (סימטריה).

3. **Word עושה זאת בדיוק:** File (עמוד שמאל) vs. Home (ציר עבודה).

---

## הצעה

**סדר הלשוניות צריך להיות:**
```
קובץ ← כלים ← תצוגה | בית ← הוספה ← פריסה
        (utilities)           (primary)
```

**כלומר:**
1. **בית** — 1 (אחרי "קובץ" בקוד RTL = מקום-1 בתצוגה ב-RTL, אבל הוא צריך להיות הטאב-הראשי שנראה תמיד)
2. **הוספה**
3. **פריסה**
4. **כלים** (utilities)
5. **תצוגה** (utilities, נדירה)
6. **קובץ** (file, utility עדיין נדיר)

**או בקוד (מימין לשמאל):**
```html
<nav class="tabs">
  <button data-tab="file">📁 קובץ</button>
  <button data-tab="view">👁️ תצוגה</button>
  <button data-tab="tools">🔧 כלים</button>
  <!-- separator / spacer -->
  <button data-tab="layout">📐 פריסה</button>
  <button data-tab="insert">➕ הוספה</button>
  <button data-tab="home" class="primary">🏠 בית</button>
</nav>
```

---

## צעד-אחר-צעד

1. בעורך קטן → Tab עד הסרגל → מנחית ישירה ל"**בית**" (הטאב הקרוב ביותר, לא קובץ)
2. Shift+Tab → חוזר ל"תצוגה" (הסוף של utilities)
3. רגיל: בית → הוספה → פריסה (workflow טבעי)

---

## תוצאה צפויה

- משתמש חוזר לסרגל → מוצא בית **מיד** ללא דילוג על קובץ
- סדר ניווט מקלדת תואם זרימת-עבודה
- **קובץ נשאר נגיש** (שמאל-קצה, TAB אחד בלבד)

---

## השוואה ל-Word

Word: File (A) | Home (primary) | Insert | Design | Layout | References | Mailings | Review | View (B)

בעברית עד כה: File (A) | Home | Insert | Layout | Tools | View (B)

**וזה בדיוק סדר ה-Word לפי חשיבות** (אולם עם "קובץ" משני).

---

## טעימת בעיה ב-Spec-HOME.md קיימת

סעיף "שימוש בעמוד-2 של סרגל ה"עוד"" מציע **הוצאה לעמוד-2** של כפתורים נדירים, לא במקום הלשוניות עצמן.

---

## implementation

1. סדר `data-tab` בקוד HTML
2. בדיקה בבית (Home) שהעמוד פעיל כברירת-מחדל (בקלדה חוזרת, לא ב-Page Load)
3. CSS: `.tab.primary { ... }` סגנון אופציונלי להדגשה

---

## איתור קוד

`MyWord-v2.html` שורה ~3745 (`<nav class="tabs">`)
