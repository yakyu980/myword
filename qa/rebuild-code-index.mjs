// rebuild-code-index.mjs — מעדכן את מספרי השורות ב-docs/CODE-INDEX.md מול הקוד בפועל.
// שימוש: node rebuild-code-index.mjs
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'MyWord-v2.html'), 'utf8').split('\n');
const idxPath = join(root, 'docs', 'CODE-INDEX.md');
const md = readFileSync(idxPath, 'utf8').split('\n');

// אינדקס הצהרות פונקציה: שם → [שורות]
const decl = new Map();
html.forEach((line, i) => {
  let m;
  const re = /(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function|\()|window\.([A-Za-z_$][\w$]*)\s*=\s*function)/g;
  while ((m = re.exec(line))) {
    const name = m[1] || m[2] || m[3];
    if (!decl.has(name)) decl.set(name, []);
    decl.get(name).push(i + 1);
  }
});

let updated = 0, missing = [];
const out = md.map(line => {
  // שורת טבלה: | `name(...)` | start | end | desc |
  const m = line.match(/^\|\s*`([A-Za-z_$][\w$]*)[^`]*`(?:\s*\(v2\))?\s*\|\s*~?(\d+)\s*\|\s*~?(\d+)\s*\|(.*)\|\s*$/);
  if (!m) return line;
  const [, name, oldStart, oldEnd, desc] = m;
  const isV2 = line.includes('(v2)');
  const lines = decl.get(name) || [];
  if (!lines.length) { missing.push(name); return line; }
  // (v2) = ההצהרה השנייה (window.x = function); אחרת הראשונה
  const start = isV2 && lines.length > 1 ? lines[lines.length - 1] : lines[0];
  const span = parseInt(oldEnd) - parseInt(oldStart);
  const end = span > 0 && span < 5000 ? start + span : start + 40;
  updated++;
  const label = line.match(/^\|\s*(`[^`]+`(?:\s*\(v2\))?)\s*\|/)[1];
  return `| ${label} | ${start} | ~${end} | ${desc.trim()} |`;
});

writeFileSync(idxPath, out.join('\n'), 'utf8');
console.log(`updated: ${updated} rows; not found: ${missing.join(', ') || 'none'}`);
