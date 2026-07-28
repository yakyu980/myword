# MyWord

עורך מסמכים בעברית, כיוון RTL מלא, בסגנון Word — קובץ HTML יחיד ללא תלויות
חיצוניות, וגם תוכנת שולחן-עבודה (Windows · macOS · Linux).

## מה יש כאן

| | |
|---|---|
| [`MyWord-v2.html`](MyWord-v2.html) | האפליקציה עצמה — פותחים בדפדפן כקובץ מקומי, בלי שרת |
| [`desktop/`](desktop/README.md) | אריזת Electron לתוכנת שולחן-עבודה אמיתית — ראו [DISTRIBUTION.md](desktop/DISTRIBUTION.md) להורדה/הפצה |
| [`qa/`](qa/README.md) | חבילת בדיקות אוטומטיות (Playwright) — 1000+ תרחישים |
| [`docs/`](docs) | מפרטים טכניים לכל אזור בממשק |

## הרצה מהירה

**בדפדפן:** פתחו את `MyWord-v2.html` — זהו, אין צורך בשום דבר נוסף.

**כתוכנה:**
```bash
cd desktop
npm install
npm start
```

הורדה מוכנה: ראו [Releases](../../releases) או [desktop/DISTRIBUTION.md](desktop/DISTRIBUTION.md).

## הבהרה

MyWord הוא פרויקט עצמאי ואינו קשור, מסונף, מאושר או נתמך על ידי Microsoft.
"Word" הוא מונח כללי לתיאור עיבוד תמלילים; MyWord אינו טוען תאימות רשמית או
זיקה למוצרי Microsoft. פורמט הייצוא `.docx` נשען על תקן Office Open XML הפתוח
(ISO/IEC 29500), הזמין לשימוש חופשי לכל מפתח.

## רישיון

זכויות שמורות למחבר הפרויקט.
