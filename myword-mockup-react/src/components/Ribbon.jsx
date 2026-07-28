// אריחי הריבון — פר-לשונית, כמו בתמונה (לשונית "בית" = הסט המצולם)
const RIBBON_SETS = {
  file: [
    ['🆕', 'חדש'], ['📂', 'פתח'], ['💾', 'שמור'], ['📄', 'יצוא PDF'], ['🖨', 'הדפסה'], ['🔗', 'שיתוף'],
  ],
  home: [
    ['🆕', 'חדש'], ['📂', 'פתח'], ['💾', 'שמור'], ['🗂', 'קבצים'],
    ['↺', 'בטל'], ['↻', 'חזור'],
    ['T', 'סגנון'], ['H', 'כותרת'], ['☰', 'רשימות'],
    ['🖼', 'תמונות'], ['🎨', 'עיצוב'], ['⬡', 'צורה'],
    ['🅰', 'טקסט 3D'], ['✒', 'טקסט מעוצב'], ['🧭', 'ניווט'], ['♒', 'וריאציות'],
  ],
  insert: [
    ['🖼', 'תמונה'], ['⊞', 'טבלה'], ['⬡', 'צורות'], ['🔗', 'קישור'], ['🗒', 'תיבת טקסט'], ['✏', 'ציור'],
  ],
};

function RibbonButton({ glyph, label, onAction }) {
  return (
    <button
      onClick={() => onAction(`ריבון: ${label}`)}
      className="flex flex-col items-center gap-1 group"
      title={label}
    >
      <span className="glass-tile w-11 h-11 rounded-[10px] flex items-center justify-center text-ice-300 text-base transition-all">
        {glyph}
      </span>
      <span className="text-[9px] text-inksoft group-hover:text-ice-300">{label}</span>
    </button>
  );
}

export default function Ribbon({ open, onToggle, activeTab, onAction }) {
  const set = RIBBON_SETS[activeTab] || RIBBON_SETS.home;
  return (
    <section className="glass rounded-2xl mx-4 mt-14 px-4 py-2.5 flex items-center gap-6 min-h-[64px]" aria-label="סרגל כלים">
      <button
        onClick={onToggle}
        className="text-inksoft hover:text-ice-300 text-lg px-1 shrink-0"
        title={open ? 'קפל סרגל' : 'פתח סרגל'}
      >
        {open ? '‹' : '›'}
      </button>
      {open && (
        <div className="flex items-start gap-6 overflow-x-auto flex-1">
          {set.map(([glyph, label]) => (
            <RibbonButton key={label} glyph={glyph} label={label} onAction={onAction} />
          ))}
        </div>
      )}
      <button
        onClick={() => onAction('חתימת Alice')}
        className="text-ice-400/60 italic text-xl shrink-0 hover:text-ice-300"
        style={{ fontFamily: 'Brush Script MT, cursive' }}
        title="Alice"
      >
        Alice
      </button>
    </section>
  );
}
