import { chromium } from 'playwright';
import * as path from 'path';
import { fileURLToPath } from 'url';

/* נתיב-הקובץ נגזר ממיקום הסקריפט ולא מ-cwd (תוקן 2026-07-19): `path.resolve('../MyWord-v2.html')`
   נפתר יחסית לספרייה שממנה הריצו, ולכן הרצה משורש-הפרויקט חיפשה `文档/MyWord-v2.html`
   (בלי `WONDER LETER`) ונכשלה — מה שתועד בטעות כ"נתיב שגוי בקוד". כעת עובד מכל ספרייה. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  // Load via file://
  const filePath = path.resolve(__dirname, '../MyWord-v2.html');
  const fileUrl = 'file:///' + filePath.split(path.sep).join('/');
  await page.goto(fileUrl);
  await page.waitForTimeout(2000);
  
  console.log('=== Syntax Check ===');
  console.log('Console Errors:', errors.length);
  errors.forEach(e => console.log('  -', e));
  
  // Check if all functions exist
  const funcs = await page.evaluate(() => {
    return {
      _setGoal: typeof window._setGoal === 'function',
      updateGoalProgress: typeof window.updateGoalProgress === 'function',
      _getGoals: typeof window._getGoals === 'function',
      /* הוסרו 2026-07-19: startPresentation/buildSlides נבדקו כאן עוד אחרי שמצב-המצגת
         הוסר לגמרי מהמוצר (2026-06-12b, CLAUDE.md §16) — בדיקה מתה שהחזירה false תמיד
         ולכן "נראתה כמו כשל" בכל הרצה. הוחלפו בבדיקות-שפיות לפונקציות-ליבה חיות. */
      updatePagination: typeof window.updatePagination === 'function',
      _historyRecord: typeof window._historyRecord === 'function',
      _selectObj: typeof window._selectObj === 'function'
    };
  });
  
  console.log('Functions defined:', funcs);
  
  await browser.close();
}

check().catch(console.error);
