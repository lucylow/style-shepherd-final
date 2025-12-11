/**
 * Product Index Search Utility
 * 
 * Simple product filtering: accepts products array and filters
 * { q, category, color, size, minPrice, maxPrice, fabric }
 */

interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  color?: string;
  size?: string;
  sizes?: string[];
  price?: number;
  fabric?: string;
  tags?: string;
}

interface SearchFilters {
  q?: string;
  category?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  fabric?: string;
}

function textMatch(text: string = '', q: string = ''): boolean {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

function numericBetween(value: number | null | undefined, min: number | null | undefined, max: number | null | undefined): boolean {
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function matchesProduct(p: Product, filters: SearchFilters = {}): boolean {
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const hay = (
      (p.name || p.title || '') +
      ' ' +
      (p.description || '') +
      ' ' +
      (p.category || '') +
      ' ' +
      (p.color || '') +
      ' ' +
      (p.tags || '')
    ).toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (filters.category && p.category && p.category.toLowerCase() !== filters.category.toLowerCase()) {
    return false;
  }

  if (filters.color && p.color && p.color.toLowerCase() !== filters.color.toLowerCase()) {
    return false;
  }

  if (filters.fabric && p.fabric && p.fabric.toLowerCase() !== filters.fabric.toLowerCase()) {
    return false;
  }

  if (filters.size) {
    if (p.sizes && Array.isArray(p.sizes)) {
      const size = String(filters.size || '').toLowerCase();
      const normalizedSizes = p.sizes.map((s) => String(s).toUpperCase());
      
      // Normalize size tokens
      if (size === 'small' || size === 's') {
        if (!normalizedSizes.includes('S')) return false;
      } else if (size === 'medium' || size === 'm') {
        if (!normalizedSizes.includes('M')) return false;
      } else if (size === 'large' || size === 'l') {
        if (!normalizedSizes.includes('L')) return false;
      } else if (size === 'xs' || size === 'extra small') {
        if (!normalizedSizes.includes('XS')) return false;
      } else if (size === 'xl' || size === 'extra large') {
        if (!normalizedSizes.includes('XL')) return false;
      } else {
        // Direct match
        if (!normalizedSizes.includes(size.toUpperCase())) return false;
      }
    } else {
      // If product doesn't have sizes array, skip size filter
      // (some products might not have sizes)
    }
  }

  const price = p.price != null ? Number(p.price) : null;
  if (price != null && !numericBetween(price, filters.minPrice, filters.maxPrice)) {
    return false;
  }

  return true;
}

export function searchProducts(products: Product[] = [], filters: SearchFilters = {}): Product[] {
  // Allow free-text 'q' in filters
  if (
    filters.q &&
    !filters.category &&
    !filters.color &&
    !filters.size &&
    !filters.fabric &&
    filters.minPrice == null &&
    filters.maxPrice == null
  ) {
    // Quick text match
    return products.filter((p) => textMatch((p.name || p.title || '') + ' ' + (p.description || ''), filters.q || '')).slice(0, 60);
  }

  const out = products.filter((p) => matchesProduct(p, filters));

  // Simple ranking: by price asc if maxPrice provided else by relevancy (title match)
  if (filters.maxPrice != null) {
    out.sort((a, b) => (Number(a.price || 99999) - Number(b.price || 99999)));
  }

  return out.slice(0, 60);
}

