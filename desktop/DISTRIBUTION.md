# הפצה — איך אנשים מקבלים את MyWord

## מה יש לך עכשיו

| קובץ | ל‏מי | הערה |
|---|---|---|
| `MyWord-Setup-2.0.0.exe` | Windows | מתקין רגיל — קיצור דרך, "הוסף/הסר תוכניות", שיוך `.mwd` |
| `MyWord-Portable-2.0.0.exe` | Windows | קובץ בודד, בלי התקנה — טוב לדיסק-און-קי ולמחשבים נעולים |

שניהם ב-`desktop/dist/`, ‏78MB כל אחד.

---

## הדרך הכי פשוטה לשתף עכשיו

העלה את `MyWord-Setup-2.0.0.exe` ל-Google Drive / Dropbox / OneDrive ושתף קישור.
זה עובד מיד, בלי שום תשתית.

**מה שהמקבל יראה:** Windows SmartScreen יציג *"Windows protected your PC —
מפרסם לא ידוע"*. זה **לא אומר שמשהו לא בסדר** — זה קורה לכל תוכנה בלי חתימה
דיגיטלית. המשתמש לוחץ **"מידע נוסף" → "הפעל בכל זאת"**.

> תגיד את זה מראש למי שאתה שולח לו — אחרת רובם פשוט לא יתקינו.

---

## הדרך המקצועית — GitHub Releases

עמוד הורדה אמיתי, קישור קבוע, היסטוריית גרסאות, וסטטיסטיקות הורדה. חינם.

```bash
cd "C:\Users\yakyu\OneDrive\文档\WONDER LETER"
git init
git add .
git commit -m "MyWord 2.0.0"
gh repo create myword --public --source=. --push
git tag v2.0.0
git push origin v2.0.0
```

ה-workflow ב-`.github/workflows/release.yml` יתפוס את התג, יבנה **את שלוש
המערכות במקביל** ויפרסם עמוד Release עם כל הקבצים. הקישור לשיתוף:

```
https://github.com/<המשתמש-שלך>/myword/releases/latest
```

לגרסה הבאה: שנה `version` ב-`package.json`, ואז `git tag v2.0.1 && git push origin v2.0.1`.

---

## כל מערכות ההפעלה

הקונפיג ב-`package.json` כבר מכסה את שלושתן:

**נבדק בפועל על המחשב הזה** — לא הערכה:

| מערכת | פורמט | בנייה מ-Windows | פקודה |
|---|---|---|---|
| **Windows** | `.exe` מתקין | ✅ עובד | `npm run dist` |
| **Windows** | `.exe` נייד | ✅ עובד | `npm run dist` |
| **Linux** | `.tar.gz` | ✅ **עובד** (98MB) | `npm run dist:linux` |
| **Linux** | `.AppImage` | ❌ דורש `mksquashfs` (Linux בלבד) | CI |
| **Linux** | `.deb` | ❌ דורש `fakeroot`/`dpkg` | CI |
| **macOS** | `.dmg` / `.zip` | ❌ אפל דורשת כלים שרצים רק על macOS | CI או Mac |

**מסקנה מעשית:** אפשר לספק **Windows ו-Linux מכאן, היום**. ה-`tar.gz` הוא
התקנה לגיטימית לחלוטין ב-Linux — פורקים ומריצים:

```bash
tar -xzf MyWord-2.0.0.tar.gz
cd MyWord-2.0.0 && ./myword
```

ל-macOS ולפורמטים המהודרים של Linux (‏AppImage/deb) — ה-workflow ב-GitHub
Actions מריץ כל מערכת על מכונה אמיתית משלה. זו לא עקיפה, זו הדרך היחידה:
אי אפשר לבנות `.dmg` על Windows.

### מה משתמשי Mac יראו

בלי חתימת Apple (‏99$ לשנה למפתחים) macOS יאמר *"MyWord cannot be opened
because the developer cannot be verified"*. הפתרון למשתמש: **קליק ימני על
האפליקציה → Open → Open**. פעם אחת בלבד.

לחתימה אמיתית: הוסף `CSC_LINK` ו-`CSC_KEY_PASSWORD` ל-Secrets של המאגר
והסר את ההערה בשורות המתאימות ב-workflow.

---

## תאימות המסמכים עצמם

| ייצוא | Word ל-Windows | Word ל-Mac | Google Docs | Pages | LibreOffice |
|---|---|---|---|---|---|
| **`.docx`** ← מומלץ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `.doc` (ישן) | ✓ | ✗ | חלקי | ✗ | חלקי |
| `.pdf` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `.html` | ✓ | ✓ | ✓ | ✓ | ✓ |

**תמיד להעדיף `.docx`** — הכפתור 📘 בלשונית "קובץ". הוא Office Open XML תקני
ומכיל: כותרות, מודגש/נטוי/קו-תחתון, צבעים, גדלי גופן, יישור, תבליטים ומספור,
טבלאות עם גבולות, תמונות מוטמעות, וכיוון RTL מלא (`w:bidi` + `w:rtl`).

כפתור `.doc` הישן נשאר לתאימות לאחור, אבל **Word ל-Mac חוסם אותו** — הוא HTML
בתחפושת, לא פורמט Word אמיתי.
