const TABS = [
  { id: 'file', label: 'קובץ', icon: '📁' },
  { id: 'home', label: 'בית' },
  { id: 'insert', label: 'הוספה' },
];

function Tab({ tab, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(tab.id, tab.label)}
      className={
        'px-5 py-1.5 rounded-lg text-sm transition-all ' +
        (active
          ? 'bg-ice-500/85 text-white font-bold shadow-glow'
          : 'text-inksoft hover:text-ice-300 hover:bg-ice-400/10')
      }
    >
      {tab.icon ? tab.icon + ' ' : ''}{tab.label}
    </button>
  );
}

export default function TabBar({ active, onSelect }) {
  return (
    <nav className="glass rounded-xl flex gap-1 p-1 absolute top-4 right-6" aria-label="לשוניות">
      {TABS.map(t => (
        <Tab key={t.id} tab={t} active={active === t.id} onSelect={onSelect} />
      ))}
    </nav>
  );
}
