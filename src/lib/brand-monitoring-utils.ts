/**
 * Brand Monitoring Utilities for Searchable SEO
 * 
 * Utilities for monitoring and tracking fashion brand websites
 * for SEO and analytics purposes
 */

import { TrackedBrand, getTrackedBrands } from '@/services/brand-tracking-service';

/**
 * Check if a brand is being tracked
 */
export function isBrandTracked(brandName: string): boolean {
  const brands = getTrackedBrands();
  return brands.some(brand => 
    brand.name.toLowerCase() === brandName.toLowerCase()
  );
}

/**
 * Get brand website URL
 */
export function getBrandWebsite(brandName: string): string | null {
  const brands = getTrackedBrands();
  const brand = brands.find(b => 
    b.name.toLowerCase() === brandName.toLowerCase()
  );
  return brand?.website || null;
}

/**
 * Generate brand tracking meta tags
 */
export function generateBrandMetaTags(brandName: string): Record<string, string> {
  const brands = getTrackedBrands();
  const brand = brands.find(b => 
    b.name.toLowerCase() === brandName.toLowerCase()
  );

  if (!brand) {
    return {};
  }

  return {
    'brand:name': brand.name,
    'brand:website': brand.website,
    'brand:category': brand.category,
    ...(brand.sizingNotes && { 'brand:sizing-notes': brand.sizingNotes }),
  };
}

/**
 * Generate brand tracking keywords for a specific brand
 */
export function generateBrandKeywords(brandName: string): string[] {
  const brands = getTrackedBrands();
  const brand = brands.find(b => 
    b.name.toLowerCase() === brandName.toLowerCase()
  );

  if (!brand) {
    return [];
  }

  return [
    brand.name,
    `${brand.name} size guide`,
    `${brand.name} sizing`,
    `${brand.name} returns`,
    `${brand.name} fashion`,
    brand.category,
    'fashion brand tracking',
  ];
}

/**
 * Get all tracked brand websites
 */
export function getAllTrackedBrandWebsites(): string[] {
  return getTrackedBrands().map(brand => brand.website);
}

/**
 * Generate brand comparison structured data
 */
export function generateBrandComparisonStructuredData(brandNames: string[]): any {
  const brands = getTrackedBrands();
  const selectedBrands = brands.filter(brand =>
    brandNames.some(name => 
      brand.name.toLowerCase() === name.toLowerCase()
    )
  );

  if (selectedBrands.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    name: 'Fashion Brand Comparison',
    description: `Compare sizing and return rates across ${selectedBrands.length} fashion brands`,
    itemListElement: selectedBrands.map((brand, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Brand',
        name: brand.name,
        url: brand.website,
        description: brand.description,
        ...(brand.sizingNotes && {
          additionalProperty: {
            '@type': 'PropertyValue',
            name: 'Sizing Notes',
            value: brand.sizingNotes,
          },
        }),
      },
    })),
  };
}
