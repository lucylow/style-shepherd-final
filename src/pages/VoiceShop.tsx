import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Sparkles, ShoppingBag, AlertCircle, X } from 'lucide-react';
import { VoiceInterface } from '@/components/VoiceInterface';
import { ProductCard } from '@/components/ProductCard';
import { ShoppingCart } from '@/components/ShoppingCart';
import { Button } from '@/components/ui/button';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CartItem, Product, VoiceResponse } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { mockProductService } from '@/services/mockProducts';
import { mockCartService } from '@/services/mockCart';
import Breadcrumbs from '@/components/Breadcrumbs';
import HeaderNav from '@/components/HeaderNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const VoiceShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const userId = user?.id || 'guest';

  useScrollRestoration();

  useEffect(() => {
    loadInitialProducts();
    if (userId !== 'guest') {
      loadCart();
    }
  }, [userId]);

  const loadInitialProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await mockProductService.searchProducts({});
      setProducts(results.slice(0, 8)); // Show initial products
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError('Failed to load products. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const cartData = await mockCartService.getCart(userId);
      setCartItems(cartData);
    } catch (error: any) {
      console.error('Error loading cart:', error);
      // Cart loading errors are non-critical, user can still shop
      // Just log the error but don't show to user unless critical
    }
  };

  const handleVoiceCommand = async (response: VoiceResponse) => {
    setIsListening(false);
    setError(null);
    setLastCommand(response.text || 'Command processed');

    // If products are directly provided in response
    if (response.products && response.products.length > 0) {
      setProducts(response.products);
    } else if (response.text) {
      // Try to search based on voice command text and intent
      try {
        // Extract search terms from the response text
        const searchQuery = response.text;
        const results = await mockProductService.searchProducts({ query: searchQuery });
        if (results.length === 0) {
          setError('No products found. Try a different search term.');
        } else {
          setProducts(results);
        }
      } catch (error: any) {
        console.error('Error searching products:', error);
        setError('Failed to search products. Please try again.');
      }
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
            size: product.recommendedSize || product.sizes[0] 
          }];
        });
      } else {
        const updatedCart = await mockCartService.addToCart(userId, {
          product,
          quantity: 1,
          size: product.recommendedSize || product.sizes[0]
        });
        setCartItems(updatedCart);
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      setError('Failed to add item to cart. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <HeaderNav />
      <RouteLoadingIndicator />
      
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 mb-8 border border-primary/20 relative overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-14 h-14 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Voice Shop</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    AI Assistant Ready
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-lg mb-4">
                Shop hands-free with voice commands. Say what you're looking for and we'll find it for you.
              </p>
              {lastCommand && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg p-4 mt-4 shadow-sm"
                >
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                    <Mic className="w-3 h-3" />
                    Last command:
                  </p>
                  <p className="text-foreground font-medium">"{lastCommand}"</p>
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isListening 
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' 
                      : 'bg-gradient-to-br from-primary to-primary/70 text-white'
                  }`}
                  animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </motion.div>
                <span className="text-sm font-medium text-foreground">
                  {isListening ? 'Listening...' : 'Ready to listen'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Voice Commands Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Try These Commands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Show me blue dresses',
              'Find casual shirts',
              'I need size medium',
              'Show me low return risk items',
              'What do you recommend?',
              'Find something for a wedding',
            ].map((command, index) => (
              <div
                key={index}
                className="bg-muted rounded-lg p-3 text-sm text-muted-foreground"
              >
                "{command}"
              </div>
            ))}
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {products.length > 0 ? 'Voice Search Results' : 'Start by saying what you need'}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCartOpen(true)}
              className="relative"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Button>
          </div>

          {isLoading ? (
            <SkeletonLoader variant="product" count={8} />
          ) : products.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
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
              icon={Mic}
              title="No products yet"
              description="Use the voice interface below to search for products. Try saying something like 'Show me summer dresses' or 'Find blue jeans'."
            />
          )}
        </section>
      </main>

      {/* Voice Interface */}
      <VoiceInterface
        userId={userId}
        onVoiceCommand={handleVoiceCommand}
      />

      {/* Shopping Cart */}
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={async (productId, quantity) => {
          try {
            if (quantity === 0) {
              setCartItems(prev => prev.filter(item => item.product.id !== productId));
            } else {
              setCartItems(prev => prev.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
              ));
            }
          } catch (error: any) {
            console.error('Error updating cart quantity:', error);
            setError('Failed to update cart. Please try again.');
          }
        }}
        onRemoveItem={(productId) => {
          try {
            setCartItems(prev => prev.filter(item => item.product.id !== productId));
          } catch (error: any) {
            console.error('Error removing item from cart:', error);
            setError('Failed to remove item from cart. Please try again.');
          }
        }}
        onCheckout={() => {
          // Checkout handled in ShoppingCart
        }}
      />

      <MobileBottomNav />
    </div>
  );
};

export default VoiceShop;

