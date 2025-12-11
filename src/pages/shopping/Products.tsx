import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid3X3, ShoppingBag, X, Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/shopping/ProductCard';
import { ShoppingCart } from '@/components/shopping/ShoppingCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CartItem, Product } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { productService } from '@/services/shopping';
import { mockCartService } from '@/services/mocks/mockCart';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import RouteLoadingIndicator from '@/components/common/RouteLoadingIndicator';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { usePrefetch } from '@/hooks/usePrefetch';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toast } from 'sonner';
import { SearchableSEO } from '@/components/seo/SearchableSEO';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  // Initialize state from URL params
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Get filter/search values from URL
  const searchQuery = searchParams.get('q') || '';
  const riskFilter = searchParams.get('risk') || '';
  const sizeFilter = searchParams.get('size') || '';
  const categoryFilter = searchParams.get('category') || '';

  // Use scroll restoration
  useScrollRestoration();
  const { prefetchOnHover } = usePrefetch();

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (searchQuery) filters.query = searchQuery;
      if (riskFilter) filters.risk = riskFilter;
      if (sizeFilter) filters.size = sizeFilter;
      if (categoryFilter) filters.category = categoryFilter;

      const results = await productService.searchProducts(filters);
      setProducts(results);
      if (results.length === 0 && (searchQuery || riskFilter || sizeFilter || categoryFilter)) {
        setError('No products found matching your criteria');
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError(error.message || 'Failed to load products. Please try again.');
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, riskFilter, sizeFilter, categoryFilter]);

  const loadCart = useCallback(async () => {
    try {
      const cartData = await mockCartService.getCart(userId);
      setCartItems(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }, [userId]);

  // Load products based on URL params
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (userId !== 'guest') {
      loadCart();
    }
  }, [userId, loadCart]);

  // Update URL params (shallow routing)
  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // Update URL without page reload
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateFilters({ q: searchInput || null });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, searchQuery, updateFilters]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const clearSearch = () => {
    setSearchInput('');
    updateFilters({ q: null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const currentValue = searchParams.get(filterType);
    if (currentValue === value) {
      updateFilters({ [filterType]: null });
    } else {
      updateFilters({ [filterType]: value });
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      if (userId === 'guest') {
        setCartItems(prev => {
          const existingItem = prev.find(item => item.product.id === product.id);
          if (existingItem) {
            return prev.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }
          return [...prev, { 
            product, 
            quantity: 1, 
            size: product.recommendedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'M')
          }];
        });
        toast.success(`${product.name} added to cart`);
      } else {
        const updatedCart = await mockCartService.addToCart(userId, {
          product,
          quantity: 1,
          size: product.recommendedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'M')
        });
        setCartItems(updatedCart);
        toast.success(`${product.name} added to cart`);
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const activeFiltersCount = [riskFilter, sizeFilter, categoryFilter].filter(Boolean).length;
  const hasActiveFilters = activeFiltersCount > 0 || searchQuery;

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    updateFilters({ q: null, risk: null, size: null, category: null });
  }, [updateFilters]);

  return (
    <ErrorBoundary>
      <SearchableSEO
        products={products}
        searchQuery={searchQuery}
        category={categoryFilter}
        totalResults={products.length}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <HeaderNav />
        <RouteLoadingIndicator />
        
        <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs />
          
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                  aria-label="Search products"
                />
                {searchInput && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-[#2D8CFF] text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-lg p-4 space-y-4"
            >
              <div>
                <h4 className="text-sm font-semibold mb-2">Return Risk</h4>
                <div className="flex flex-wrap gap-2">
                  {['low', 'medium', 'high'].map(risk => (
                    <Button
                      key={risk}
                      variant={riskFilter === risk ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('risk', risk)}
                      data-cy={`filter-risk-${risk}`}
                    >
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                    <Button
                      key={size}
                      variant={sizeFilter === size ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('size', size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Category</h4>
                <div className="flex flex-wrap gap-2">
                  {['dress', 'top', 'pants', 'shoes', 'jacket'].map(category => (
                    <Button
                      key={category}
                      variant={categoryFilter === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('category', category)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={clearSearch}
                    className="ml-1 hover:text-destructive transition-colors"
                    aria-label="Remove search filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {riskFilter && (
                <Badge variant="secondary" className="gap-1">
                  Risk: {riskFilter}
                  <button
                    onClick={() => handleFilterChange('risk', '')}
                    className="ml-1 hover:text-destructive transition-colors"
                    aria-label="Remove risk filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {sizeFilter && (
                <Badge variant="secondary" className="gap-1">
                  Size: {sizeFilter}
                  <button
                    onClick={() => handleFilterChange('size', '')}
                    className="ml-1 hover:text-destructive transition-colors"
                    aria-label="Remove size filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="secondary" className="gap-1">
                  Category: {categoryFilter}
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className="ml-1 hover:text-destructive transition-colors"
                    aria-label="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
            </h2>
            <div className="flex items-center space-x-1 bg-muted border border-border rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background tap-target">
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <SkeletonLoader variant="product" count={8} data-cy="product-list" />
          ) : error ? (
            <EmptyState
              icon={Search}
              title="Error loading products"
              description={error}
              action={{
                label: 'Try Again',
                onClick: () => loadProducts(),
              }}
            />
          ) : products.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
              data-cy="product-list"
            >
              <AnimatePresence mode="popLayout">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    data-cy="product-card"
                    layout
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <EmptyState
              icon={Search}
              title="No products found"
              description={
                hasActiveFilters
                  ? `We couldn't find any products matching your criteria. Try adjusting your search or filters.`
                  : "We couldn't find any products. Please check back later."
              }
              action={
                hasActiveFilters
                  ? {
                      label: 'Clear Filters',
                      onClick: clearAllFilters,
                    }
                  : undefined
              }
            />
          )}
        </section>
      </main>

      {/* Shopping Cart */}
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={(productId, quantity) => {
          if (quantity === 0) {
            setCartItems(prev => prev.filter(item => item.product.id !== productId));
          } else {
            setCartItems(prev => prev.map(item =>
              item.product.id === productId ? { ...item, quantity } : item
            ));
          }
        }}
        onRemoveItem={(productId) => {
          setCartItems(prev => prev.filter(item => item.product.id !== productId));
        }}
        onCheckout={() => {
          navigate('/checkout');
        }}
      />

        <MobileBottomNav />
      </div>
    </ErrorBoundary>
  );
};

export default Products;

