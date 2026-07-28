# FEATURES-INDEX — אינוונטר-יכולות מלא · MyWord v2
> **מקור-אמת מרכזי לדאן (spec-expert) ולמרקוס (QA).** נבנה 2026-07-10 מקריאה ישירה של הקוד
> (עוגן: `backups/MyWord-v2.backup-imgedit-phase3-2026-07-08.html`, זהה לקוד-החי של אותו יום).
> **מספרי-שורות = "בערך" (~)** — הקוד זז; חפש תמיד לפי **עוגן-הטקסט** (שם-פונקציה/מזהה) עם Grep.
> עמודת "כיסוי" = האם קיים תרחיש ב-`qa/lib/scenarios.mjs` (שם ה-suite) או ❌.
>
> קריאה משלימה: `CLAUDE.md` (החוקה) · `docs/CODE-INDEX.md` (מפת-פונקציות) · `qa/BUTTON-SPEC.md` · SPEC-ים פר-אזור.

---

## ⚠️ תיקוני-עובדה מול תיעוד ישן (אומתו בקוד)
1. **`IMG_MODES` = 6 מצבים בפועל**: `['free','above-text','float-right','float-left','inline','behind']` (~9470).
   `below-text` **אינו קיים** במערך (מוזג ל-`behind`). ~~CLAUDE.md §5 עדיין מונה 7~~ — **תוקן ב-CLAUDE.md §6 (2026-07-11) וב-`docs/IMAGES.md` (2026-07-19)**; שניהם מונים 6 כעת.
2. מסמכים נשמרים ב-**IndexedDB (`mwDB`, ~5406)** עם גיבוי-localStorage — `localStorage.clear()` לא מנקה state בבדיקות (ר' זיכרון test-hygiene). ~~CLAUDE.md §7 עדיין קרוי "שמירה — localStorage"~~ — **תוקן 2026-07-19**.
3. יש **שתי מערכות סרגל-צף**: `#ctxBar` (בוני `buildText/buildImage/buildTextbox/buildTable*`, ~12344+) + פורט floatbar-v04. זה מקור "כפילות כפתורים" — by-design.

---

## 1. לשונית קובץ (`data-ribbon="file"`)
| יכולת | UI | עוגן-קוד | התנהגות צפויה | כיסוי |
|---|---|---|---|---|
| מסמך חדש (עם שם) | ＋ בסרגל / בשורת-הלשוניות | `newDoc` ~5558 (wrapped ×3) | מסמך ריק, לשונית חדשה, `mwPrompt` לשם | ✔ doctabs |
| שמירה / שמירה-אוטומטית | כפתור שמור / Ctrl+S / debounce 800ms | `saveDoc` ~5501 (wrappers: freeObjs/header/pageBg/tabs), `scheduleSave` ~5865 | `#saveState` ⋯→✓ (aria-live) | ✔ storage, keyboard |
| שמור בשם | כפתור | `saveDocAs` ~15084 (דרך `mwPrompt`) | עותק חדש בשם חדש | ❌ |
| מנהל מסמכים | 📂 | `openDocManager` ~5572 (role=dialog) | רשימה+🔍 חיפוש+✏️ שינוי-שם+⧉ שכפול+🗑 מחיקה; שמות עוברים `esc()` | ✔ docmgr (3) |
| מאפייני מסמך | כפתור | `openDocProperties` ~15116 (`_escProps`, Escape) | פנל info; שם-מסמך בורח-HTML | ❌ |
| שמירה-אוטומטית toggle | `#btnAutoSaveToggle` | `toggleAutoSave` ~15158 (aria-pressed) | מפעיל/מכבה scheduleSave | ❌ |
| ייצוא Word (.doc) | כפתור | `exportDocWord` ~15719 (BOM אמיתי; סינון שם-קובץ) | Blob HTML בתחפושת .doc | ❌ |
| ייצוא HTML | כפתור | `exportHTML` ~8705 (`titleEsc`, `_buildExportContent` ~8688) | קובץ HTML עצמאי | ❌ |
| הדפסה / PDF | Ctrl+P / כפתור | `exportAndPrint` ~13418 (`titleEsc`) | חלון-הדפסה; @media print מסתיר UI | ✔ print (10, @media בלבד) |
| שיתוף | כפתור | `shareDoc` ~8765 (`titleEsc` ×3) | HTML+באנר-שיתוף+קישור | ❌ |
| העתקת קישור | כפתור | `copyDocLink` ~13431 | קישור ללוח | ❌ |
| שחזור-קריסה | אוטומטי | `mwDB.putRecovery` בתוך `init` (כל 30 שנ') | snapshot ל-IDB store 'recovery' | ❌ |

## 2. שורת לשוניות-מסמכים (`#docTabsBar`)
| יכולת | עוגן-קוד | התנהגות צפויה | כיסוי |
|---|---|---|---|
| לשונית לכל מסמך פתוח | `initDocTabs` ~18328, מפתח `myword2_open_tabs` | פעילה=גרדיאנט אינדיגו, aria-selected | ✔ doctabs (5) |
| סגירת לשונית ≠ מחיקה | `closeTab` בתוך initDocTabs | מסירה מהסשן בלבד; פעילה→עוברת לשכן | ✔ doctabs |
| דילוג-render לפי חתימה | `_lastSig` בתוך render | אין בנייה-מחדש של DOM ללא שינוי | ✔ doctabs |

## 3. לשונית בית (`data-ribbon="home"`)
| יכולת | עוגן-קוד | התנהגות צפויה | כיסוי |
|---|---|---|---|
| B/I/U/S, עילי/תחתי | `exec` ~4826 (undo-safe ל-free-obj) | עיצוב על הבחירה, לא שובר עימוד | ✔ home-ribbon (46) |
| גופן + גודל | `applyFontSize` ~4866 (span, לא execCommand), `readCurrentFontSizePt` ~4949 | בחירה נשמרת אחרי ± | ✔ home-ribbon |
| צבע טקסט/מרקר + גלגל-צבע | `applyColor` ~5014, `openColorWheel` ~16327 | פלטה + HSV-wheel + HEX + אחרונים | ✔ home-ribbon (home-color-wheel) |
| שינוי רישיות | `_transformSelectionCase` ~5950 | UPPER/lower/Title | ✔ buttons |
| יישור ×4, רשימות, הזחה | exec + `_applyIndent` ~11387 | כולל זיהוי-אוטומטי `- `/`1. ` | ✔ home-ribbon |
| סגנונות בלוק | `#blockStyle`, `_syncBlockStyle` ~11375 | P/H1/H2/H3/BLOCKQUOTE | ✔ home-ribbon |
| מברשת עיצוב | `#btnFormatPainter` | לכידה→החלה חד-פעמית | ✔ home-ribbon |
| Undo/Redo | `initUndoHistory` ~14683 (`_historyRecord`/`_historyRecordAmend`) | לא מוחק free-obj; amend ל-img.onload | ✔ keyboard, storage, undo-redo |

## 4. לשונית הוספה (`data-ribbon="insert"`)
| יכולת | עוגן-קוד | התנהגות צפויה | כיסוי |
|---|---|---|---|
| תמונה מקובץ | `insertFreeImage` ~9697 (`_newObjInsertPoint` ~14923, `_nextZ`) | free-obj במרכז-הנראה, 6 מצבי-גלישה | ✔ insert (C1) |
| 6 מצבי-תמונה | `IMG_MODES` ~9470, `_setImgMode` ~9601 | free/above/float-r/float-l/inline/behind | ✔ insert |
| **עריכת-תמונה: מסננים** | `openImageFiltersPanel` ~18441 | בהירות/ניגודיות/רוויה 0-200%, bake לפיקסלים | ❌ — ר' SPEC-IMAGE-EDIT |
| **עריכת-תמונה: הסרת-רקע** | `openBgRemovePanel` (Grep) | chroma-key + ✨הסרה-אוטומטית (flood-fill מהקצוות) + 📌keep-mask + מברשת מחק/שחזר → PNG שקוף | ❌ |
| **✂️ חיתוך לגבולות האובייקט** (2026-07-20) | `_imgOpaqueBounds`/`_imgCropToBounds`/`_imgRestorePreCrop` (ליד `_imgEnsureOrig`), `#_bgCropChk` | אחרי הסרת-רקע: חותך שוליים-שקופים ומכווץ box פרופורציונלית — הידיות תופסות את האובייקט; `imgPreCrop` בסריאליזציה; מודע-רוטציה | ❌ (אומת חי; ר' SPEC-IMAGE-EDIT) |
| **עריכת-תמונה: מסגרת+פינות** | `openImageBorderPanel` ~18736 | CSS על `.free-img-wrap`, radius | ✔ img-edit |
| שחזר תמונה מקורית | `_imgEnsureOrig` (Grep), `dataset.origSrc`, `imgOrigSrc`+`imgPreCrop` בסריאליזציה | ביטול כל העריכות **כולל גיאומטריית-חיתוך** (3 מסלולים: פאנל-1/פאנל-2/ריבון), שורד שמירה/טעינה | ❌ |
| טקסט חלופי (alt) | `_editImgAlt` ~9686 | mwPrompt לעריכת alt | ❌ |
| טבלה (בורר-גריד) | `openTablePicker` ~6273, `insertTable` ~6359 (th scope=col) | ניווט-מקלדת מלא בבורר | ✔ insert (C2) |
| פעולות-טבלה (שורה/עמודה/מיזוג/פיצול/מחק/מסגרת-תא) | `buildTable`/`buildTableMulti` ~12815/13003, `openCellBorderPanel` ~17827 | דרך הסרגל-הצף + ▾ | ✔ insert, buttons |
| העברת-טבלה + צ'יפי שורה/עמודה | `initTableMove` ~17876 (`.tbl-move-handle`, `.tbl-chip` aria-pressed) | DOM-reorder בגרירה/חצים | ❌ (חלקי דרך buttons) |
| תיבת-טקסט / פתק | `insertFreeTextbox` ~9808 (role=textbox) | `.tb-header`+`.tb-content`; note=רקע צהוב | ✔ insert (C3-C4) |
| צורות (38 סוגים) | `insertFreeShape` ~10344, `openShapePicker` ~10438, `SHAPE_LABELS` ~10246 | SVG + aria-label עברי | ✔ insert (C5), buttons (shape-picker-icons) |
| עובי/סגנון-קו לצורה | `openStrokePanel` ~10523 | 1-9px, רציף/מקווקו/מנוקד, שורד סריאליזציה | ✔ shapes2 (3) |
| מיזוג-צורות ×4 | `combineSelectedShapes` ~15037, `paperBooleanOp` ~5257 (Paper.js inline) | unite/subtract/intersect/exclude; fallback SVG-mask | ❌ (אין תרחיש ישיר) |
| בחירה-מרובה + גרירה-קבוצתית | Shift/Ctrl+Click, `_grpMoveRAF` ~13265 | עוגן-חיתוך כחול; rAF-throttled | ✔ free-objects (obj-multi-select) |
| ציור חופשי/חתימה | `insertFreeDrawing` ~10669 | canvas → free-obj PNG | ✔ insert (C6) |
| מחברים/חצים | `_renderConnector` ~11097 | עוקבים אחרי אובייקטים | ✔ insert (חלקי) |
| כותרת/תחתית רצה | `openHeaderFooterDialog` ~10968, `renderHeaderFooter` ~10942 | {עמוד}/{סהכ}; 1.8/1.6cm שמורים | ✔ insert (C7) |
| קישור / תאריך / שעה / סמלים / אימוג'י | `openLinkDialog` ~14098, `_openCategorizedPicker` | | ✔ insert, buttons |
| שובר-עמוד / קו-אופקי / עמוד-ידני ± | `addManualPage` ~5838 | data-pagebreak ללא cascade | ✔ page-rules, insert |
| חיפוש/החלפה | `openFindReplace` ~11524 | Ctrl+F/H | ✔ keyboard (פתיחה בלבד) |
| **מחשבון מדעי (9 מצבים)** | `openCalculator` ~6709, `_setCalcMode` ~7249 | ר' `docs/SPEC-CALC.md` | ❌ |
| סימניות + ניווט | `initBookmarkNav` ~13836 | הוספה/ניווט/🗑 מחיקה | ❌ |

## 5. לשוניות-הקשר (חדש 2026-07-08) — ר' `docs/SPEC-CTX-TABS.md`
| יכולת | עוגן-קוד | התנהגות צפויה | כיסוי |
|---|---|---|---|
| 🖼️ עיצוב תמונה (`imgformat`) | `initCtxFormatTabs` ~18855, `_ctxFormatTabsUpdate` | מופיעה רק כשתמונה נבחרת; לא קופצת אוטומטית | ❌ |
| 🔷 עיצוב צורה (`shapeformat`) | שם | מופיעה רק כשצורה (לא-מחבר, לא-תמונה) נבחרת | ❌ |
| ביטול-בחירה → חזרה ל"בית" | `activateTab('home')` בתוך update | אם הלשונית-ההקשרית הייתה active | ❌ |

## 6. סרגל צף (`#ctxBar`) — 4 הקשרים
| הקשר | בונה | תוכן עיקרי | כיסוי |
|---|---|---|---|
| טקסט נבחר | `buildText` ~12344 | שורה-1 תו/גופן, שורה-2 פסקה, moreBtn עמוד-2 | ✔ home-ribbon (עקיף) |
| תמונה/אובייקט | `buildImage` ~12387 + `_addToolbar` ~9154 + `openObjMenu` ~9188 | גלישה/ריבוד/נעילה/שקיפות/🌗מסננים/✂️רקע/"עוד" | ✔ insert/free-objects (עקיף; פאנלי-עריכה ❌) |
| תיבת-טקסט | `buildTextbox` ~12444 | רקע/מסגרת/שכפל/נעל/מחק | ✔ insert (עקיף) |
| תא-טבלה / multi | `buildTable`/`buildTableMulti` | שורות/עמודות/צבע/מיזוג/מסגרת | ✔ insert (עקיף) |
| חוקים | `refreshCtx` ~13129, `initCtxBar` ~11731 | בדיוק 2 שורות; כפתור-עגול במרכז; pointerup לא click | — |
| תפריטי-▾ בסרגל-הראשי | insImageCaret/insShapeCaret/insTextboxCaret/insTableCaret | שיקוף פעולות ההקשר | ✔ ribbon-caret (3) |

## 6ב. תפריט קליק-ימני (`#rcMenu`) — ר' `docs/SPEC-RCMENU.md` (עודכן 2026-07-20)
| יכולת | עוגן | התנהגות | כיסוי |
|---|---|---|---|
| הצגה-לפי-ערך-מוסף | `initRightClick` (Grep) | בחירה/תא-טבלה/קישור → שלנו; **סמן-מכווץ+spellcheck → תפריט-הדפדפן** (איות!); `.tb-content` כן, תמונה/צורה לא | ✔ rcmenu (7) |
| פעולות-קישור | ענף `link` ב-contextmenu | פתח/העתק-כתובת/ערוך (חוסם `javascript:`)/הסר (unlink, שומר טקסט) | ✔ rcmenu |
| פעולות-טבלה | addRow/addCol/delRow/delCol + `window._mergeBlock`/`_splitCell` | שורה/עמודה/מיזוג-מותנה/פיצול-מותנה/מחק-טבלה | ✔ rcmenu (חלקי) |
| נגישות APG | `role=menu/menuitem/separator`, `rc-active`+`aria-activedescendant` | חצים/Home/End/Enter; **לא focus()** — שובר execCommand | ✔ rcmenu |
| מיקום RTL | חישוב-מיקום ב-contextmenu | קצה-ימני בסמן, גדל שמאלה; מקש-תפריט (0,0) → מלבן-הבחירה | ✔ rcmenu |

## 7. אובייקטים חופשיים — מנוע משותף
| יכולת | עוגן-קוד | התנהגות צפויה | כיסוי |
|---|---|---|---|
| גרירה+snap+גלילה-אוטומטית | `_makeDraggable` ~9212, `_snap` ~9030, `_edgeAutoScrollStart` ~9232 | delta/`_docZoom`; Alt מבטל snap | ✔ free-objects, zoom |
| clamp | `_clamp` ~8979 (`FREE_MARGIN_CM=1.0`), `_clampFloat` ~9562 | מעבר-חופשי-בין-דפים (§5 מעודכן); אופקי 1.0cm | ✔ free-objects (3 ממצאים by-design) |
| ידיות resize/rotate/move | `_addHandles` ~9060 (tabIndex+role+keydown) | 8 ידיות + סיבוב + ⠿; נגיש-מקלדת | ✔ free-objects (עכבר); מקלדת ❌ |
| קיצורי-מקלדת לאובייקט | `initFreeObjKeyShortcuts` ~13768 | חצים=1px, Shift=10px, Ctrl+D=שכפול | ✔ kbshortcuts (2) |
| ריבוד/שקיפות/נעילה | `_nextZ` ~10169, `.ctx-opacity` | | ✔ free-objects |
| סריאליזציה | `_serializeObj` ~9890 (כולל `imgOrigSrc`), `_deserializeFreeObjs` ~9956 | round-trip מלא | ✔ free-objects, storage |

## 8. לשונית פריסה (`data-ribbon="layout"`)
| יכולת | עוגן-קוד | כיסוי |
|---|---|---|
| כיוון RTL/LTR/חכם | `_firstStrongDir` ~15286 (תו-חזק-ראשון) | ✔ layout-ribbon (6) |
| רווח-פסקה לפני/אחרי | `#loSpaceBefore/After` | ✔ layout-ribbon |
| אוטו-עיצוב | `openAutoFormatPanel` ~15414, `myword2_autofmt` | ✔ layout-ribbon (dash/bold) |

## 9. לשונית כלים (`data-ribbon="tools"`)
| יכולת | עוגן-קוד | כיסוי |
|---|---|---|
| איות toggle | tlSpell | ❌ |
| סטטיסטיקה + יעד-מילים | `openStatsDialog` ~15603, `setGoal` ~15578, `#goalProgress` | ✔ tools-ribbon |
| הכתבה קולית | webkitSpeechRecognition (דורש https/localhost) | ❌ |
| הקראה (TTS) | `initSpeak` ~15842: 2 קריינים (`PERSONA_ORDER` ~15891 = ben/bat), 3 מסלולים: Azure→שרת-מקומי (`xttsUrl`, edge-tts :8021)→Web Speech; rate/pitch native | ✔ tools-ribbon (פנל בלבד); מסלולי-קול ❌ |
| תקן-שפה F9 | `KBD_EN2HE` ~16180 | ✔ tools-ribbon (f9) |
| קטעים שמורים | `openSnippetsPanel` ~15638 (esc() על שם — תוקן XSS) | ✔ tools-ribbon (save); XSS-guard ❌ |
| תוכן עניינים | `div[data-mwtoc]` | ✔ tools-ribbon (toc-build) |

## 10. לשונית תצוגה (`data-ribbon="view"`)
| יכולת | עוגן-קוד | כיסוי |
|---|---|---|
| ערכות-נושא: בהיר/כהה/לילה-קרח/נאון | `applyTheme` ~15216 (`#vwNight` ~4240, `#vwNeon` ~4243), `myword2_theme` | ✔ view-ribbon (dark/light); night/neon ❌ |
| דף-כהה opt-in | `applyPageDark` ~15236 (`#vwPageDark`) | ❌ |
| רקע-דף (לבן/קרם/תכלת/מותאם) | `applyPageBg` ~15353 | ✔ view-ribbon (cream) |
| מיקוד | `toggleFocusMode` ~15257 (Esc יוצא) | ✔ view-ribbon |
| שורת-סטטוס toggle | `#vwStatusBar` | ✔ view-ribbon |
| זום 50-200% | `applyZoom` ~13573 (`zoom`, לא transform) | ✔ zoom (12) |
| **סרגל-צד** | `initSidebar` ~18049 (`#mwSidebar`): פעולות-מהירות, מתאר-מסמך חי, 5 אחרונים, ⇄/✕, `myword2_sidebar_*` | ❌ |

## 11. עימוד, הדבקה, שמירה — ליבה
| יכולת | עוגן-קוד | כיסוי |
|---|---|---|
| עימוד A4 + GAP | `paginateBlocks` ~4585 (splitContainer, header 1.8/footer 1.6), `updatePagination` ~4746 (÷cycle) | ✔ page-rules (18) |
| מחטא-הדבקה | `initPasteSanitizer` ~13986, `_sanitizeStored` ~17797 | ✔ paste (10) |
| אחסון | IDB `mwDB` ~5406 + `myword2_docs`/`myword2_last` | ✔ storage (12) |

## 12. קיצורי-מקלדת (CLAUDE §13)
Ctrl+B/I/U/K/L/E/R/J/[/]/Z/Y/S/N/F/H/P, Ctrl+גלגלת, Tab, F9, Escape — ✔ keyboard (20);
חצים/Ctrl+D לאובייקט — ✔ kbshortcuts.

---

# פערי-כיסוי — המלצות לתרחישי-מרקוס חדשים (מדורג לפי סיכון)
> **לא להוסיף ל-scenarios.mjs בלי אימות-חי** (תהליך מרקוס §🆕). דירוג: 🔴 גבוה · 🟡 בינוני · 🟢 נמוך.

| # | פער | למה מסוכן | תרחיש מוצע |
|---|---|---|---|
| 🔴1 | **פאנלי עריכת-תמונה** (מסננים/הסרת-רקע/מסגרת) | משנים `img.src` בפועל (bake) — באג = אובדן-תמונה בלתי-הפיך; אפס כיסוי | filters: פתח→הזז מחוון→החל→ודא src משתנה ל-PNG ו-dataset נשמר; bg-remove: chroma על תמונת-2-צבעים→alpha=0; שחזר-מקורי מחזיר origSrc; round-trip סריאליזציה של imgOrigSrc |
| 🔴2 | **לשוניות-הקשר imgformat/shapeformat** | עוטפות את `_selectObj` — רגרסיה שם שוברת כל בחירת-אובייקט | בחר תמונה→לשונית מופיעה (hidden=false), קליק→רק ribbon אחד active; ביטול-בחירה→חזרה ל"בית"; מיזוג-צורות→לשונית-צורה נעלמת ולשונית-תמונה מופיעה (by-design) |
| 🔴3 | **מחשבון — 9 מצבים** | ~2500 שורות קוד ללא תרחיש אחד; הכנסה-למסמך נוגעת ב-editor | לכל מצב: פתח→חשב→"הכנס למסמך" ב-4 המצבים (תוצאה/ביטוי/מבחן/עברית)→ודא תוכן ב-editor + עימוד; graph→img עם alt; history-restore ב-Enter |
| 🔴4 | **ייצוא Word/HTML/שיתוף** | 5 תיקוני-אבטחה הוזרקו שם (titleEsc/BOM) בלי regression-test | שם-מסמך `<script>x</script>` → exportHTML/shareDoc/exportAndPrint מכילים טקסט-בורח בלבד; exportDocWord מתחיל ב-BOM אמיתי |
| 🟡5 | **XSS-guards בפנלים** (snippets/doc-properties) | תוקנו ידנית; אין תרחיש שמונע חזרה | שם-קטע/שם-מסמך עם payload → 0 אלמנטים חיים ב-DOM (דפוס docmgr-title-html-escaped הקיים) |
| 🟡6 | **doc-tabs edge-cases** | קיימים 5 תרחישים בסיסיים בלבד | סגירת לשונית-אחרונה; רענון משחזר `myword2_open_tabs`; שכפול במנהל מוסיף לשונית; מחיקת מסמך פתוח |
| 🟡7 | **מיזוג-צורות (Paper.js)** | פיצ'ר מורכב, fallback שקט ל-SVG-mask | 2 צורות (rect+ellipse)→unite→אובייקט-תמונה יחיד; exclude (XOR); fallback כש-paper לא טעון |
| 🟡8 | **TTS מסלולים + rate/pitch** | תוקן באג-אמת (prosody); רק פנל-UI מכוסה | יירוט-fetch: rate/pitch נשלחים לשרת; נפילה-אוטומטית לWeb Speech כששרת מת |
| 🟡9 | **נגישות-מקלדת לידיות** | הושקע רבות (tabIndex/keydown) — אין בדיקה | Tab לידית→Enter בוחר; ArrowUp/Down על tbl-move-handle מזיז טבלה |
| 🟢10 | **סרגל-צד + ערכת לילה-קרח/נאון** | UI opt-in; דורש viewport≥1300px | ❄️→data-theme=night+סיידבר; מתאר-מסמך מתעדכן; קיפול/צד |
| 🟢11 | סימניות, מאפייני-מסמך, שמור-בשם, autosave-toggle, דף-כהה, שחזור-קריסה, הכתבה, איות | פיצ'רים קטנים ללא כיסוי | smoke-tests קצרים |

**סיכום:** ~120 יכולות ממופות; ~30 ללא כל כיסוי-תרחיש (המרוכזות ב-11 הפערים למעלה).
