/**
 * SearchableSEO Component
 * 
 * Enhances SEO for search pages with:
 * - Dynamic meta tags based on search queries
 * - JSON-LD structured data (Schema.org Product, ItemList, BreadcrumbList)
 * - Open Graph and Twitter Card meta tags
 * - Canonical URLs
 * - Brand tracking structured data for fashion e-commerce websites
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Product } from '@/types/fashion';
import { generateSearchTitle, generateSearchDescription, generateKeywords, generateCanonicalUrl, isValidProductForSEO, getProductUrl } from '@/lib/seo-utils';
import { generateBrandTrackingStructuredData, generateBrandOrganizationStructuredData, getBrandTrackingSummary } from '@/services/brand-tracking-service';

interface SearchableSEOProps {
  title?: string;
  description?: string;
  products?: Product[];
  searchQuery?: string;
  category?: string;
  totalResults?: number;
  currentPage?: number;
  imageUrl?: string;
}

export function SearchableSEO({
  title,
  description,
  products = [],
  searchQuery,
  category,
  totalResults,
  currentPage = 1,
  imageUrl,
}: SearchableSEOProps) {
  const location = useLocation();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const searchParams = new URLSearchParams(location.search);
  const canonicalUrl = generateCanonicalUrl(location.pathname, searchParams);

  // Generate dynamic title and description using utility functions
  const pageTitle = title || generateSearchTitle(searchQuery, category, totalResults);
  const pageDescription = description || generateSearchDescription(searchQuery, category, totalResults);
  const keywords = generateKeywords(searchQuery, category, products);

  // Update document title and meta tags
  useEffect(() => {
    // Update title
    document.title = pageTitle;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', pageDescription);

    // Update or create meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords.join(', '));

    // Update Open Graph tags
    const updateOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateOrCreateMeta('og:title', pageTitle);
    updateOrCreateMeta('og:description', pageDescription);
    updateOrCreateMeta('og:type', 'website');
    updateOrCreateMeta('og:url', canonicalUrl);
    if (imageUrl) {
      updateOrCreateMeta('og:image', imageUrl);
    }

    // Update Twitter Card tags
    const updateOrCreateTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="twitter:${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', `twitter:${name}`);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateOrCreateTwitterMeta('card', 'summary_large_image');
    updateOrCreateTwitterMeta('title', pageTitle);
    updateOrCreateTwitterMeta('description', pageDescription);
    if (imageUrl) {
      updateOrCreateTwitterMeta('image', imageUrl);
    }

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Add robots meta for search pages
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  }, [pageTitle, pageDescription, canonicalUrl, imageUrl]);

  // Generate Product structured data
  useEffect(() => {
    // Remove existing product JSON-LD scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-seo="products"]');
    existingScripts.forEach(script => script.remove());

    // Filter valid products for SEO
    const validProducts = products.filter(isValidProductForSEO);

    if (validProducts.length > 0) {
      const productStructuredData = validProducts.map((product) => ({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        '@id': getProductUrl(product.id),
        name: product.name,
        description: product.description || `${product.name} by ${product.brand}`,
        brand: {
          '@type': 'Brand',
          name: product.brand,
        },
        category: product.category,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: getProductUrl(product.id),
        },
        image: product.images && product.images.length > 0 ? product.images[0] : undefined,
        aggregateRating: product.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviews?.length || 1,
            }
          : undefined,
        additionalProperty: [
          ...(product.color ? [{ '@type': 'PropertyValue', name: 'Color', value: product.color }] : []),
          ...(product.sizes && product.sizes.length > 0
            ? [{ '@type': 'PropertyValue', name: 'Available Sizes', value: product.sizes.join(', ') }]
            : []),
        ],
      }));

      productStructuredData.forEach((data, index) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo', 'products');
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      });
    }
  }, [products, baseUrl]);

  // Generate ItemList structured data for search results
  useEffect(() => {
    // Remove existing ItemList JSON-LD script
    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="itemlist"]');
    if (existingScript) {
      existingScript.remove();
    }

    if (products.length > 0) {
      const itemListData = {
        '@context': 'https://schema.org/',
        '@type': 'ItemList',
        name: searchQuery
          ? `Search Results for "${searchQuery}"`
          : category
          ? `${category.charAt(0).toUpperCase() + category.slice(1)} Products`
          : 'Fashion Products',
        description: pageDescription,
        numberOfItems: totalResults || products.length,
        itemListElement: products.filter(isValidProductForSEO).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            '@id': getProductUrl(product.id),
            name: product.name,
            image: product.images && product.images.length > 0 ? product.images[0] : undefined,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'USD',
            },
          },
        })),
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'itemlist');
      script.textContent = JSON.stringify(itemListData);
      document.head.appendChild(script);
    }
  }, [products, searchQuery, category, pageDescription, totalResults, baseUrl]);

  // Generate BreadcrumbList structured data
  useEffect(() => {
    // Remove existing breadcrumb JSON-LD script
    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="breadcrumb"]');
    if (existingScript) {
      existingScript.remove();
    }

    const breadcrumbItems = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: `${baseUrl}/products`,
      },
    ];

    if (searchQuery) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: `Search: ${searchQuery}`,
        item: canonicalUrl,
      });
    } else if (category) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        item: canonicalUrl,
      });
    }

    const breadcrumbData = {
      '@context': 'https://schema.org/',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'breadcrumb');
    script.textContent = JSON.stringify(breadcrumbData);
    document.head.appendChild(script);
  }, [searchQuery, category, canonicalUrl, baseUrl]);

  // Generate WebSite structured data with SearchAction
  useEffect(() => {
    // Remove existing website JSON-LD script
    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="website"]');
    if (existingScript) {
      existingScript.remove();
    }

    const websiteData = {
      '@context': 'https://schema.org/',
      '@type': 'WebSite',
      name: 'Style Shepherd',
      url: baseUrl,
      description: 'AI-powered fashion assistant that reduces returns by 90%. Get perfect size predictions and personalized styling advice. Tracks fashion brands including Zara, H&M, Nike, ASOS, Nordstrom, and more.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/products?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'website');
    script.textContent = JSON.stringify(websiteData);
    document.head.appendChild(script);
  }, [baseUrl]);

  // Generate Brand Tracking structured data for Searchable SEO
  useEffect(() => {
    // Remove existing brand tracking JSON-LD scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-seo="brand-tracking"]');
    existingScripts.forEach(script => script.remove());

    // Generate brand tracking structured data
    const brandData = generateBrandTrackingStructuredData();
    
    brandData.forEach((data, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'brand-tracking');
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    });
  }, []);

  // Generate Organization structured data with brand relationships
  useEffect(() => {
    // Remove existing organization JSON-LD script
    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="organization"]');
    if (existingScript) {
      existingScript.remove();
    }

    const organizationData = generateBrandOrganizationStructuredData();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'organization');
    script.textContent = JSON.stringify(organizationData);
    document.head.appendChild(script);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by the individual useEffects
    };
  }, []);

  return null; // This component doesn't render anything
}
