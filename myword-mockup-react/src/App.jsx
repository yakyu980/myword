import { useState, useCallback } from 'react';
import TitleBlock from './components/TitleBlock.jsx';
import TabBar from './components/TabBar.jsx';
import Ribbon from './components/Ribbon.jsx';
import Sidebar from './components/Sidebar.jsx';
import DocumentCanvas from './components/DocumentCanvas.jsx';
import StatusToast from './components/StatusToast.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [ribbonOpen, setRibbonOpen] = useState(true);
  const [lastAction, setLastAction] = useState(null);

  // כל כפתור בממשק מדווח לכאן — זה מה שהופך "תמונה" לממשק חי
  const logAction = useCallback((label) => {
    setLastAction({ label, at: Date.now() });
  }, []);

  return (
    <div className="min-h-screen text-inkmain overflow-hidden relative" dir="rtl">
      <TitleBlock />
      <TabBar active={activeTab} onSelect={(id, label) => { setActiveTab(id); logAction(`לשונית: ${label}`); }} />
      <Ribbon open={ribbonOpen} onToggle={() => { setRibbonOpen(o => !o); logAction(ribbonOpen ? 'קיפול סרגל' : 'פתיחת סרגל'); }} activeTab={activeTab} onAction={logAction} />
      {/* flex-row-reverse ב-RTL: הסרגל (הילד הראשון) נצמד לשמאל כמו בתמונת המקור */}
      <div className="flex flex-row-reverse items-start gap-6 px-4 mt-4">
        <Sidebar onAction={logAction} />
        <DocumentCanvas onAction={logAction} />
      </div>
      <div className="fixed bottom-6 right-8 text-ice-400/60 italic text-3xl select-none" style={{ fontFamily: 'Brush Script MT, cursive' }}>
        Alice
      </div>
      <StatusToast action={lastAction} />
    </div>
  );
}
