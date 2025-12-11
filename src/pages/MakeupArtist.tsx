/**
 * Makeup Artist Page
 * Main page for makeup artistry feature
 */

import { useState } from 'react';
import { MakeupCamera } from '@/components/makeup/MakeupCamera';
import { MakeupResults } from '@/components/makeup/MakeupResults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { makeupService } from '@/services/integrations';
import type { MakeupLook } from '@/types/makeup';
import { useToast } from '@/hooks/use-toast';

const OCCASIONS = [
  'Wedding',
  'Date Night',
  'Office/Work',
  'Party',
  'Casual',
  'Formal Event',
  'Photoshoot',
  'Everyday',
];

const PREFERENCES = [
  'Bold Lips',
  'Smoky Eyes',
  'Natural Look',
  'Full Glam',
  'Minimal Makeup',
];

export default function MakeupArtist() {
  const [step, setStep] = useState<'camera' | 'form' | 'loading' | 'results'>('camera');
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string>('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [look, setLook] = useState<MakeupLook | null>(null);
  const { toast } = useToast();

  const handleCapture = (imageUrl: string) => {
    setSelfieUrl(imageUrl);
    setStep('form');
  };

  const handleCreateLook = async () => {
    if (!selfieUrl || !occasion) {
      toast({
        title: 'Missing Information',
        description: 'Please capture a selfie and select an occasion',
        variant: 'destructive',
      });
      return;
    }

    setStep('loading');

    try {
      const result = await makeupService.createLook({
        selfieUrl,
        occasion,
        preferences: preferences.length > 0 ? preferences : undefined,
      });
      setLook(result);
      setStep('results');
    } catch (error: any) {
      console.error('Failed to create look:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create makeup look. Please try again.',
        variant: 'destructive',
      });
      setStep('form');
    }
  };

  const togglePreference = (pref: string) => {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  if (step === 'camera') {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Makeup Artist AI</h1>
            <p className="text-muted-foreground">
              Get personalized makeup recommendations based on your unique features
            </p>
          </div>
          <MakeupCamera onCapture={handleCapture} />
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Look</CardTitle>
              <CardDescription>
                Tell us about the occasion and your preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selfieUrl && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                  <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="occasion">Occasion *</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASIONS.map((occ) => (
                      <SelectItem key={occ} value={occ}>
                        {occ}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferences (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCES.map((pref) => (
                    <Button
                      key={pref}
                      variant={preferences.includes(pref) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePreference(pref)}
                    >
                      {pref}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('camera')}
                  className="flex-1"
                >
                  Retake Photo
                </Button>
                <Button
                  onClick={handleCreateLook}
                  disabled={!occasion}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Look
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardContent className="py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">Creating Your Look</h2>
              <p className="text-muted-foreground">
                Analyzing your features and generating personalized recommendations...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'results' && look) {
    return (
      <div className="container mx-auto py-8">
        <MakeupResults
          look={look}
          onAddToCart={(productIds) => {
            toast({
              title: 'Added to Cart',
              description: `${productIds.length} product(s) added to cart`,
            });
            // TODO: Integrate with cart service
          }}
          onViewBundle={(bundleId) => {
            toast({
              title: 'Viewing Bundle',
              description: `Bundle ${bundleId} selected`,
            });
            // TODO: Navigate to bundle checkout
          }}
        />
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => {
              setStep('camera');
              setSelfieUrl(null);
              setOccasion('');
              setPreferences([]);
              setLook(null);
            }}
          >
            Create New Look
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

