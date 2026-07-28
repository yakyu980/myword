const QUICK_ACTIONS = [
  ['🆕', 'חדש'],
  ['📂', 'פתח'],
  ['💾', 'שמור'],
  ['📄', 'יצוא (A4 PDF)'],
];

const OUTLINE = [
  { icon: '≡', label: 'מבוא' },
  { icon: '📖', label: 'פרק 1', expandable: true },
  { icon: '☑', label: 'סיכום' },
];

function QuickAction({ icon, label, onAction }) {
  return (
    <button
      onClick={() => onAction(`סרגל-צד: ${label}`)}
      className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-ice-400/10 transition-colors text-start"
    >
      <span className="w-7 h-7 rounded-full bg-ice-500/50 shadow-glow flex items-center justify-center text-xs">
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function OutlineItem({ icon, label, expandable, onAction }) {
  return (
    <button
      onClick={() => onAction(`מתאר: ${label}`)}
      className="flex items-center justify-between w-full ps-5 pe-3 py-1 rounded-md hover:bg-ice-400/10 text-sm text-start"
    >
      <span>{icon} {label}</span>
      {expandable && <span className="text-inksoft text-xs">›</span>}
    </button>
  );
}

function CircuitDecor() {
  return (
    <svg viewBox="0 0 160 150" className="w-full mt-auto opacity-40" aria-hidden="true">
      <g fill="none" stroke="#9FC6E8" strokeWidth="1.5">
        <path d="M20 10 H80 V50 H40 V95" />
        <path d="M100 25 H145 V105" />
        <path d="M10 95 H130" />
        <rect x="62" y="100" width="36" height="36" rx="5" />
        <rect x="73" y="111" width="14" height="14" rx="2" fill="#9FC6E8" fillOpacity="0.35" />
      </g>
      <g fill="#9FC6E8">
        <circle cx="20" cy="10" r="2.5" /><circle cx="145" cy="105" r="2.5" /><circle cx="10" cy="95" r="2.5" />
      </g>
    </svg>
  );
}

export default function Sidebar({ onAction }) {
  return (
    <aside className="glass rounded-2xl w-[200px] shrink-0 p-4 flex flex-col gap-1 self-stretch min-h-[640px]" aria-label="תפריט ניווט">
      <div className="flex items-center gap-2 pb-3">
        <span className="glass-tile w-9 h-9 rounded-lg flex items-center justify-center text-ice-300">✎</span>
        <h2 className="font-bold text-sm">תפריט ניווט</h2>
      </div>

      {QUICK_ACTIONS.map(([icon, label]) => (
        <QuickAction key={label} icon={icon} label={label} onAction={onAction} />
      ))}

      <hr className="border-ice-400/25 my-3" />

      <button
        onClick={() => onAction('כלי כתיבה')}
        className="w-full rounded-lg px-3 py-2 text-sm font-bold text-start bg-ice-500/25 border border-ice-400/50 shadow-glow"
      >
        ✎ כלי כתיבה
      </button>

      <div className="text-inksoft text-xs font-bold mt-4 mb-1 px-1 border-b border-ice-400/20 pb-1.5">
        ≡ מתאר מסמך
      </div>
      {OUTLINE.map(item => (
        <OutlineItem key={item.label} {...item} onAction={onAction} />
      ))}

      <CircuitDecor />
    </aside>
  );
}
