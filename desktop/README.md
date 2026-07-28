# MyWord — תוכנת שולחן עבודה

אריזת `MyWord-v2.html` לתוכנת Windows אמיתית עם Electron.

## מקור אמת אחד

`MyWord-v2.html` שבשורש הפרויקט הוא **המקור היחיד**. `sync-renderer.mjs` מעתיק
אותו ל-`renderer/index.html` לפני כל הרצה ואריזה — **אין לערוך את
`renderer/index.html` ידנית**, הוא נדרס בכל build.

## פקודות

```bash
npm install          # פעם אחת
npm start            # הרצה במצב פיתוח
npm run dist         # בניית מתקין + גרסה ניידת
node make-icon.mjs   # יצירת האייקון מחדש (build/icon.ico)
```

הפלט ב-`dist/`:

| קובץ | מה זה |
|---|---|
| `MyWord-Setup-2.0.0.exe` | **מתקין** — בוחר תיקייה, יוצר קיצור דרך, נרשם ב"הוסף/הסר תוכניות" |
| `MyWord-Portable-2.0.0.exe` | **נייד** — קובץ בודד, רץ בלי התקנה (גם מדיסק-און-קי) |
| `win-unpacked/` | התיקייה הלא-ארוזה, לבדיקות |

## ארכיטקטורה

```
main.js      תהליך ראשי — חלון, תפריטי מערכת, דיאלוגים, קריאה/כתיבה לדיסק
preload.js   הגשר היחיד לדף (contextBridge) — חושף רק window.mwDesktop
renderer/    MyWord עצמו (מסונכרן אוטומטית)
```

### אבטחה — אל תשנה בלי לקרוא

| הגדרה | ערך | למה |
|---|---|---|
| `contextIsolation` | `true` | הדף לא יכול לגעת ב-preload או ב-Node |
| `nodeIntegration` | `false` | אין `require` בדף |
| `sandbox` | `true` | תהליך הרינדור רץ בארגז חול של Chromium |
| `webSecurity` | `true` | **לעולם לא לכבות** |

הדף מציג תוכן שהמשתמש הדביק או ייבא, ולכן הוא נחשב **לא-אמין**. כל פעולת קובץ
עוברת דרך IPC מפורש, וכל נתיב נבדק מחדש ב-`main.js`:

- רק סיומות `.mwd .html .htm .doc .txt` (`isAllowedPath`)
- חסימת `\0` בנתיב
- תקרת 25MB לקריאה ולכתיבה
- ניווט חיצוני חסום; קישורים נפתחים בדפדפן המערכת
- חלונות-קופצים נדחים תמיד
- הרשאות מכשיר: מיקרופון בלבד (הכתבה קולית), כל השאר נדחה

תוכן שנקרא מקובץ עובר `_importSanitize` בצד הדף: פענוח ב-`DOMParser` (לא מריץ
סקריפטים), הסרת `script/iframe/object/embed/form/style/meta/base/link`, הסרת
מטפלי-אירוע inline, וחסימת `javascript:` — כולל צורות מוסוות בתווי-בקרה.

## בדיקות

```bash
cd ../qa
node _electron_test.mjs     # 26 בדיקות על גרסת הפיתוח (אבטחה, תפריטים, קובץ)
node _packaged_test.mjs     # בדיקת עשן על ה-EXE הארוז
```

## מה עדיין לא נעשה

- **חתימה דיגיטלית** — בלי תעודת Code Signing, Windows SmartScreen יציג
  "מפרסם לא ידוע" בהתקנה. זה לא באג; זה דורש תעודה בתשלום.
- **עדכון אוטומטי** — `electron-updater` לא הוגדר.
- **macOS / Linux** — הקונפיג מכוון ל-Windows בלבד.
