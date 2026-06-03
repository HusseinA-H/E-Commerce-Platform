import { Product } from '../types/index';

export function mapBackendProductToFrontend(backendProd: any): Product {
  if (!backendProd || typeof backendProd !== 'object') return {} as Product;

  const normalizeImageUrl = (url: any): string => {
    if (!url || typeof url !== 'string') return '';
    return url
      .replace('/products/tops/', '/products/Tops%20%26%20Tees/')
      .replace('/products/bottoms/', '/products/Bottoms%20%26%20Joggers/')
      .replace('/products/outerwear/', '/products/Outerwear/')
      .replace('/products/accessories/', '/products/Accessories/')
      .replace('/products/footwear/', '/products/Footwear/');
  };

  const COLOR_TOKENS = ['black', 'white'];
  const isColorVariantImage = (image: any): boolean => {
    if (!image || typeof image !== 'string') return false;
    const lower = image.toLowerCase();
    return COLOR_TOKENS.some((token) => lower.includes(`-${token}-`));
  };
  const isBlackVariantImage = (image: any): boolean => {
    if (!image || typeof image !== 'string') return false;
    const lower = image.toLowerCase();
    if (lower.includes('-black-')) return true;
    return !isColorVariantImage(image);
  };

  const isTop = (backendProd.category?.slug || 'tops') === 'tops';
  const imageUrls: string[] = (backendProd.images || [])
    .map((img: any) => img && normalizeImageUrl(img.url))
    .filter((url: string) => !!url);
    
  let orderedImages = imageUrls;
  if (isTop) {
    const blackFirst = imageUrls.filter((img: string) => isBlackVariantImage(img));
    const rest = imageUrls.filter((img: string) => !blackFirst.includes(img));
    orderedImages = [...blackFirst, ...rest];
  }

  // Extract special specs from backend database specifications array safely
  const specs = Array.isArray(backendProd.specs) ? backendProd.specs : [];
  
  const fitSpecObj = specs.find((s: any) => s && typeof s.key === 'string' && s.key.toLowerCase() === 'fit');
  const fitSpec = fitSpecObj ? fitSpecObj.value : '';

  const careSpecObj = specs.find((s: any) => s && typeof s.key === 'string' && s.key.toLowerCase() === 'care');
  const careSpec = careSpecObj ? careSpecObj.value : '';

  const techTags = specs
    .filter((s: any) => s && typeof s.key === 'string' && (s.key.toLowerCase() === 'tech' || s.key.toLowerCase() === 'techtags'))
    .map((s: any) => s.value)
    .filter((val: any) => val !== undefined && val !== null);
  
  // Format regular product specs
  const regularSpecs = specs
    .filter((s: any) => s && typeof s.key === 'string' && !['fit', 'care', 'tech', 'techtags'].includes(s.key.toLowerCase()))
    .map((s: any) => `${s.key}: ${s.value || ''}`);

  const sizes = (Array.isArray(backendProd.sizes) ? backendProd.sizes : [])
    .map((sz: any) => sz && typeof sz.size === 'string' ? sz.size : '')
    .filter((size: string) => !!size);

  const colors = (Array.isArray(backendProd.colors) ? backendProd.colors : [])
    .map((c: any) => c && typeof c.color === 'string' ? c.color : '')
    .filter((color: string) => !!color);

  return {
    id: backendProd.id || '',
    slug: backendProd.slug || backendProd.id || '',
    name: backendProd.name || 'Unnamed Product',
    category: (backendProd.category?.slug || 'tops') as any,
    price: typeof backendProd.price === 'number' ? backendProd.price : 0,
    description: backendProd.description || '',
    images: orderedImages,
    specs: regularSpecs,
    fit: fitSpec || 'Athletic fit',
    care: careSpec || 'Machine wash cold',
    sizes,
    colors,
    techTags: techTags.length > 0 ? techTags : ['CARBON-CORE™'],
    isNew: !!backendProd.isNew,
    isLimited: !!backendProd.isLimited,
    compareAtPrice: typeof backendProd.compareAtPrice === 'number' ? backendProd.compareAtPrice : undefined,
    stockQuantity: typeof backendProd.stockQuantity === 'number' ? backendProd.stockQuantity : backendProd.stock ?? 0,
    reservedStock: backendProd.reservedStock ?? 0,
    lowStockThreshold: backendProd.lowStockThreshold ?? 5,
    sku: backendProd.sku ?? undefined,
    barcode: backendProd.barcode ?? undefined,
    inventoryStatus: backendProd.inventoryStatus ?? 'IN_STOCK',
    deletedAt: backendProd.deletedAt ?? undefined,
    isFeatured: !!backendProd.isFeatured,
  };
}
