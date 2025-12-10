import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { CartItem } from '@/types/fashion';
import { stripeService } from '@/services/stripeService';
import { mockCartService } from '@/services/mocks/mockCart';
import { useCartCalculations } from '@/hooks/useCartCalculations';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Lock, CheckCircle } from 'lucide-react';

interface CheckoutFormProps {
  cartItems: CartItem[];
  onOrderComplete: () => void;
}

// Mock checkout form (when Stripe Elements not available)
const MockCheckoutForm = ({ cartItems, onOrderComplete }: CheckoutFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const { subtotal, shipping, tax, total } = useCartCalculations(cartItems);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    if (!shippingInfo.name || !shippingInfo.address || !shippingInfo.city) {
      toast.error('Please fill in shipping information');
      return;
    }

    setIsProcessing(true);

    try {
      // Create and confirm payment (mock)
      const paymentIntent = await stripeService.createPaymentIntent(
        cartItems,
        user.id,
        shippingInfo
      );

      // Simulate payment confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const orderResult = await stripeService.confirmPayment(
        paymentIntent.paymentIntentId,
        cartItems,
        user.id,
        shippingInfo
      );

      // Clear cart
      await mockCartService.clearCart(user.id);

      toast.success('Payment successful! Order confirmed.');
      onOrderComplete();
      navigate(`/order-success?orderId=${orderResult.orderId}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'An error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  }, [user, cartItems, shippingInfo, navigate, onOrderComplete]);

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
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={shippingInfo.name}
              onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={shippingInfo.address}
              onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={shippingInfo.city}
                onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={shippingInfo.state}
                onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={shippingInfo.zipCode}
                onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
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

      {/* Payment Information (Mock) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>Demo mode - no real payment will be processed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Demo Payment Mode</p>
                  <p className="text-muted-foreground">Click "Pay" to simulate a successful payment</p>
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
          {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

// Stripe Elements checkout form
const StripeCheckoutForm = ({ cartItems, onOrderComplete }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const { subtotal, shipping, tax, total } = useCartCalculations(cartItems);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      toast.error('Please sign in to continue');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentIntent = await stripeService.createPaymentIntent(
        cartItems,
        user.id,
        shippingInfo
      );

      const { error: stripeError, paymentIntent: confirmedPayment } = await stripe.confirmPayment({
        elements,
        clientSecret: paymentIntent.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
          payment_method_data: {
            billing_details: {
              name: shippingInfo.name,
              address: {
                line1: shippingInfo.address,
                city: shippingInfo.city,
                state: shippingInfo.state,
                postal_code: shippingInfo.zipCode,
                country: shippingInfo.country,
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        toast.error(stripeError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (confirmedPayment?.status === 'succeeded') {
        const orderResult = await stripeService.confirmPayment(
          paymentIntent.paymentIntentId,
          cartItems,
          user.id,
          shippingInfo
        );

        await mockCartService.clearCart(user.id);
        toast.success('Payment successful! Order confirmed.');
        onOrderComplete();
        navigate(`/order-success?orderId=${orderResult.orderId}`);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'An error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  }, [stripe, elements, user, cartItems, shippingInfo, navigate, onOrderComplete]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Same shipping form as MockCheckoutForm */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
          <CardDescription>Enter your delivery details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={shippingInfo.name}
              onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={shippingInfo.address}
              onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={shippingInfo.city}
                onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={shippingInfo.state}
                onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={shippingInfo.zipCode}
                onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
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

      {/* Stripe Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>Secure payment powered by Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <PaymentElement />
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
                <span>{item.product.name} × {item.quantity}</span>
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
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

const Checkout = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [useStripeElements, setUseStripeElements] = useState(false);

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

        // Try to create payment intent for Stripe Elements
        try {
          const paymentIntent = await stripeService.createPaymentIntent(cart, user.id);
          if (paymentIntent.clientSecret && paymentIntent.clientSecret.startsWith('pi_')) {
            // Real Stripe client secret
            setClientSecret(paymentIntent.clientSecret);
            setUseStripeElements(true);
          }
        } catch {
          // Fall back to mock checkout
          setUseStripeElements(false);
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
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/dashboard" className="text-primary hover:underline flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        {useStripeElements && clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'stripe' },
            }}
          >
            <StripeCheckoutForm cartItems={cartItems} onOrderComplete={() => {}} />
          </Elements>
        ) : (
          <MockCheckoutForm cartItems={cartItems} onOrderComplete={() => {}} />
        )}
      </div>
    </div>
  );
};

export default Checkout;
