// התאמה-מקורבת (טולרנטית-לשגיאות-הקלדה) — פונקציה טהורה, ניתנת
// לבדיקה בלי דפדפן. נועדה בדיוק למקרים כמו חיפוש "נוטה" שאמור למצוא
// "נוטלה" (אות אחת חסרה) — לא רק substring מדויק כמו שהיה קודם.

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// סף-סבילות יחסי-לאורך: מילה קצרה סובלת פחות טעויות ממילה ארוכה,
// כדי לא ליצור התאמות-שווא רועשות בין מילים קצרות ולא-קשורות.
function toleranceFor(len) {
  if (len <= 3) return 1;
  if (len <= 6) return 1;
  return 2;
}

/** true אם query קרוב-מספיק (עריכה-מרחק) לאחת ממילות text, או substring רגיל. */
export function fuzzyIncludes(text, query) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const t = text.toLowerCase();
  if (t.includes(q)) return true;

  const words = t.split(/\s+/).filter(Boolean);
  const tolerance = toleranceFor(q.length);
  return words.some((w) => levenshtein(q, w) <= tolerance);
}
