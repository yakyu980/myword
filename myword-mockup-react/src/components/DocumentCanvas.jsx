import WatermarkLogo from './WatermarkLogo.jsx';

function CapsuleField({ kind, onAction }) {
  return (
    <div className="relative mx-8 mt-4">
      <span className="absolute -top-2.5 start-2 text-[10px] bg-page px-1.5 py-0.5 rounded border border-ice-500/40 text-inksoft z-10">
        {kind}
      </span>
      <div className="h-9 rounded-xl border-[1.5px] border-ice-500/45 bg-white/70 flex items-center justify-end shadow-sm">
        <div className="flex flex-col me-2 text-inksoft leading-none">
          {/* stopPropagation: בלעדיו הלחיצה מבעבעת ל-onClick של הדף ודורסת את הפעולה */}
          <button onClick={(e) => { e.stopPropagation(); onAction(`${kind}: חץ מעלה`); }} className="hover:text-ice-500 text-[10px]" title="למעלה">⌃</button>
          <button onClick={(e) => { e.stopPropagation(); onAction(`${kind}: חץ מטה`); }} className="hover:text-ice-500 text-[10px]" title="למטה">⌄</button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentCanvas({ onAction }) {
  return (
    <main className="flex-1 flex justify-center pb-8">
      <div
        className="bg-page rounded-md shadow-2xl w-[560px] min-h-[640px] relative flex flex-col"
        role="document"
        aria-label="דף A4"
        onClick={() => onAction('לחיצה על הדף (אזור כתיבה)')}
      >
        <CapsuleField kind="header" onAction={onAction} />
        <CapsuleField kind="footer" onAction={onAction} />

        <button
          className="mx-auto my-auto opacity-80 hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onAction('לוגו myWord'); }}
          title="myWord"
        >
          <WatermarkLogo size={280} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onAction('footer ✕ — סגירת עריכת footer'); }}
          className="absolute bottom-6 end-8 text-[11px] text-inksoft bg-white/80 border-[1.5px] border-ice-500/50 rounded-full px-3 py-1 hover:shadow-glow"
        >
          footer&nbsp;&nbsp;✕
        </button>
      </div>
    </main>
  );
}
