import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { CartItem } from '@/types/fashion';
import { paymentService } from '@/services/paymentService';
import { mockCartService } from '@/services/mocks/mockCart';
import { useCartCalculations } from '@/hooks/useCartCalculations';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { CartReview } from '@/components/CartReview';
import { returnsPredictor, type CartValidationResponse } from '@/services/returnsPredictor';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import HeaderNav from '@/components/layout/HeaderNav';

// Helper function to build URLs that work with Lovable Cloud
function buildCheckoutUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  
  // Use relative URLs for Lovable Cloud (works automatically)
  // For local development, use full URL
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.origin}${path}`;
  }
  
  // For production/Lovable, use relative path
  return path;
}

const CheckoutForm = ({ cartItems }: { cartItems: CartItem[] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const { subtotal, shipping, tax, total } = useCartCalculations(cartItems);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!shippingInfo.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!shippingInfo.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!shippingInfo.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!shippingInfo.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!shippingInfo.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(shippingInfo.zipCode)) {
      newErrors.zipCode = 'Please enter a valid ZIP code';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [shippingInfo]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    setIsProcessing(true);

    try {
      // Build success and cancel URLs
      const successUrl = buildCheckoutUrl(`/order-success?session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = buildCheckoutUrl('/checkout?canceled=true');

      // Create Stripe Checkout Session (redirects to Stripe's hosted checkout)
      const checkoutSession = await paymentService.createCheckoutSession(
        cartItems,
        user.id,
        successUrl,
        cancelUrl,
        shippingInfo
      );

      // Redirect to Stripe Checkout
      if (checkoutSession.url) {
        window.location.href = checkoutSession.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'An error occurred during checkout');
      setIsProcessing(false);
    }
  }, [user, cartItems, shippingInfo, navigate, validateForm]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
          <CardDescription>Enter your delivery details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={shippingInfo.name}
              onChange={(e) => {
                setShippingInfo({ ...shippingInfo, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={shippingInfo.address}
              onChange={(e) => {
                setShippingInfo({ ...shippingInfo, address: e.target.value });
                if (errors.address) setErrors({ ...errors, address: '' });
              }}
              required
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'address-error' : undefined}
              className={errors.address ? 'border-destructive' : ''}
            />
            {errors.address && (
              <p id="address-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.address}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={shippingInfo.city}
                onChange={(e) => {
                  setShippingInfo({ ...shippingInfo, city: e.target.value });
                  if (errors.city) setErrors({ ...errors, city: '' });
                }}
                required
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? 'city-error' : undefined}
                className={errors.city ? 'border-destructive' : ''}
              />
              {errors.city && (
                <p id="city-error" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.city}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={shippingInfo.state}
                onChange={(e) => {
                  setShippingInfo({ ...shippingInfo, state: e.target.value });
                  if (errors.state) setErrors({ ...errors, state: '' });
                }}
                required
                aria-invalid={!!errors.state}
                aria-describedby={errors.state ? 'state-error' : undefined}
                className={errors.state ? 'border-destructive' : ''}
              />
              {errors.state && (
                <p id="state-error" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.state}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={shippingInfo.zipCode}
                onChange={(e) => {
                  setShippingInfo({ ...shippingInfo, zipCode: e.target.value });
                  if (errors.zipCode) setErrors({ ...errors, zipCode: '' });
                }}
                required
                pattern="^\d{5}(-\d{4})?$"
                aria-invalid={!!errors.zipCode}
                aria-describedby={errors.zipCode ? 'zipCode-error' : undefined}
                className={errors.zipCode ? 'border-destructive' : ''}
              />
              {errors.zipCode && (
                <p id="zipCode-error" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.zipCode}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={shippingInfo.country}
                onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>You'll be redirected to Stripe's secure checkout page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Secure Checkout</p>
                  <p className="text-muted-foreground">Powered by Stripe - your payment details are never stored on our servers</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Your payment information is encrypted and secure</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <span>${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>
        <Button
          type="submit"
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
};


const Checkout = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartValidation, setCartValidation] = useState<CartValidationResponse | null>(null);
  const [isValidatingCart, setIsValidatingCart] = useState(false);

  // Check if checkout was canceled
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled. You can try again anytime.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please sign in to checkout');
      navigate('/login');
      return;
    }

    const loadCart = async () => {
      if (!user) return;
      
      try {
        const cart = await mockCartService.getCart(user.id);
        setCartItems(cart);
        if (cart.length === 0) {
          toast.error('Your cart is empty');
          navigate('/dashboard');
          return;
        }

        // Validate cart with Returns Predictor
        setIsValidatingCart(true);
        try {
          const validation = await returnsPredictor.validateCart(cart, user.id);
          setCartValidation(validation);
          
          // Show warning if high risk
          if (validation.summary.averageRisk >= 0.4 || validation.summary.highRiskItems > 0) {
            toast.warning(
              `⚠️ Cart has ${Math.round(validation.summary.averageRisk * 100)}% return risk. Review items below.`,
              { duration: 5000 }
            );
          }
        } catch (error) {
          console.error('Failed to validate cart:', error);
          // Continue checkout even if validation fails
        } finally {
          setIsValidatingCart(false);
        }

      } catch (error) {
        console.error('Error loading cart:', error);
        toast.error('Failed to load cart');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [user, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <HeaderNav />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link to="/dashboard" className="text-primary hover:underline flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>

        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        {/* Cart Risk Validation */}
        {isValidatingCart && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Analyzing cart for return risk...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {cartValidation && !isValidatingCart && (
          <div className="mb-6">
            <CartReview
              cartItems={cartItems}
              validation={cartValidation}
              onReplaceItem={(itemId, alternativeId) => {
                toast.info('Alternative replacement coming soon!', { duration: 3000 });
                // TODO: Implement item replacement logic
              }}
            />
          </div>
        )}

        <CheckoutForm cartItems={cartItems} />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Checkout;
