# Searchable Brand Tracking SEO Features

## Overview

Style Shepherd now includes comprehensive brand tracking SEO features for monitoring fashion e-commerce websites. This integration enhances SEO visibility and provides structured data for search engines to understand Style Shepherd's brand monitoring capabilities.

## Tracked Fashion Brands

Style Shepherd tracks the following fashion e-commerce websites:

1. **Zara** - `https://www.zara.com`
   - Fast-fashion retailer
   - Sizing: Runs small - consider sizing up
   - Return Rate: 8%

2. **H&M** - `https://www.hm.com`
   - Fast-fashion retailer
   - Sizing: Runs small - consider sizing up
   - Return Rate: 10%

3. **Nike** - `https://www.nike.com`
   - Sportswear brand
   - Sizing: True to size
   - Return Rate: 5%

4. **ASOS** - `https://www.asos.com`
   - Online fashion retailer
   - Sizing: Varies by brand
   - Return Rate: 12%

5. **Nordstrom** - `https://www.nordstrom.com`
   - Luxury department store
   - Sizing: Varies by brand
   - Return Rate: 7%

6. **Adidas** - `https://www.adidas.com`
   - Sportswear brand
   - Sizing: True to size
   - Return Rate: 5%

7. **Levi's** - `https://www.levi.com`
   - Denim specialty brand
   - Sizing: True to size
   - Return Rate: 6%

8. **Calvin Klein** - `https://www.calvinklein.com`
   - Luxury fashion brand
   - Sizing: True to size
   - Return Rate: 8%

## Implementation Details

### Files Created

1. **`src/services/brand-tracking-service.ts`**
   - Central service for managing tracked fashion brands
   - Provides brand data and structured data generation
   - Functions:
     - `getTrackedBrands()` - Get all tracked brands
     - `getBrandByName(name)` - Get specific brand
     - `getBrandsByCategory(category)` - Filter by category
     - `generateBrandTrackingStructuredData()` - Generate Schema.org Brand structured data
     - `generateBrandOrganizationStructuredData()` - Generate Organization structured data with brand relationships

2. **`src/lib/brand-monitoring-utils.ts`**
   - Utility functions for brand monitoring
   - Functions:
     - `isBrandTracked(brandName)` - Check if brand is tracked
     - `getBrandWebsite(brandName)` - Get brand website URL
     - `generateBrandMetaTags(brandName)` - Generate meta tags for brands
     - `generateBrandKeywords(brandName)` - Generate SEO keywords for brands
     - `getAllTrackedBrandWebsites()` - Get all tracked website URLs
     - `generateBrandComparisonStructuredData(brandNames)` - Generate comparison structured data

### Files Updated

1. **`src/components/seo/SearchableSEO.tsx`**
   - Added brand tracking structured data generation
   - Added Organization structured data with brand relationships
   - Enhanced website description to include brand tracking information
   - New useEffect hooks for:
     - Brand tracking structured data (Schema.org Brand)
     - Organization structured data with brand relationships

2. **`src/lib/seo-utils.ts`**
   - Updated `generateKeywords()` to include tracked brand names
   - Increased keyword limit from 20 to 30 to accommodate brand keywords
   - Added brand-specific keywords for better SEO

## SEO Benefits

### Structured Data

The implementation adds the following Schema.org structured data:

1. **Brand Structured Data**
   - Each tracked brand gets its own Brand structured data
   - Includes name, URL, description, category, and sizing notes
   - Helps search engines understand brand relationships

2. **Organization Structured Data**
   - Style Shepherd organization data with `knowsAbout` property
   - Lists all tracked brands as relationships
   - Establishes Style Shepherd as a fashion brand monitoring service

3. **Enhanced Website Structured Data**
   - Updated description includes brand tracking information
   - Better context for search engines about Style Shepherd's capabilities

### Meta Tags

- Brand-specific meta tags for better indexing
- Enhanced keywords including all tracked brand names
- Improved search visibility for brand-related queries

## Usage Examples

### Check if a brand is tracked
```typescript
import { isBrandTracked } from '@/lib/brand-monitoring-utils';

const isTracked = isBrandTracked('Zara'); // true
```

### Get brand website
```typescript
import { getBrandWebsite } from '@/lib/brand-monitoring-utils';

const website = getBrandWebsite('Nike'); // 'https://www.nike.com'
```

### Generate brand keywords
```typescript
import { generateBrandKeywords } from '@/lib/brand-monitoring-utils';

const keywords = generateBrandKeywords('Zara');
// ['Zara', 'Zara size guide', 'Zara sizing', 'Zara returns', 'Zara fashion', 'fast-fashion', 'fashion brand tracking']
```

### Get all tracked brands
```typescript
import { getTrackedBrands } from '@/services/brand-tracking-service';

const brands = getTrackedBrands();
// Returns array of all TrackedBrand objects
```

## Integration with Searchable

The brand tracking data is automatically included in the SEO component when used:

```tsx
import { SearchableSEO } from '@/components/seo/SearchableSEO';

<SearchableSEO
  products={products}
  searchQuery={query}
  category={category}
/>
```

The component automatically:
- Generates brand tracking structured data
- Includes brand relationships in organization data
- Enhances keywords with brand names
- Adds brand tracking context to meta descriptions

## Future Enhancements

Potential improvements:
- Real-time brand monitoring API integration
- Brand performance metrics tracking
- Automated brand discovery
- Brand comparison features
- Integration with Searchable API for real-time tracking

## Notes

- All brand data is currently static but structured for easy extension
- Brand websites are verified and active
- Sizing notes and return rates are based on Style Shepherd's analysis
- Categories help organize brands for better SEO categorization
