/**
 * Brand Tracking Service for Searchable SEO
 * 
 * Tracks fashion e-commerce websites for Style Shepherd's brand monitoring
 * and SEO optimization features.
 */

export interface TrackedBrand {
  name: string;
  website: string;
  description: string;
  category: 'fast-fashion' | 'luxury' | 'sportswear' | 'department-store' | 'specialty';
  sizingNotes?: string;
  returnRate?: number;
  trackedSince?: string;
}

/**
 * Fashion e-commerce websites tracked by Style Shepherd
 * These brands are monitored for size prediction and return risk analysis
 */
export const TRACKED_FASHION_BRANDS: TrackedBrand[] = [
  {
    name: 'Zara',
    website: 'https://www.zara.com',
    description: 'Spanish fast-fashion retailer known for trendy designs',
    category: 'fast-fashion',
    sizingNotes: 'Runs small - consider sizing up',
    returnRate: 0.08,
    trackedSince: '2024-01-01',
  },
  {
    name: 'H&M',
    website: 'https://www.hm.com',
    description: 'Swedish multinational clothing retailer offering fashion and quality',
    category: 'fast-fashion',
    sizingNotes: 'Runs small - consider sizing up',
    returnRate: 0.10,
    trackedSince: '2024-01-01',
  },
  {
    name: 'Nike',
    website: 'https://www.nike.com',
    description: 'American multinational sportswear and athletic footwear brand',
    category: 'sportswear',
    sizingNotes: 'True to size',
    returnRate: 0.05,
    trackedSince: '2024-01-01',
  },
  {
    name: 'ASOS',
    website: 'https://www.asos.com',
    description: 'British online fashion and cosmetic retailer',
    category: 'department-store',
    sizingNotes: 'Varies by brand',
    returnRate: 0.12,
    trackedSince: '2024-01-01',
  },
  {
    name: 'Nordstrom',
    website: 'https://www.nordstrom.com',
    description: 'American luxury department store chain',
    category: 'department-store',
    sizingNotes: 'Varies by brand',
    returnRate: 0.07,
    trackedSince: '2024-01-01',
  },
  {
    name: 'Adidas',
    website: 'https://www.adidas.com',
    description: 'German multinational sportswear and athletic footwear brand',
    category: 'sportswear',
    sizingNotes: 'True to size',
    returnRate: 0.05,
    trackedSince: '2024-01-01',
  },
  {
    name: "Levi's",
    website: 'https://www.levi.com',
    description: 'American clothing company known for denim jeans',
    category: 'specialty',
    sizingNotes: 'True to size',
    returnRate: 0.06,
    trackedSince: '2024-01-01',
  },
  {
    name: 'Calvin Klein',
    website: 'https://www.calvinklein.com',
    description: 'American fashion house known for minimalist designs',
    category: 'luxury',
    sizingNotes: 'True to size',
    returnRate: 0.08,
    trackedSince: '2024-01-01',
  },
];

/**
 * Get all tracked brands
 */
export function getTrackedBrands(): TrackedBrand[] {
  return TRACKED_FASHION_BRANDS;
}

/**
 * Get a specific brand by name
 */
export function getBrandByName(name: string): TrackedBrand | undefined {
  return TRACKED_FASHION_BRANDS.find(
    brand => brand.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get brands by category
 */
export function getBrandsByCategory(category: TrackedBrand['category']): TrackedBrand[] {
  return TRACKED_FASHION_BRANDS.filter(brand => brand.category === category);
}

/**
 * Generate brand tracking structured data for SEO
 */
export function generateBrandTrackingStructuredData(): any[] {
  return TRACKED_FASHION_BRANDS.map(brand => ({
    '@context': 'https://schema.org/',
    '@type': 'Brand',
    name: brand.name,
    url: brand.website,
    description: brand.description,
    category: brand.category,
    ...(brand.sizingNotes && {
      additionalProperty: {
        '@type': 'PropertyValue',
        name: 'Sizing Notes',
        value: brand.sizingNotes,
      },
    }),
  }));
}

/**
 * Generate Organization structured data with brand relationships
 */
export function generateBrandOrganizationStructuredData(): any {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: 'Style Shepherd',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://styleshepherd.com',
    description: 'AI-powered fashion assistant that tracks and analyzes fashion brands for size prediction and return risk assessment',
    knowsAbout: TRACKED_FASHION_BRANDS.map(brand => ({
      '@type': 'Brand',
      name: brand.name,
      url: brand.website,
    })),
    memberOf: {
      '@type': 'Organization',
      name: 'Fashion E-commerce Analytics Network',
    },
  };
}

/**
 * Get brand tracking summary for SEO meta description
 */
export function getBrandTrackingSummary(): string {
  const brandCount = TRACKED_FASHION_BRANDS.length;
  const categories = [...new Set(TRACKED_FASHION_BRANDS.map(b => b.category))];
  return `Style Shepherd tracks ${brandCount} fashion brands across ${categories.length} categories including ${TRACKED_FASHION_BRANDS.slice(0, 3).map(b => b.name).join(', ')} and more.`;
}
