import { useProductEnrichment } from '../lib/useProductEnrichment';
import DeptIcon from './DeptIcon';

/** תמונה-אמיתית של מוצר (לפי ברקוד-אמיתי, מ-Open Food Facts) אם קיימת — אחרת אייקון-מחלקה כרגיל. */
export default function ProductPhoto({ product, dept, className = '' }) {
  const enrichment = useProductEnrichment(product?.barcode, !!product?.hasRealBarcode);
  if (enrichment?.imageUrl) {
    return (
      <img
        className={'product-photo ' + className}
        src={enrichment.imageUrl}
        alt={enrichment.name || product.name}
        loading="lazy"
      />
    );
  }
  return <DeptIcon dept={dept} />;
}
