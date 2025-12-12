import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { stripeService, SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/services/integrations';
import { toast } from 'sonner';
import { Check, CreditCard, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubscriptionCheckout() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const planId = searchParams.get('plan');

  useEffect(() => {
    if (planId) {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
      }
    } else {
      setSelectedPlan(SUBSCRIPTION_PLANS[0]);
    }
  }, [planId]);

  const handleSubscribe = async () => {
    if (!isAuthenticated || !user || !selectedPlan) {
      toast.error('Please sign in to subscribe');
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      const session = await stripeService.createCheckoutSession(
        user.id,
        selectedPlan.priceId,
        'subscription',
        `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        `${window.location.origin}/subscription-checkout`,
        user.email,
        {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
        }
      );

      // Redirect to Stripe checkout or success page (mock redirects to success)
      window.location.href = session.url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to subscribe to Style Concierge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/login')} className="w-full">
              Sign In
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="text-primary hover:underline flex items-center text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Unlock premium styling features with Style Concierge
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                plan.popular ? 'border-primary border-2' : ''
              } ${selectedPlan?.id === plan.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="pt-8">
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  <Sparkles className="w-5 h-5 text-primary" />
                </CardTitle>
                <CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubscribe}
            disabled={!selectedPlan || isLoading}
            className="min-w-[250px]"
          >
            {isLoading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Subscribe to {selectedPlan?.name}
              </>
            )}
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>Secure payment powered by Stripe</p>
          <p>Cancel anytime. No hidden fees. 30-day money-back guarantee.</p>
        </div>
      </div>
    </div>
  );
}
