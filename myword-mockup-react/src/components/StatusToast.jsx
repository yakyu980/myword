import { useEffect, useState } from 'react';

// טוסט סטטוס: מציג איזו פעולה נלחצה — ההוכחה שכל אלמנט הוא כפתור חי
export default function StatusToast({ action }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!action) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [action]);

  if (!action) return null;
  return (
    <div
      className={
        'fixed bottom-6 right-1/2 translate-x-1/2 glass rounded-full px-5 py-2 text-sm text-ice-300 shadow-glowStrong transition-opacity duration-300 ' +
        (visible ? 'opacity-100' : 'opacity-0 pointer-events-none')
      }
      role="status"
      data-testid="status-toast"
    >
      ⚡ {action.label}
    </div>
  );
}
