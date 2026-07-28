/* מקור-אמת יחיד: MyWord-v2.html שבשורש הפרויקט.
   הסקריפט מעתיק אותו ל-renderer/ לפני כל הרצה/אריזה, כדי שלא ייווצרו שתי גרסאות. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'MyWord-v2.html');
const DST = path.resolve(__dirname, 'renderer', 'index.html');

if (!fs.existsSync(SRC)) {
  console.error('✗ לא נמצא MyWord-v2.html בשורש הפרויקט:', SRC);
  process.exit(1);
}
fs.mkdirSync(path.dirname(DST), { recursive: true });
fs.copyFileSync(SRC, DST);
const kb = (fs.statSync(DST).size / 1024).toFixed(0);
console.log(`✓ סונכרן renderer/index.html (${kb}KB) מ-MyWord-v2.html`);
