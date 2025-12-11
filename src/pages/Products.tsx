import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Grid3X3, ShoppingBag } from 'lucide-react';
import { ProductCard } from '@/components/shopping/ProductCard';
import { ShoppingCart } from '@/components/shopping/ShoppingCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CartItem, Product } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { productService } from '@/services/productService';
import { mockCartService } from '@/services/mocks/mockCart';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import RouteLoadingIndicator from '@/components/common/RouteLoadingIndicator';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { usePrefetch } from '@/hooks/usePrefetch';
import VoiceSearch from '@/components/voice/VoiceSearch';

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
    try {
      const filters: any = {};
      if (searchQuery) filters.query = searchQuery;
      if (riskFilter) filters.risk = riskFilter;
      if (sizeFilter) filters.size = sizeFilter;
      if (categoryFilter) filters.category = categoryFilter;

      const results = await productService.searchProducts(filters);
      setProducts(results);
    } catch (error) {
      console.error('Error loading products:', error);
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

  const handleVoiceResults = useCallback((results: Product[]) => {
    setProducts(results);
    setIsLoading(false);
  }, []);

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

  const handleSearchChange = (value: string) => {
    updateFilters({ q: value || null });
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
    } else {
      const updatedCart = await mockCartService.addToCart(userId, {
        product,
        quantity: 1,
            size: product.recommendedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'M')
      });
      setCartItems(updatedCart);
    }
  };

  const activeFiltersCount = [riskFilter, sizeFilter, categoryFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <HeaderNav />
      <RouteLoadingIndicator />
      
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="relative hover:bg-muted/80 transition-all duration-200"
            >
              <Filter className={cn(
                "w-4 h-4 mr-2 transition-transform duration-200",
                isFilterOpen && "rotate-90"
              )} />
              Filters
              {activeFiltersCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2"
                >
                  <Badge className="bg-primary text-primary-foreground shadow-sm">
                    {activeFiltersCount}
                  </Badge>
                </motion.div>
              )}
            </Button>
          </div>

          {/* Voice Search */}
          <div className="flex items-center gap-4">
            <VoiceSearch onResults={handleVoiceResults} autoSpeak={true} />
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-6 shadow-elevated"
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
                <h4 className="text-sm font-semibold mb-3 text-foreground">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                    <motion.div
                      key={size}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant={sizeFilter === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('size', size)}
                        className={cn(
                          "transition-all duration-200",
                          sizeFilter === size && "shadow-sm shadow-primary/20"
                        )}
                      >
                        {size}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 text-foreground">Category</h4>
                <div className="flex flex-wrap gap-2">
                  {['dress', 'top', 'pants', 'shoes', 'jacket'].map(category => (
                    <motion.div
                      key={category}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant={categoryFilter === category ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('category', category)}
                        className={cn(
                          "transition-all duration-200",
                          categoryFilter === category && "shadow-sm shadow-primary/20"
                        )}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskFilter && (
                <Badge variant="secondary" className="gap-1">
                  Risk: {riskFilter}
                  <button
                    onClick={() => handleFilterChange('risk', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove risk filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {sizeFilter && (
                <Badge variant="secondary" className="gap-1">
                  Size: {sizeFilter}
                  <button
                    onClick={() => handleFilterChange('size', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove size filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="secondary" className="gap-1">
                  Category: {categoryFilter}
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove category filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
            </h2>
            <div className="flex items-center space-x-1 bg-muted border border-border rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background">
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <SkeletonLoader variant="product" count={8} data-cy="product-list" />
          ) : products.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              data-cy="product-list"
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  data-cy="product-card"
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={Search}
              title="No products found"
              description={
                searchQuery
                  ? `We couldn't find any products matching "${searchQuery}". Try adjusting your search or filters.`
                  : "We couldn't find any products. Try adjusting your filters or check back later."
              }
              action={
                searchQuery
                  ? {
                      label: 'Clear Search',
                      onClick: () => {
                        updateFilters({ q: null });
                      },
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
  );
};

export default Products;

