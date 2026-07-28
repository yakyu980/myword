// qa/hooks/on-save.mjs — PostToolUse hook.
// רץ אחרי כל Edit/Write; אם הקובץ שנערך הוא MyWord-v2.html → מריץ sync-buttons.mjs
// כדי שכל כפתור חדש יקבל סטאב במפרט אוטומטית. תמיד יוצא 0 (לא חוסם).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch { /* אין stdin */ }

let filePath = '';
try {
  const data = JSON.parse(raw || '{}');
  filePath = (data.tool_input && data.tool_input.file_path) || data.file_path || '';
} catch { /* JSON לא תקין — דלג */ }

if (!/MyWord-v2\.html$/i.test(String(filePath).replace(/\\/g, '/'))) process.exit(0);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sync = path.resolve(__dirname, '..', 'sync-buttons.mjs');
const r = spawnSync(process.execPath, [sync], { encoding: 'utf8' });
if (r.stdout) process.stdout.write('[sync-buttons] ' + r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(0);
