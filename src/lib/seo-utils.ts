/**
 * SEO Utility Functions
 * 
 * Helper functions for generating SEO-friendly content and structured data
 */

import { Product } from '@/types/fashion';

/**
 * Generate a search-friendly URL slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate SEO-friendly title for search pages
 */
export function generateSearchTitle(query?: string, category?: string, totalResults?: number): string {
  if (query) {
    return `Search Results for "${query}"${totalResults ? ` (${totalResults} products)` : ''} - Style Shepherd`;
  }
  if (category) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    return `${categoryName} Products${totalResults ? ` (${totalResults} items)` : ''} - Style Shepherd`;
  }
  return 'Shop Fashion Products - Style Shepherd';
}

/**
 * Generate SEO-friendly description for search pages
 */
export function generateSearchDescription(
  query?: string,
  category?: string,
  totalResults?: number
): string {
  if (query) {
    return `Find ${totalResults || ''} fashion products matching "${query}". AI-powered size predictions and personalized styling advice. Reduce returns by 90% with Style Shepherd.`;
  }
  if (category) {
    return `Browse our collection of ${category} products. Get perfect size predictions and reduce returns by 90% with AI-powered fashion assistance from Style Shepherd.`;
  }
  return 'Discover fashion products with AI-powered size predictions. Reduce returns by 90% and find your perfect fit with Style Shepherd.';
}

/**
 * Generate keywords array for meta tags
 */
export function generateKeywords(query?: string, category?: string, products?: Product[]): string[] {
  const baseKeywords = [
    'fashion',
    'AI fashion assistant',
    'size prediction',
    'fashion shopping',
    'reduce returns',
    'personalized styling',
    'fashion recommendations',
    'Style Shepherd',
    // Tracked fashion brands for SEO
    'Zara',
    'H&M',
    'Nike',
    'ASOS',
    'Nordstrom',
    'Adidas',
    "Levi's",
    'Calvin Klein',
    'fashion brand tracking',
    'e-commerce fashion',
  ];

  const dynamicKeywords: string[] = [];

  if (query) {
    dynamicKeywords.push(query.toLowerCase());
  }

  if (category) {
    dynamicKeywords.push(category.toLowerCase());
  }

  if (products && products.length > 0) {
    // Extract unique brands and categories from products
    const brands = [...new Set(products.map(p => p.brand))];
    const categories = [...new Set(products.map(p => p.category))];
    
    dynamicKeywords.push(...brands.map(b => b.toLowerCase()));
    dynamicKeywords.push(...categories.map(c => c.toLowerCase()));
  }

  return [...baseKeywords, ...dynamicKeywords].slice(0, 30); // Increased limit to include brand keywords
}

/**
 * Generate canonical URL for a page
 */
export function generateCanonicalUrl(path: string, searchParams?: URLSearchParams): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://styleshepherd.com';
  const queryString = searchParams?.toString() || '';
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Validate product data for structured data
 */
export function isValidProductForSEO(product: Product): boolean {
  return !!(
    product.id &&
    product.name &&
    product.brand &&
    product.price !== undefined &&
    product.price !== null
  );
}

/**
 * Generate product URL for structured data
 */
export function getProductUrl(productId: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://styleshepherd.com';
  return `${baseUrl}/products/${productId}`;
}
