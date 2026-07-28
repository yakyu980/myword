// lib/knowledge.mjs — "איך Word פתר את זה".
// בסיס הידע שמאפשר למרקוס להשתפר: לכל סוג הפרה — הסבר + הפתרון של Word.
// כשמתגלה באג, מרקוס מצרף את ההשוואה ל-Word כדי שתדע *איך* לתקן, לא רק *מה* שבור.

export const WORD_WISDOM = {
  'in-gap': {
    severity: 'high',
    title: 'תוכן יושב בתוך הפער בין עמודים (שטח מת)',
    word:
      'Word לא מאפשר תוכן ב"שטח שבין עמודים". מנוע ה-layout שלו מחשב block flow ' +
      'ודוחף כל בלוק שלא נכנס במלואו בעמוד הנוכחי לראש העמוד הבא *לפני* הרינדור. ' +
      'תיקון מומלץ: ודא ש-paginateBlocks() רץ אחרי כל שינוי תוכן, ושהוא מזהה את הבלוק ' +
      'הזה (אולי הוא אלמנט מקונן/חדש שלא נספר כ"ילד ישיר" של #editor).',
  },
  'straddle-breakable': {
    severity: 'medium',
    title: 'פסקה נחתכת באמצע בין שני עמודים',
    word:
      'Word שובר פסקאות בין עמודים רק על גבול שורה שלמה, ושומר orphans/widows ≥ 2. ' +
      'כאן הפסקה נחתכה בלי דחיפה — paginateBlocks לא טיפל בה. ' +
      'תיקון: דחוף את הבלוק לעמוד הבא, או חלק אותו ברמת השורה ולא הפיקסל.',
  },
  'straddle-unbreakable': {
    severity: 'high',
    title: 'תמונה/טבלה נחתכת בין עמודים',
    word:
      'Word מסמן תמונות וטבלאות כ-keep-together (break-inside:avoid) ומעביר את כל ' +
      'היחידה לעמוד הבא. אם זה נחתך — חוק §4 הופר. תיקון: ודא break-inside:avoid חל, ' +
      'וש-paginateBlocks מתייחס לטבלה/תמונה כיחידה אחת שאי-אפשר לפצל.',
  },
  'free-in-gap': {
    severity: 'high',
    title: 'אובייקט חופשי הוצב/נשאר בפער או חוצה גבול עמוד',
    word:
      'ב-Word עוגן (anchor) של אובייקט צף שייך תמיד לעמוד אחד; הוא לא יכול להיות חצי-חצי. ' +
      '_clamp() אמור לכלוא אותו בגבולות עמוד יחיד (FREE_MARGIN_CM=0.2). ' +
      'תיקון: ודא ש-_clamp נקרא אחרי כל גרירה/הצבה/הדבקה, ושהוא חוסם חציית גבול עמוד.',
  },
  'oversize-img': {
    severity: 'medium',
    title: 'תמונה inline גבוהה מגובה עמוד פנוי (24.7cm)',
    word:
      'Word מקטין אוטומטית תמונה inline כך שתיכנס בעמוד (גובה זמין = גובה דף פחות שוליים). ' +
      'תיקון: אכוף max-height:24.7cm + object-fit:contain (חוק §8) על כל img בעורך.',
  },

  // ─── ידע לא-גאומטרי: כפתורים, אייקונים, אפקטים, קונסול ──────────────────────
  'button-missing': {
    severity: 'high',
    title: 'כפתור מוגדר במפרט אך לא קיים ב-DOM',
    word:
      'ב-Word כל פקודה ב-Ribbon ממופה לאלמנט קיים. כפתור שנעלם = פיצ\'ר מת. ' +
      'תיקון: ודא שה-id בקוד תואם ל-BUTTONS-SPEC.md (הרץ node qa/sync-buttons.mjs).',
  },
  'button-hidden': {
    severity: 'medium',
    title: 'כפתור קיים אך אינו נראה (rect 0 / display:none)',
    word:
      'Word לא משאיר כפתורים בלתי-נראים בסרגל פעיל. ' +
      'תיקון: בדוק שהלשונית/הקבוצה מוצגת ושאין CSS שמסתיר את הכפתור.',
  },
  'button-no-icon': {
    severity: 'medium',
    title: 'כפתור ללא אייקון ויזואלי מרונדר (טקסט/SVG ריק)',
    word:
      'ב-Word לכל כפתור יש אייקון ברור — המשתמש מזהה פעולה לפי הסמל. ' +
      'כפתור בלי סימן (למשל צורה בבורר ללא תצוגה) = באג נראוּת. ' +
      'תיקון: הוסף אייקון/SVG, או החלף emoji לא-נתמך בגליף/וקטור.',
  },
  'button-no-effect': {
    severity: 'high',
    title: 'קליק על הכפתור לא יצר את הפלט הצפוי',
    word:
      'ב-Word לחיצה על פקודה תמיד מבצעת אותה. ' +
      'אם הפלט לא תואם את BUTTONS-SPEC.md — הלוגיקה שבורה. ' +
      'תיקון: השווה את הפעולה בפועל ל"תוצאה צפויה" שבמפרט.',
  },
  'button-click-error': {
    severity: 'high',
    title: 'קליק על הכפתור זרק שגיאת JS',
    word:
      'Word לא קורס מלחיצת כפתור. שגיאת JS = רגרסיה. ' +
      'תיקון: בדוק את ה-handler של הכפתור (אולי תלות חסרה/סלקטור שגוי).',
  },
  'console-error': {
    severity: 'high',
    title: 'שגיאת console במהלך התרחיש',
    word:
      'אפס שגיאות console הוא תנאי סף (CLAUDE.md §16). ' +
      'תיקון: פתח את הקונסול, שחזר את הרצף, ותקן את מקור השגיאה.',
  },
};

// ממפה issue מבדיקת assert (button-*) לקטגוריית WORD_WISDOM.
export function classifyIssue(issue) {
  return WORD_WISDOM[issue.type] ? issue.type : 'button-no-effect';
}

export function classify(finding) {
  if (finding.kind === 'free-obj') return 'free-in-gap';
  const it = finding.issues[0]?.type;
  if (it === 'in-gap') return 'in-gap';
  if (it === 'straddle') return finding.breakable ? 'straddle-breakable' : 'straddle-unbreakable';
  return 'in-gap';
}
