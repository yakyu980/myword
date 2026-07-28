// lib/probe.mjs — "השוליים הדמיוניים".
// הפונקציה הזו מורצת *בתוך הדפדפן* (page.evaluate). היא חייבת להיות עצמאית
// (בלי import/closure). היא בונה את רצועות העמוד החוקיות, ומאתרת כל אלמנט
// שנוחת בפער האסור או חוצה גבול עמוד בצורה לא חוקית.

export function probeFn(opts) {
  const tolCm = opts.tolCm ?? 0.1;        // סובלנות מדידה
  const PAGE_H_CM = 29.7;
  const GAP_CM = 1.5;
  const CYCLE_CM = PAGE_H_CM + GAP_CM;    // 31.2cm
  const editor = document.getElementById('editor');
  if (!editor) return { error: 'no-editor' };

  // כיול pxPerCm בדיוק כמו שהאפליקציה עושה (אלמנט 1cm)
  const t = document.createElement('div');
  t.style.cssText = 'position:absolute;height:1cm;width:1cm;visibility:hidden;';
  editor.appendChild(t);
  const ppc = t.getBoundingClientRect().height;
  t.remove();

  const cycle = CYCLE_CM * ppc;
  const pageH = PAGE_H_CM * ppc;
  const tol = tolCm * ppc;

  const eRect = editor.getBoundingClientRect();
  const editorTop = eRect.top;
  const editorH = editor.scrollHeight;
  // updatePagination() כבר דאגה להגדיר minHeight שמשקף שוברי עמוד ידניים —
  // לכן editorH (scrollHeight) כבר כולל את כל העמודים הנדרשים.
  const totalPages = Math.max(1, Math.ceil(editorH / cycle));

  const cm = (px) => +(px / ppc).toFixed(2);

  // בודק רצועת אלמנט [top,bottom] (px יחסית לראש העורך) מול חוקי העמוד
  function analyze(top, bottom) {
    const idxTop = Math.floor((top + tol) / cycle);
    const idxBot = Math.floor((bottom - tol) / cycle);
    const gapStart = idxTop * cycle + pageH;          // תחילת הפער של אותו עמוד
    const gapEnd = (idxTop + 1) * cycle;              // סוף הפער = ראש העמוד הבא
    const issues = [];

    // 1) חלק מהאלמנט יושב בתוך הפער השקוף (אסור — תוכן "נעלם")
    if (bottom > gapStart + tol && top < gapEnd - tol) {
      const overlap = Math.min(bottom, gapEnd) - Math.max(top, gapStart);
      issues.push({
        type: 'in-gap',
        gapBand: [cm(gapStart), cm(gapEnd)],
        overlapCm: cm(overlap),
      });
    }
    // 2) האלמנט חוצה גבול עמוד (top בעמוד N, bottom בעמוד N+1)
    if (idxBot > idxTop) {
      issues.push({ type: 'straddle', fromPage: idxTop + 1, toPage: idxBot + 1 });
    }
    return { page: idxTop + 1, topCm: cm(top), bottomCm: cm(bottom), issues };
  }

  const findings = [];

  // (א) בלוקים זורמים — ילדים ישירים של העורך (לא free-obj)
  for (const child of editor.children) {
    if (child.classList && child.classList.contains('free-obj')) continue;
    const r = child.getBoundingClientRect();
    if (r.height < 1) continue;
    const top = r.top - editorTop;
    const bottom = r.bottom - editorTop;
    const a = analyze(top, bottom);
    if (a.issues.length) {
      const tag = (child.tagName || '').toLowerCase();
      const breakable = !['img', 'table', 'figure', 'blockquote', 'pre'].includes(tag);
      findings.push({
        kind: 'block', tag, breakable,
        text: (child.textContent || '').trim().slice(0, 40),
        ...a,
      });
    }
  }

  // (ב) אובייקטים חופשיים — חייבים להיות כלואים בעמוד אחד (_clamp)
  for (const obj of editor.querySelectorAll('.free-obj')) {
    const r = obj.getBoundingClientRect();
    const top = r.top - editorTop;
    const bottom = r.bottom - editorTop;
    const a = analyze(top, bottom);
    if (a.issues.length) {
      findings.push({
        kind: 'free-obj',
        objType: obj.className,
        imgMode: obj.getAttribute('data-img-mode') || null,
        ...a,
      });
    }
  }

  // מדידת תמונות inline מול חוק 8 (max-height 24.7cm)
  const oversizeImgs = [];
  for (const img of editor.querySelectorAll('img')) {
    const h = img.getBoundingClientRect().height;
    if (h > 24.7 * ppc + tol) oversizeImgs.push({ heightCm: cm(h) });
  }

  return {
    pxPerCm: +ppc.toFixed(3),
    editorHeightCm: cm(editorH),
    totalPages,
    findings,
    oversizeImgs,
  };
}
