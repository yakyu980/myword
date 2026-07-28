// lib/test-exclude.mjs — כפתורים/תכונות שמוחרגים מבדיקות מרקוס (לפי בקשת המשתמש).
// הכפתורים עדיין מתועדים ב-BUTTONS-SPEC.md, אך לא נבדקים ב-suite buttons ולא ב-fuzz.
// כדי להחזיר תכונה לבדיקות — הסר אותה מכאן.

// כפתורי הכניסה של התכונות המוחרגות (לפי id).
export const EXCLUDED_IDS = new Set([
  // תווים (סימנים מיוחדים)
  'insSymbol', 'insSymbolCaret',
  // אימוג'ים
  'insEmoji', 'insEmojiCaret',
  // מחשבון (כפתור הפתיחה + פקדי הדיאלוג בעלי id)
  'insCalc', '_calcAngle', '_calcClose', '_modeBasic', '_modeSci',
  '_insRes', '_insFull', '_insSteps', '_insHeb',
]);

// אייקונים של מקלדת המחשבון (כפתורי noid בתוך דיאלוג המחשבון) — פונקציות/ספרות/פעולות.
export const EXCLUDED_CALC_ICONS = new Set([
  'sin', 'cos', 'tan', 'log', 'ln', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹',
  '√', '∛', 'x²', 'x³', 'x^y', '1/x', 'π', 'e', 'n!', '!',
  'EXP', 'Ans', 'M+', 'M-', 'MR', 'MC',
  'C', '⌫', '÷', '×', '−', '+', '=', '.', '%', '±', '(', ')',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);

// האם הכפתור מוחרג מבדיקות?
export function isExcluded(b) {
  if (EXCLUDED_IDS.has(b.id)) return true;
  // כפתורי מקלדת המחשבון: דיאלוג + אייקון פונקציה/ספרה.
  if (b.suite === 'dialog' && EXCLUDED_CALC_ICONS.has((b.icon || '').trim())) return true;
  return false;
}

// תווית קצרה למה הכפתור מוחרג (לתצוגה במפרט).
export function excludeReason(b) {
  if (b.id === 'insSymbol' || b.id === 'insSymbolCaret') return 'תווים';
  if (b.id === 'insEmoji' || b.id === 'insEmojiCaret') return 'אימוג\'ים';
  return 'מחשבון';
}
