# מרקוס וורד · QA ל-MyWord v2

סוכן QA אוטומטי שפותח את `MyWord-v2.html` בדפדפן אמיתי (Playwright), מריץ תרחישי עומס,
מצלם מסך, מאתר הפרות של **חוקי הדף**, משווה לפתרון של Microsoft Word, ומתעד הכל ב-Supabase.

## התקנה (פעם אחת)

```bash
cd qa
npm install
npx playwright install chromium
```

## הרצה

```bash
node marcus.mjs                 # ריצה מלאה (headless) + Supabase אם מוגדר
node marcus.mjs --headed        # דפדפן גלוי
node marcus.mjs --no-supabase   # מקומי בלבד
node marcus.mjs --only big-table,many-images
node marcus.mjs --suite buttons # בדיקת כל 144 הכפתורים (קיום/נראות/אייקון/אפקט)
node marcus.mjs --fuzz          # שילובים אקראיים (40 סבבים; seed נרשם בדוח)
node marcus.mjs --fuzz=20 --seed=42  # שחזיר: אותו seed = אותן תוצאות
```

פלט: דוח בקונסול · `reports/<runId>.json` · צילומי מסך ב-`screenshots/<runId>/`.

---

## 🔘 מפרט הכפתורים (`docs/BUTTONS-SPEC.md`)

מקור-אמת לכל 144 הכפתורים: מה כל כפתור עושה, פלט צפוי (א/ב/ג), גבולות, "איך Word", edge.

```bash
node sync-buttons.mjs          # מסנכרן את המפרט — מזריק סטאב לכל כפתור חדש
node sync-buttons.mjs --check  # יוצא ≠0 אם יש כפתור לא-מתועד (אכיפה/CI)
```

- ידע הפלט: `lib/button-knowledge.mjs` · פענוח/חילוץ: `lib/spec.mjs`.
- **אוטומציה:** hook ב-`.claude/settings.json` (`hooks/on-save.mjs`) מריץ סנכרון בכל
  שמירת `MyWord-v2.html` — כך כל כפתור חדש מתועד מיד.
- `--suite buttons` קורא את המפרט ובודק כל כפתור; כפתורים קונטקסטואליים (דיאלוג/דרופ-דאון)
  מדולגים. התרחיש `shape-picker-icons` פותח את בורר הצורות ומוודא שלכל צורה יש SVG לא-ריק.

---

## חיבור Supabase (אופציונלי — למאגר באגים והיסטוריה)

מרקוס "זוכר" באגים בין ריצות דרך Supabase ומשתפר. **בלי Supabase הוא עדיין רץ מלא** — רק
בלי שמירה בענן.

### יצירת פרויקט חינמי
1. היכנס ל-https://supabase.com → **Sign in** (אפשר עם GitHub/Google).
2. **New project** → תן שם (למשל `myword-qa`), בחר סיסמת DB, בחר Region קרוב (Frankfurt).
   המתן ~2 דקות שהפרויקט יוקם.
3. **SQL Editor** → **New query** → הדבק את כל התוכן של [`supabase/schema.sql`](supabase/schema.sql)
   → **Run**. זה יוצר את הטבלאות `qa_runs`, `qa_bugs`, `qa_screenshots`.
4. (לצילומי מסך בענן) **Storage** → **New bucket** → שם: `qa-screenshots` → סמן **Public** → Save.
5. **Project Settings → API**: העתק את **Project URL** ואת מפתח **`service_role`**.

### חיבור מקומי
```bash
cd qa
cp .env.example .env     # ב-PowerShell: Copy-Item .env.example .env
```
ערוך את `.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...   # service_role key
```
> ⚠️ `service_role` עוקף RLS — שמור אותו מקומי בלבד. `.env` כבר ב-`.gitignore`.

הרץ שוב `node marcus.mjs` — תראה `☁️  מחובר ל-Supabase` והנתונים יישמרו.

---

## מבנה

| קובץ | תפקיד |
|---|---|
| `marcus.mjs` | מנהל הריצה — דפדפן, תרחישים, דוח, Supabase |
| `lib/probe.mjs` | "השוליים הדמיוניים" — מאתר תוכן בפער / חציית גבול עמוד |
| `lib/scenarios.mjs` | תרחישי העומס (טקסט/תמונות/טבלאות) |
| `lib/knowledge.mjs` | "איך Word פתר את זה" — בסיס הידע להשתפרות |
| `lib/supabase.mjs` | לוגינג ענן (no-op בלי מפתחות) |
| `supabase/schema.sql` | סכמת הטבלאות |

## איך מרקוס משתפר
מצאת סוג הפרה חדש? הוסף תרחיש ל-`lib/scenarios.mjs` ובִּינה ל-`lib/knowledge.mjs`.
הבאגים נשמרים ב-`qa_bugs` עם `fingerprint` יציב — ריצה חוזרת מעדכנת `last_seen` במקום לכפל.
