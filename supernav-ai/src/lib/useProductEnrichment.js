import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { getEnrichment, subscribeEnrichment, ensureEnrichment } from './productEnrichment';

/**
 * מחזיר {name,brand,imageUrl} אמיתיים אם קיימים (מ-Open Food Facts), אחרת null.
 * `enabled=false` (ברירת-מחדל למוצר בלי ברקוד-אמיתי-מסומן, ר' storeData.js
 * hasRealBarcode) מדלג לגמרי על הפנייה-לרשת — לא מנסים להעשיר כל אחד
 * מ-37 מוצרי-הדוגמה עם ברקוד-מדומה.
 */
export function useProductEnrichment(barcode, enabled = true) {
  const enrichment = useSyncExternalStore(
    subscribeEnrichment,
    () => (enabled ? getEnrichment(barcode) : null),
    () => null
  );

  useEffect(() => {
    if (enabled) ensureEnrichment(barcode);
  }, [barcode, enabled]);

  return enrichment && !enrichment.notFound ? enrichment : null;
}
