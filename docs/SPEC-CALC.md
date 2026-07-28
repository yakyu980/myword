# SPEC-CALC — מחשבון מדעי (9 מצבים)
> `openCalculator()` ~6709, חלון-צף גרור (`#_calc`, `role="dialog"` `aria-label="מחשבון מדעי"`), נפתח מ-`#insCalc` (סרגל הוספה).
> קריאה משלימה: `docs/FEATURES-INDEX.md` §4, `CLAUDE.md` §2.
> **~2500 שורות קוד, אפס תרחיש-מרקוס נכון-לתאריך זה — סיכון 🔴 גבוה, ר' פערי-כיסוי ב-FEATURES-INDEX.**

---

## מבנה כללי
- **בורר-מצבים** (`#_calcModes`, `role="tablist"`) — 9 כפתורי `role="tab"` עם `aria-selected` מסונכרן: `_modeBasic` (פעיל-ברירת-מחדל) / `_modeSci` / `_modeGeo` / `_modeEq` / `_modeUnit` / `_modeStat` / `_modeVar` / `_modeGraph` / `_modeTrig`. גלגלת-חצים `‹›` גוללת את השורה כשאין מקום.
- **`_setCalcMode(mode)`** (~7249) — הפונקציה המרכזית שמחליפה מצב: מסתירה את כל הפאנלים, מציגה את הפאנל הרלוונטי, מעדכנת `active`+`aria-selected` על כל 9 הכפתורים.
- **Escape סוגר** את המחשבון — מאזין `keydown` capture, self-removing כש-`!calc.isConnected` (דפוס `_mwPanelDismiss`, מונע דליפה — ר' `CLAUDE.md` §8).
- **`#_calcAngle`** (DEG/RAD) — מתג-toggle גלובלי לזוויות (`aria-pressed`), משפיע על sin/cos/tan וכו' בכל המצבים הרלוונטיים.
- **תצוגה** (`#_calcExpr`/`#_calcFormula`/`#_calcResult`) — 3 שורות: היסטוריה-מצטברת קטנה, הנוסחה-עם-ערכים, שלב-הפתרון.
- **`#_calcHist`** — רשימת-חישובים-קודמים, כל שורה (`.ch-r`) `role="button"`+`tabIndex=0`+`aria-label` דינמי, קליק/Enter/Space מפעילים `_histUseRow()` (מחזיר את החישוב לתצוגה).

## מצב בסיסי (`#_modeBasic`)
לוח-ספרות רגיל: `+ − × ÷ ( ) . = AC ⌫ ±`. `#_calcSciGrid` (מוסתר במצב-בסיסי) מכיל את הפונקציות המדעיות: `sin cos tan log ln asin acos atan sqrt cbrt sq cube pow inv fact pi e exp mod pct abs floor round`.

## מצב מדעי (`#_modeSci`)
כמו בסיסי + `#_calcSciGrid` גלוי.

## מצב גיאומטריה (`#_modeGeo`)
`#_geoShape` (ריבוע/מלבן/עיגול/משולש/מקבילית/טרפז) → `#_geoFields` (שדות דינמיים עם `<label for>`) → `#_geoCalc` מחשב → `#_geoSVG` (`role="img"`, `aria-label` דינמי "שרטוט <שם-צורה>") משרטט. `#_geoAddShape` מוסיף לרשימה מצטברת (`#_geoList`, כל שורה עם כפתור-הסרה ✕) לפני "הכנס למסמך" — בונה טבלת-ריכוז לכל הצורות שנוספו. **תוקן 2026-07-07:** מפריד-פיצול (`.split(' → ')`) שהיה שבור (mojibake, `ג†’`) גרם לעמודת "צורה" בטבלה המוכנסת להכיל את התווית המלאה במקום רק שם-הצורה — תוקן.

## מצב משוואות (`#_modeEq`)
`.calc-eq-types` (`role="tablist"`) — 7 סוגי-משוואה (`#_eqType*`), `role="tab"`+`aria-selected` מסונכרן. פותר משוואה-ריבועית (`x₁`/`x₂` — תוקן mojibake ב-`x₂`), לינארית, ואחרות. `#_eqPhysicsMenu` — 9 נוסחאות-פיזיקה נבנות **דינמית** (`role="tablist"`/`tab`, `aria-selected` מחושב מ-`f.id===_eqPhysFormula`). `#_eqPctSub` (תת-פאנל-אחוזים) עם `label[for]` מקושר.

## מצב יחידות (`#_unitPanel`)
`#_unitCat` (קטגוריה) → `#_unitVal`+`#_unitFrom`+`#_unitTo` → `#_unitSwap` (⇅ מחליף כיוון) → `#_unitCalc` → `#_unitResult`. כל השדות עם `aria-label`.

## מצב סטטיסטיקה (`#_statPanel`)
`#_statInput` (textarea, מספרים מופרדים בפסיק/רווח) → `#_statCalc` → `#_statResult` (ממוצע/חציון/סטיית-תקן וכו').

## מצב משתנים (`#_varPanel`)
`#_varName`+`#_varValue` → `#_varAdd` מגדיר משתנה → `#_varChips` (רשימת-צ'יפים) → זמינים לשימוש בביטויים בסיסיים (`x+y`, `2*a`, `x^2`). `#_varClear` מנקה הכל.

## מצב גרף (`#_graphPanel`)
`#_graphFn` (`f(x) = ...`, למשל `x^2 - 3*x + 2`) + `#_graphXMin/XMax/YMin/YMax` → `#_graphDraw` משרטט על `#_graphCanvas` (`role="img"`, `aria-label` דינמי "שרטוט גרף הפונקציה f(x)=..."). "הכנס תמונה למסמך" (`_graphInsert`) מכניס `<img>` עם **`alt` דינמי** (`f(x) = <הפונקציה>` או "גרף פונקציה" אם ריק, בריחת-גרשיים לפני הזרקה ל-attribute).

## מצב טריג׳ מתקדם (`#_modeTrig`)
`#_trigModeCos`/`#_trigModeSin` (חוק-קוסינוסים/סינוסים, `role="tablist"`/`tab`) → `#_trigSubModes` (תת-מצבים דינמיים, גם `role=tab`+`aria-selected`) → `#_trigAngleBtn` (מתג DEG/RAD **נפרד** מ-`#_calcAngle` הראשי, `aria-pressed`) → `#_trigInsertOpts` (`role="radiogroup"`, 4 אופני-הכנסה).

---

## 4 מצבי הכנסה-למסמך (משותפים לרוב הפאנלים)
| כפתור | Output בעורך |
|---|---|
| 📄 `#_insRes` | רק התוצאה הסופית (`"120"`) |
| 📐 `#_insFull` | ביטוי `=` תוצאה בשורה אחת (`"5 + cos(45) − 12² = -136.29"`) |
| 📋 `#_insSteps` | פתרון-מסודר "כמו-במבחן" (שלב-ביטוי, שלב-הצבה, תשובה) |
| 📝 `#_insHeb` | דרך מילולית מפורטת בעברית ("חמש ועוד קוסינוס של 45...") |

כל הכנסה מבוצעת דרך `document.execCommand('insertHTML', ...)` לתוך `#editor` בנקודת-הסמן השמורה — **חובה** `requestAnimationFrame(updatePagination)` אחרי (§4).

---

## תרחיש-בדיקה מוצע (ר' פערי-כיסוי ב-FEATURES-INDEX §🔴3)
לכל אחד מ-9 המצבים: פתח מחשבון → `_setCalcMode(X)` → הזן קלט → חשב → ודא `role/aria-selected` נכונים על הכפתור-הפעיל → לחץ כל אחד מ-4 כפתורי-ההכנסה → ודא תוכן נכנס ל-`#editor` ו-`updatePagination` רץ. + graph: ודא `<img alt="...">` לא ריק. + history: Enter על שורה ממוקדת מפעיל `_histUseRow`.
