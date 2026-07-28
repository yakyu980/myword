// lib/fuzz.mjs — מצב שילובים רנדומליים ("בודק שילובים חדשים כל פעם").
// PRNG עם seed (mulberry32) רץ ב-Node → רצף הצעדים דטרמיניסטי ושחזיר.
// כל סבב = רצף אקראי של פעולות-כפתור; אחרי הסבב מרקוס מריץ probe (חוקי הדף
// חייבים להחזיק) + בדיקת שגיאות console. seed זהה ⇒ תוצאות זהות.

// PRNG דטרמיניסטי
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const rint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// פעולות משוקללות — פעולות מורכבות (תמונה/גופן/מצב) מופיעות יותר.
const CMDS = ['bold', 'italic', 'underline', 'strikeThrough',
  'justifyRight', 'justifyCenter', 'justifyLeft', 'justifyFull',
  'insertOrderedList', 'insertUnorderedList', 'superscript', 'subscript'];
const FONTS = [8, 12, 18, 24, 36, 48, 72];
const SAFE_CLICKS = ['#insHR', '#insPageBreak', '#btnAddPage', '#btnDelPage', '#btnIndent', '#btnOutdent'];
const IMG_MODES = ['free', 'above-text', 'below-text', 'float-right', 'float-left', 'inline', 'behind'];

function randomStep(rng) {
  // משקלים: text 2, cmd 3, font 2, click 1, img 2, imgmode 1
  const roll = rng();
  if (roll < 0.18) return { kind: 'type', text: 'מילה '.repeat(rint(rng, 5, 40)) };
  if (roll < 0.45) return { kind: 'cmd', cmd: pick(rng, CMDS) };
  if (roll < 0.63) return { kind: 'font', pt: pick(rng, FONTS) };
  if (roll < 0.73) return { kind: 'click', selector: pick(rng, SAFE_CLICKS) };
  if (roll < 0.91) return { kind: 'img', left: rint(rng, 1, 12), top: rint(rng, 2, 60), w: rint(rng, 3, 8), h: rint(rng, 2, 6), mode: pick(rng, IMG_MODES) };
  return { kind: 'imgmode', mode: pick(rng, IMG_MODES) };
}

// בונה count סבבים; כל סבב מתחיל בטקסט-בסיס ואז 3–8 צעדים אקראיים.
export function buildFuzzRounds(seed, count) {
  const rng = mulberry32(seed);
  const rounds = [];
  for (let i = 0; i < count; i++) {
    const steps = [{ kind: 'type', text: 'בסיס '.repeat(rint(rng, 10, 40)) }];
    const n = rint(rng, 3, 8);
    for (let j = 0; j < n; j++) steps.push(randomStep(rng));
    rounds.push({
      id: `fuzz-${i + 1}`,
      suite: 'fuzz',
      name: `שילוב אקראי ${i + 1} (seed ${seed})`,
      rule: 'FUZZ',
      _fuzz: { steps },
      setup: () => {}, // לא בשימוש (מטופל דרך FUZZ_APPLY)
    });
  }
  return rounds;
}

// פונקציית הביצוע בדפדפן — מקבלת { steps } ומחילה אותם על העורך. ללא closure.
export const FUZZ_APPLY = (round) => {
  window.__reset();
  const editor = document.getElementById('editor');
  for (const s of round.steps) {
    try {
      if (s.kind === 'type') { editor.focus(); document.execCommand('insertText', false, s.text); }
      else if (s.kind === 'cmd') { window.__selectAll(); document.execCommand(s.cmd); }
      else if (s.kind === 'font') { window.__selectAll(); window.__applyFontSize(s.pt); }
      else if (s.kind === 'click') { const el = document.querySelector(s.selector); if (el) el.click(); }
      else if (s.kind === 'img') {
        const o = window.__freeImg(s.left, s.top, s.w, s.h, s.mode);
        // מחיל את ה-clamp האמיתי של האפליקציה (כמו אחרי הצבה/גרירה) — כך
        // שממצא "אובייקט בפער" משמעו שהכליאה באמת נכשלה, לא ארטיפקט של ההזרקה.
        // float-left/right נכלאים ע"י _clampFloat, לא _clamp — האחרון עושה return
        // מוקדם עבורם בכוונה (CLAUDE.md §5). מנתבים לכולא הנכון כפי שהמוצר עושה
        // (_setImgMode / גרירה), אחרת float מוזרק בקואורדינטה אקראית לעולם לא נכלא.
        if (o) {
          const isFloat = (s.mode === 'float-left' || s.mode === 'float-right');
          if (isFloat && typeof window._clampFloat === 'function') { try { window._clampFloat(o); } catch (e) {} }
          else if (typeof window._clamp === 'function') { try { window._clamp(o); } catch (e) {} }
        }
      }
      else if (s.kind === 'imgmode') {
        const objs = document.querySelectorAll('.free-obj');
        const o = objs[objs.length - 1];
        if (o) window.__setImgMode(o, s.mode);
      }
    } catch (e) { /* שגיאות נתפסות ע"י מאזין ה-console של מרקוס */ }
  }
};
