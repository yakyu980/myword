# CODE-INDEX — מפת פונקציות MyWord v2
> מקור: `MyWord-v2.html` · עדכן אחרי כל שינוי משמעותי
> **שימוש:** קרא קובץ זה תחילה, ואז `Read MyWord-v2.html offset:<start> limit:<end-start+20>`
>
> ✅ **מספרי-השורות סונכרנו מחדש 2026-07-20** (`node qa/rebuild-code-index.mjs` — 113 שורות עודכנו).
> קודם לכן הם היו מיושנים באלפי שורות (הקובץ גדל מ-~880KB ל-~1.5MB), וכל קריאה לפיהם
> החזירה **פונקציה אחרת בשקט**. הסחף חד-כיווני (כל עוגן זז קדימה בלבד).
>
> ⚠️ **הרץ `node qa/rebuild-code-index.mjs` אחרי כל שינוי משמעותי** — אחרת הסחף חוזר.
> אם משהו לא מסתדר, `Grep` על שם-הפונקציה הוא תמיד מקור-האמת.
>
> פונקציות שאין להן עדיין ערך בטבלה: `initDocTabs`, `openStrokePanel`,
> `initImageRibbonCaret`, `initTextboxRibbonCaret`, `initFreeObjKeyShortcuts` — ר' `wiki/log.md`.
>
> 📌 **לאינוונטר-יכולות מלא ומעודכן (2026-07-10, כולל כל הפיצ'רים החדשים
> ועמודת-כיסוי-בדיקה): קרא `docs/FEATURES-INDEX.md` קודם.** הוא המקור-האמת
> העדכני ביותר; הקובץ הזה משלים אותו לפרטי-פונקציות עמוקים יותר.
>
> 🎨 **ביקורת-עיצוב UI (נוי, 2026-07-11):** `docs/SPEC-DESIGN-RIBBON.md` — 4 ממצאים
> על בורר-הצורות/`#ctxBar` מול הריבון/בורר-הצבעים/טאבים-ראשיים, כולל ערכי-CSS
> קונקרטיים. **אזהרה מתועדת שם:** חלק מהממצאים (בורר-הצורות, `#ctxBar`) עברו כבר
> שדרוגי-עיצוב ב-2026-07-04 (`wiki/log.md:428-433`) שחלקית חופפים לתלונה החדשה —
> קרא את הקובץ **במלואו** (כולל "מה כבר תוקן") לפני שמניחים שממצא=פגם-לא-מטופל.

---

## כלל שימוש
```
1. מצא את הפונקציה בטבלה → קבל שורת התחלה
2. Read MyWord-v2.html offset:<שורה-10> limit:80
3. חסוך 95% טוקנים לעומת קריאת הקובץ כולו
```

---

## עימוד (Pagination)

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `getPxPerCm()` | 4601 | ~4617 | המרת cm לפיקסלים |
| `paginateBlocks()` | 4618 | ~4691 | עימוד ראשי — דוחף בלוקים מעבר לפער |
| `updatePagination()` | 4779 | ~4844 | מחשב עמודים, minHeight, overlays |
| `updateStats()` | 4853 | ~4860 | עדכון שורת סטטוס |

---

## עיצוב טקסט (Home Ribbon)

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `exec(cmd, value)` | 4861 | ~4878 | עוטף execCommand + undo-safe לfree-obj |
| `updateActiveButtons()` | 4885 | ~4900 | מסמן כפתורים פעילים בסרגל |
| `applyFontSize(pt)` | 4901 | ~4983 | שינוי גודל גופן (לא execCommand!) |
| `readCurrentFontSizePt()` | 4984 | ~5035 | קריאת גודל גופן נוכחי מה-DOM |
| `restoreSelection()` | 5036 | ~5048 | שחזור בחירה אחרי פעולה |
| `applyColor(kind, color)` | 5049 | ~5086 | צבע טקסט/רקע |
| `clearBackground()` | 5087 | ~5099 | ניקוי צבע רקע |
| `buildColorPalette()` | 5392 | ~5438 | בניית פלטת הצבעים |
| `_transformSelectionCase(fn)` | 5989 | ~6069 | שינוי רישיות (UPPER/lower/Title) |
| `openFontSizeMenu()` | 5962 | ~5970 | פתח תפריט גופן |
| `closeFontSizeMenu()` | 5971 | ~5988 | סגור תפריט גופן |
| `_selectedBlocks()` | 12490 | ~12519 | קבלת בלוקים נבחרים |
| `_syncBlockStyle()` | 12520 | ~12531 | סנכרון select סגנון בלוק |
| `_applyIndent(delta)` | 12532 | ~12574 | הזחה + ביטול הזחה |

---

## שמירה וניהול מסמכים

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `getAllDocs()` | 5527 | ~5530 | שליפת כל המסמכים מ-localStorage |
| `saveAllDocs(docs)` | 5528 | ~5531 | שמירת כל המסמכים |
| `setSaveState(kind, label)` | 5531 | ~5535 | עדכון אינדיקטור שמירה |
| `saveDoc()` | 5536 | ~5561 | שמירת מסמך נוכחי (debounced) |
| `loadDoc(id)` | 5565 | ~5579 | טעינת מסמך לפי ID |
| `newDoc()` | 5593 | ~5606 | מסמך חדש |
| `openDocManager()` | 5607 | ~5712 | פתח מנהל מסמכים |
| `scheduleSave()` | 5904 | ~5961 | debounce שמירה אוטומטית (800ms) |
| `window.saveDoc` (v2) | 6971 | ~7003 | wrapper freeObjs (wrapper נוסף header/footer ב-7203) |
| `window.loadDoc` (v2) | 7004 | ~7020 | wrapper deserialize (wrapper נוסף header/footer ב-7216) |

---

## עמודים ידניים

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_pageCounts()` | 5764 | ~5785 | ספירת עמודים (natural + manual) |
| `_lastPageContent()` | 5788 | ~5816 | בדיקת תוכן עמוד אחרון |
| `_showRemovePageDialog(info)` | 5817 | ~5869 | דיאלוג הסרת עמוד |
| `_scrollToPage(idx)` | 5870 | ~5876 | גלילה לעמוד |
| `addManualPage()` | 5877 | ~5886 | כפתור ➕ הוסף עמוד |
| `removeManualPage()` | 5887 | ~5903 | כפתור ➖ הסר עמוד |

---

## Insert Ribbon — הוספת אובייקטים

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `openTablePicker(anchorBtn)` | 6317 | ~6392 | תפריט בחירת גודל טבלה |
| `insertTable(rows, cols)` | 6403 | ~6427 | הוסף טבלה (nested inside openTablePicker) |
| `_openSymbolPicker()` | 6716 | ~6722 | פתח פיקר סמלים |
| `_insertLastChar(key)` | 6723 | ~6752 | הוסף תו/סמל |
| `openCalculator()` | 6753 | ~8105 | פתח מחשבון (כולל geo-SVG, multi-shape, eq חדשות) |
| `_geoRenderSVG(shape,vals)` | 7551 | ~7605 | SVG ויזואלי גיאומטריה (בתוך openCalculator) |
| `_geoRenderSVGFromFields()` | 7635 | ~7645 | SVG מהשדות הנוכחיים (בתוך openCalculator) |
| `_showCalcImgViewer(src,calc)` | 7646 | ~7669 | viewer תמונת עזר צף (בתוך openCalculator) |
| `_openEmojiPicker()` | 8649 | ~8659 | פתח פיקר אימוג'י |
| `_openCategorizedPicker()` | 8660 | ~8723 | פיקר קטגוריות (emoji/symbol) |
| `insertFreeImage()` | 9983 | ~10064 | הוסף תמונה → free-obj |
| `insertFreeTextbox()` | 10095 | ~10155 | הוסף תיבת טקסט → free-obj |
| `insertFreeShape(kind)` | 10701 | ~10732 | הוסף צורה SVG |
| `openShapePicker(anchorBtn)` | 10837 | ~10894 | תפריט בחירת צורה |
| `insertFreeDrawing()` | 11814 | ~11916 | הוסף ציור חופשי |
| `openHeaderFooterDialog()` | 12113 | ~12169 | דיאלוג כותרת/תחתית |
| `renderHeaderFooter()` | 12087 | ~12112 | ציור overlays כותרת/תחתית |
| `openFindReplace(showReplace)` | 12669 | ~12728 | פתח דיאלוג חיפוש/החלפה |
| `openLinkDialog()` | 15703 | ~15755 | פתח דיאלוג קישור |
| `openDateMenu(btn)` | 15770 | ~15779 | תפריט הוספת תאריך |
| `openTimeMenu(btn)` | 15780 | ~15790 | תפריט הוספת שעה |

---

## אובייקטים חופשיים (free-obj)

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_selectObj(obj)` | 8967 | ~8975 | בחירת אובייקט + הצגת handles |
| `_findBuriedObjAt(x, y)` | 9009 | ~9043 | מציאת אובייקט קבור מתחת לטקסט |
| `_clamp(obj)` | 9086 | ~9151 | הגבל אובייקט לגבולות **המסמך** + הרחקה מפס-הפער (מעבר חופשי בין עמודים, §5 — **לא** נעילה לעמוד יחיד) |
| `_snap(val, pxPerCm)` | 9183 | ~9186 | snap לרשת |
| `_showSnapGuides(obj, l, t)` | 9187 | ~9206 | הצג קווי snap |
| `_clearSnapGuides(obj)` | 9207 | ~9212 | הסר קווי snap |
| `_addHandles(obj)` | 9213 | ~9260 | הוסף 8 resize handles + rotate |
| `_addToolbar(obj, extraBtns)` | 9354 | ~9399 | הוסף סרגל צף לאובייקט |
| `_updateToolbar(obj)` | 9407 | ~9411 | עדכן סרגל צף |
| `_makeDraggable(obj, handle)` | 9412 | ~9621 | הפוך לאובייקט גרירה |
| `_setImgMode(obj, mode)` | ~9885 | — | שנה מצב תמונה (**6 מצבים** — `IMG_MODES` ~9682; `below-text` מנורמל ל-`behind`, ר' [[img-modes-below-text-trap]]) |
| `clampImageToPage(img)` | 8724 | ~8754 | כלא תמונה inline לגובה עמוד |
| `_flowBlocks(obj)` | 9701 | ~9709 | הזרמת בלוקים מסביב ל-float |
| `_placeFloatInFlow(obj, top)` | 9710 | ~9725 | מיקום float בזרם |
| `_reanchorFloat(obj, y)` | 9726 | ~9739 | עוגן מחדש float |
| `_restoreFloatPos(obj, top)` | 9797 | ~9813 | שחזור מיקום float |
| `_clampFloat(obj)` | 9835 | ~9876 | כלא float לגבולות |
| `_nextZ()` | 10518 | ~10588 | z-index הבא |
| `_wrapModeBtn(obj)` | 12799 | ~12802 | כפתור מצב גלישה |
| `openWrapPanel(obj, btn)` | 12899 | ~12971 | פנל בחירת מצב גלישה |

---

## סריאליזציה (שמירה/טעינה אובייקטים)

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_serializeFreeObjs()` | 10158 | ~10161 | סריאליזציה של כל free-obj |
| `_serializeObj(obj)` | 10162 | ~10213 | סריאליזציה של אובייקט יחיד |
| `_deserializeFreeObjs(list)` | 10263 | ~10443 | טעינת אובייקטים מ-JSON |
| `_buildImageObjFromSrc(src)` | 11755 | ~11783 | בניית אובייקט תמונה מ-src |

---

## צורות ומחברים

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_buildShapeSVG(kind, fill, stroke)` | 10616 | ~10637 | בניית SVG לצורה |
| `_isConnectorKind(kind)` | 10677 | ~10679 | בדיקת מחבר |
| `_renderShape(obj)` | 10680 | ~10690 | ציור צורה |
| `_connEnsureId(obj)` | 12222 | ~12225 | וידוא ID למחבר |
| `_connGetEndPoint(obj, side)` | 12226 | ~12241 | נקודת קצה מחבר |
| `_renderConnector(obj)` | 12242 | ~12325 | ציור מחבר/חץ |
| `_updateConnectorsFor(movedObj)` | 12416 | ~12487 | עדכון מחברים אחרי גרירה |

---

## ציור חופשי

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_bindDrawing(obj, st)` | 11716 | ~11738 | אירועי ציור על canvas |
| `_wireDrawingToolbar(obj, st, ctx, canvas)` | 11739 | ~11754 | סרגל ציור |

---

## חיפוש והחלפה

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_clearFindHighlights()` | 12575 | ~12582 | ניקוי הדגשות |
| `_runFind()` | 12583 | ~12619 | ביצוע חיפוש |
| `_focusHit()` | 12620 | ~12626 | פוקוס על תוצאה |
| `_updateFindCount()` | 12627 | ~12631 | עדכון מונה תוצאות |
| `_findNav(dir)` | 12632 | ~12637 | ניווט בין תוצאות |
| `_replaceCurrent()` | 12638 | ~12648 | החלפת תוצאה נוכחית |
| `_replaceAll()` | 12649 | ~12662 | החלפת כל התוצאות |
| `closeFindReplace()` | 12664 | ~12668 | סגירת דיאלוג |

---

## כותרת ותחתית

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `renderFootnotes()` | 12011 | ~12070 | ציור הערות שוליים |
| `_hfText(tpl, page, total)` | 12072 | ~12080 | פרשנות תבנית {עמוד}/{סהכ} |
| `_hfForPage(i, which)` | 12081 | ~12086 | כותרת/תחתית לעמוד ספציפי |

---

## סרגל הקשרי (ctxBar)

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `buildText()` | 13596 | ~13635 | בניית ctxBar לטקסט |
| `buildImage(obj, isImage)` | 13644 | ~13681 | בניית ctxBar לתמונה/אובייקט |
| `buildTextbox(obj)` | 13734 | ~13760 | בניית ctxBar לתיבת טקסט |
| `buildTable(cell)` | 14098 | ~14133 | בניית ctxBar לטבלה |
| `refreshCtx()` | 14564 | ~14594 | רענון ctxBar |
| `scheduleRefresh()` | 14623 | ~14667 | debounce רענון |

---

## זום

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `applyZoom(pct)` | 15046 | ~15065 | החלת זום על #pageStack |

---

## ייצוא והדפסה

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `_buildExportContent()` | 8757 | ~8772 | בניית HTML לייצוא |
| `exportHTML()` | 8774 | ~8832 | ייצוא HTML |
| `shareDoc()` | 8834 | ~8965 | שיתוף מסמך |
| `exportAndPrint()` | 14891 | ~14902 | הדפסה |
| `copyDocLink()` | 14904 | ~14920 | העתקת קישור |

---

## הדבקה (Paste)

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `initPasteSanitizer()` | 15591 | ~15661 | אתחול מחטא הדבקה |

---

## UI כלים

| פונקציה | התחלה | סוף משוער | תיאור |
|---|---|---|---|
| `showHint(msg)` | 5100 | ~5116 | הצג הודעת עזרה |
| `normalizeUrl(url)` | 6441 | ~6655 | נרמול URL |
| `_makeDraggablePanel(panel, handle)` | 16122 | ~16178 | פנל גרירה |
| `_undoImgMove()` | 15569 | ~15590 | undo לתמונה שזזה |

---

## מבנה ה-Ribbon (HTML)

| סרגל | שורת התחלה |
|---|---|
| `data-ribbon="insert"` | 1378 |
| `data-ribbon="file"` | 1497 |
| `data-ribbon="home"` (toolbar) | 1554 |

---

## קבועים חשובים (חפש בקוד)

| קבוע | חפש |
|---|---|
| `IMG_MODES` | `IMG_MODES` |
| `FREE_MARGIN_CM` | `FREE_MARGIN_CM` |
| `SNAP_CM` | `SNAP_CM` |
| `STORAGE_KEY` | `STORAGE_KEY` |
| `LAST_OPEN_KEY` | `LAST_OPEN_KEY` |
| `window._docZoom` | `_docZoom` |
