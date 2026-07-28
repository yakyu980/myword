# SPEC-CTX-TABS — לשוניות-הקשר ברִיבּוֹן (2026-07-08, שלב 2+3)
> `initCtxFormatTabs` (~19069, IIFE נפרד בסוף הקובץ). מוסיף 2 לשוניות **דינמיות** ("🖼️ עיצוב תמונה" / "🔷 עיצוב צורה")
> לשורת-הלשוניות, בסגנון Word Picture/Shape-Format — מופיעות **רק** כשאובייקט מתאים נבחר, נעלמות כשהבחירה מתבטלת.
> קריאה משלימה: `CLAUDE.md` §2, `docs/SPEC-IMAGE-EDIT.md`, `docs/FEATURES-INDEX.md` §5.

---

## עקרון-על — לא-קופצות-אוטומטית (כמו Word)
בניגוד לכמה יישומים שקופצים ללשונית-ההקשר בבחירה, MyWord (כמו Word עצמו) **מציג** את הלשונית אבל **לא עובר אליה אוטומטית** — המשתמש נשאר איפה שהוא היה (למשל "בית") ובוחר אם לעבור. רק כשהבחירה **מתבטלת** ולשונית-ההקשר הייתה **פעילה** — המנגנון מחזיר אוטומטית ל"בית".

## מנגנון-ההצגה/הסתרה
```js
window._ctxFormatTabsUpdate = function (o) {
  const isImg   = !!(o && o.isConnected && o.querySelector('.free-img-wrap img'));
  const isShape = !!(o && o.isConnected && !isImg && o.querySelector('.free-shape-wrap') && !o.classList.contains('free-connector'));
  imgTab.hidden = !isImg;
  shapeTab.hidden = !isShape;
  if (isImg) syncImgControls(o);
  if (!isImg && imgTab.classList.contains('active'))     activateTab('home');
  if (!isShape && shapeTab.classList.contains('active')) activateTab('home');
};
```
- מחובר דרך **עטיפה** (לא שכתוב) של `_selectObj` — הבסיס רץ קודם, ואז `_ctxFormatTabsUpdate` רץ ב-try/catch (כשל ב-UI-בלבד לא מפיל את הבחירה עצמה).
- מחבר/`free-connector` **לא** נחשב "צורה" — `isShape` בודק `!classList.contains('free-connector')` במפורש.
- מיזוג-צורות (`combineSelectedShapes`) שתוצאתו תמונה → לשונית-הצורה נעלמת, לשונית-התמונה מופיעה (**by-design**, לא רגרסיה — האובייקט באמת הפך לתמונה).
- הלשוניות **דינמיות ב-JS בכוונה** — לא נכנסות ל-`_allTabs`/מאזין-הקליק-הסטטי של 6 הלשוניות הקבועות. אפס השפעה עליהן.
- רק `.ribbon.active` אחד גלוי בכל רגע (§2) — `activateTab(id)` מבצע `toggle('active', ...)` על כל הלשוניות+ריבונים גם ללשוניות-ההקשר.

---

## 🖼️ עיצוב תמונה (`imgformat`)
`syncImgControls(o)` מסנכרן פקדים בפתיחה: `wrapSel.value = imgMode`, `opRange`/`opVal` לפי `opacity` נוכחי.

| קבוצה | כפתורים |
|---|---|
| התאמות | 🌗 מסננים → `openImageFiltersPanel` · ✂️ הסר רקע → `openBgRemovePanel` · 🏷️ טקסט חלופי → `_editImgAlt` |
| סגנון | 🖼️ מסגרת → `openImageBorderPanel` · שקיפות (סלייידר) |
| סידור | מצב-גלישה (`IMG_MODES` דרך `_setImgMode`) · ריבוד קדימה/אחורה · שחזר-מקורי (`img.dataset.origSrc`) |

## 🔷 עיצוב צורה (`shapeformat`)
| קבוצה | כפתורים |
|---|---|
| סגנון צורה | 🎨 מילוי → `openColorWheel` (dataset.fill) · 🖊️ צבע קו → `openColorWheel` (dataset.stroke) · 〰️ עובי וסגנון קו → `openStrokePanel` |
| **אפקטים** (חדש שלב 3, 2026-07-08ב) | 🌤️ צל → `openShapeShadowPanel` · 🎨 גרדיאנט → `openShapeGradientPanel` · ↔️ היפוך אופקי / ↕️ היפוך אנכי → `_shapeFlip(obj,'H'|'V')` |
| מיזוג צורות (רק כש-2+ נבחרו) | 🧩 אחד (`union`) · ✂️ חיתוך (`subtract`) · ⧉ חפיפה (`intersect`) · ⊕ הפוך/XOR (`exclude`) — כולם דרך `combineSelectedShapes` |
| סידור | ריבוד קדימה/אחורה · 📑 שכפל (clone + `_applyShapeFx(clone)` לרענון-id-גרדיאנט) · 🗑️ מחק |

### אפקטי-צורה — פרטים (`_applyShapeFx`, ~10593)
כל 3 האפקטים חלים על `.free-shape-wrap` (לא על `.free-obj` — כדי לא להתנגש עם `data-rotation` שמיושם על ה-obj עצמו):

| אפקט | יישום | dataset |
|---|---|---|
| **צל** | `wrap.style.filter = drop-shadow(Xpx Ypx BLURpx rgba(...))` | `obj.dataset.shadow` = JSON `{on,x,y,blur,color,op}` |
| **היפוך** | `wrap.style.transform = scale(fH?-1:1, fV?-1:1)` | `obj.dataset.flipH`/`flipV` = `'1'` או נמחק |
| **גרדיאנט** | מוסיף `<linearGradient id="mwgradN">` ל-`<defs>` בתוך ה-`<svg>`; `id` **טרי בכל קריאה** (`_applyShapeFx._seq++`, מונע-גלובלי) כדי שלא יתנגש בין שכפולים; מעדכן `fill="url(#id)"` על כל אלמנט שה-`fill` הנוכחי שלו הוא `dataset.fill` הבסיסי או `url(#mwgrad...)` ישן | `obj.dataset.grad` = JSON `{c1,c2,angle}` |

**קריטי — `_applyShapeFx` רץ בסוף כל `_renderShape`** (hook ~10350) — כך ששינוי מילוי/קו/עובי (שמרנדר-מחדש את ה-SVG כולו) **לא דורס** את הצל/גרדיאנט/flip הקיימים; הם מוחלים-מחדש אוטומטית על ה-SVG החדש.

**מלכודת שנמצאה ותוקנה (2026-07-10):**
1. **סריאליזציה חד-כיוונית** — `_serializeObj` כתב `shapeShadow`/`shapeGrad`/`flipH`/`flipV` (§6), אבל `_deserializeFreeObjs` (ענף `d.type==='shape'`, ~10103) מעולם לא קרא אותם בחזרה ל-`obj.dataset` לפני `_renderShape(obj)` → אפקטים נעלמו בשקט אחרי כל שמירה+רענון. תוקן.
2. **התנגשות-id בשכפול** — `cloneNode(true)` שכפל גם את ה-`<linearGradient id="mwgradN">` הפנימי → 2 SVG בדוקומנט עם אותו id. תוקן ע"י קריאה ל-`_applyShapeFx(clone)` מיד אחרי clone (מייצר id-טרי).

---

## תרחיש-בדיקה מדויק (לתרחיש-מרקוס עתידי)
1. הכנס תמונה → `imgTab.hidden === false`, `shapeTab.hidden === true`.
2. `imgTab.click()` → `.ribbon[data-ribbon="imgformat"].active === true`, כל שאר `.ribbon` לא-active.
3. בטל בחירה (Escape/קליק-ריק) → `imgTab.hidden === true`, אם imgformat היה פעיל → `.ribbon[data-ribbon="home"].active === true`.
4. הכנס צורה עם גרדיאנט → שמור מסמך → טען-מחדש → `.free-shape-wrap svg defs linearGradient` קיים ו-`fill` על האלמנט מצביע אליו.
5. שכפל צורה-עם-גרדיאנט (Ctrl+D או כפתור "שכפל") → 2 `linearGradient` עם `id` **שונה** בדוקומנט.
