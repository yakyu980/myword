// העשרת-מוצר אמיתית: שם-רשמי + תמונה-אמיתית לפי ברקוד-אמיתי, מ-Open
// Food Facts (ר' openFoodFacts.js — כבר קיים, נבנה לסריקת-ברקוד).
// הקטלוג שלנו (storeData.js) הוא בדוי-ברובו (37 פריטי-דוגמה) — רק
// מוצרים עם ברקוד-אמיתי-מאומת (לא הרצף המדומה 729...) מקבלים כאן
// תמונה/שם-רשמי. אין המצאת-תמונות: בלי ברקוד-אמיתי או בלי-רשת,
// פשוט אין תמונה — DeptIcon (אייקון-מחלקה) הוא ה-fallback הכנה.
// תוצאה נשמרת ב-localStorage כדי לא לפנות לרשת בכל רינדור.

import { lookupBarcodeExternal } from './openFoodFacts';

const CACHE_KEY = 'supernav_product_enrichment_v1';

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function persistCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* אחסון מלא/חסום — מתעלמים, פשוט לא נשמר */
  }
}

let cache = loadCache();
const listeners = new Set();
const inFlight = new Set();

function update(next) {
  cache = next;
  persistCache(cache);
  listeners.forEach((fn) => fn());
}

export function getEnrichment(barcode) {
  return cache[barcode] || null;
}

export function subscribeEnrichment(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** מנסה להעשיר ברקוד נתון — שקוף לחלוטין אם אין רשת/לא נמצא (לא זורק, לא חוסם UI). */
export async function ensureEnrichment(barcode) {
  if (!barcode || cache[barcode] || inFlight.has(barcode)) return;
  inFlight.add(barcode);
  try {
    const result = await lookupBarcodeExternal(barcode);
    if (result) {
      update({ ...cache, [barcode]: { name: result.name, brand: result.brand, imageUrl: result.imageUrl } });
    } else {
      update({ ...cache, [barcode]: { notFound: true } });
    }
  } catch {
    /* אין רשת/שירות-לא-זמין — לא שומרים כלום, ננסה שוב בפעם הבאה */
  } finally {
    inFlight.delete(barcode);
  }
}
