/* מייצר build/icon.ico ללא תלויות חיצוניות.
   ICO מודרני (Vista+) יכול להכיל PNG ישירות, ו-PNG אפשר לבנות ביד עם zlib. */
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IND = [79, 107, 237];      // אינדיגו המותג #4F6BED
const IND_DK = [58, 82, 200];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function drawPNG(S) {
  const px = Buffer.alloc(S * S * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const R = Math.round(S * 0.20);                 // רדיוס פינה
  const inRounded = (x, y, x0, y0, x1, y1, rad) => {
    if (x < x0 || y < y0 || x > x1 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + rad), x1 - rad);
    const cy = Math.min(Math.max(y, y0 + rad), y1 - rad);
    return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inRounded(x, y, 0, 0, S - 1, S - 1, R)) { set(x, y, 0, 0, 0, 0); continue; }
      const t = y / S;                             // גרדיאנט אנכי עדין
      set(x, y,
        Math.round(IND[0] + (IND_DK[0] - IND[0]) * t),
        Math.round(IND[1] + (IND_DK[1] - IND[1]) * t),
        Math.round(IND[2] + (IND_DK[2] - IND[2]) * t));
    }
  }
  /* דף לבן במרכז */
  const pw = Math.round(S * 0.46), ph = Math.round(S * 0.60);
  const px0 = Math.round((S - pw) / 2), py0 = Math.round((S - ph) / 2);
  const fold = Math.round(pw * 0.30);
  for (let y = py0; y < py0 + ph; y++) {
    for (let x = px0; x < px0 + pw; x++) {
      const rx = x - px0, ry = y - py0;
      if (ry < fold && rx > pw - fold - 1 && (rx - (pw - fold - 1)) > (fold - ry)) continue; // פינה מקופלת
      if (!inRounded(x, y, px0, py0, px0 + pw - 1, py0 + ph - 1, Math.round(S * 0.03))) continue;
      set(x, y, 255, 255, 255);
    }
  }
  /* שורות טקסט אפורות */
  const lh = Math.round(ph * 0.085), gap = Math.round(ph * 0.075);
  let ly = py0 + Math.round(ph * 0.42);
  for (let i = 0; i < 4; i++) {
    const wRatio = i === 3 ? 0.52 : 0.74;
    const lw = Math.round(pw * wRatio);
    const lx = px0 + Math.round((pw - Math.round(pw * 0.74)) / 2);
    for (let y = ly; y < ly + lh; y++)
      for (let x = lx; x < lx + lw; x++) set(x, y, 148, 163, 184);
    ly += lh + gap;
  }

  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map(drawPNG);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = [];
sizes.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s >= 256 ? 0 : s; e[1] = s >= 256 ? 0 : s;
  e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
});
const ico = Buffer.concat([header, ...entries, ...pngs]);
const out = path.join(__dirname, 'build', 'icon.ico');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ico);
fs.writeFileSync(path.join(__dirname, 'build', 'icon-256.png'), pngs[sizes.indexOf(256)]);
fs.writeFileSync(path.join(__dirname, 'build', 'icon.png'), drawPNG(512));   // mac/linux דורשים 512+
console.log(`✓ נוצר icon.ico (${sizes.length} גדלים, ${(ico.length / 1024).toFixed(0)}KB)`);
