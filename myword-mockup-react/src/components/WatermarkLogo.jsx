// הלוגו מהתמונה: הקסגון + W + נוצה עם ספרות בינאריות + יהלום + myWord
export default function WatermarkLogo({ size = 260 }) {
  return (
    <svg viewBox="0 0 200 230" width={size} height={size * 1.15} aria-label="myWord logo">
      <polygon points="100,6 180,52 180,150 100,224 20,150 20,52" fill="none" stroke="#9FC6E8" strokeWidth="2" />
      <text x="100" y="125" textAnchor="middle" fontSize="92" fontWeight="900" fontFamily="Arial, sans-serif" fill="#B9D8F0">W</text>
      <path d="M138 35 C120 48 103 72 97 103 C128 92 148 68 152 40 Z" fill="none" stroke="#9FC6E8" strokeWidth="2" />
      <line x1="99" y1="101" x2="150" y2="40" stroke="#9FC6E8" strokeWidth="1.5" />
      <line x1="108" y1="90" x2="118" y2="78" stroke="#9FC6E8" strokeWidth="1" />
      <line x1="118" y1="78" x2="128" y2="66" stroke="#9FC6E8" strokeWidth="1" />
      <line x1="128" y1="66" x2="138" y2="54" stroke="#9FC6E8" strokeWidth="1" />
      <rect x="94" y="104" width="7" height="7" fill="#9FC6E8" transform="rotate(45 97.5 107.5)" />
      <text x="150" y="55" fontSize="9" fill="#9FC6E8" fontFamily="monospace">01</text>
      <text x="155" y="68" fontSize="9" fill="#9FC6E8" fontFamily="monospace">10</text>
      <text x="100" y="195" textAnchor="middle" fontSize="28" fontWeight="800" fontFamily="Georgia, serif" fill="#9FC6E8">myWord</text>
    </svg>
  );
}
