import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ruler, Brain, CheckCircle2, AlertTriangle, 
  ShoppingCart, RefreshCw, Share2, Loader2,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { sizeComparisonService, type BodyMeasurement, type SizeComparisonResult } from '@/services/sizeComparisonService';
import Layout from '@/components/Layout';

interface BrandOption {
  id: string;
  name: string;
  color: string;
}

const AVAILABLE_BRANDS: BrandOption[] = [
  { id: 'Nike', name: 'Nike', color: 'bg-blue-500' },
  { id: 'Adidas', name: 'Adidas', color: 'bg-pink-500' },
  { id: 'Zara', name: 'Zara', color: 'bg-purple-500' },
  { id: 'H&M', name: 'H&M', color: 'bg-green-500' },
];

const CATEGORIES = ['T-Shirts', 'Jeans', 'Jackets', 'Sweaters', 'Dresses'];

export default function SizeComparison() {
  const [measurements, setMeasurements] = useState<BodyMeasurement>({
    height: 170,
    chest: 95,
    waist: 85,
    hips: 98,
  });
  
  const [selectedBrands, setSelectedBrands] = useState<string[]>(['Nike', 'Zara']);
  const [category, setCategory] = useState('T-Shirts');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    comparisons: SizeComparisonResult[];
    summary: {
      bestOverallSize: string;
      consistencyScore: number;
      recommendations: string[];
    };
  } | null>(null);

  const handleSliderChange = (key: keyof BodyMeasurement, value: number[]) => {
    setMeasurements(prev => ({ ...prev, [key]: value[0] }));
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId)
        ? prev.filter(b => b !== brandId)
        : [...prev, brandId]
    );
  };

  const analyzeSizes = async () => {
    if (selectedBrands.length === 0) {
      toast.error('Please select at least one brand');
      return;
    }

    setLoading(true);
    try {
      const response = await sizeComparisonService.compareSizes({
        bodyMeasurements: measurements,
        brands: selectedBrands,
        category,
        preferredFit: 'normal',
      });

      if (response.success && response.data) {
        setResults(response.data);
        toast.success('Size analysis complete!');
      } else {
        toast.error(response.error || 'Failed to analyze sizes');
      }
    } catch (error) {
      console.error('Size comparison error:', error);
      toast.error('An error occurred while analyzing sizes');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-green-600';
    if (confidence >= 0.70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (Math.abs(variance) < 1) return <Minus className="h-4 w-4" />;
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                      <Ruler className="text-white h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl md:text-4xl bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        Size Shepherd
                      </CardTitle>
                      <CardDescription className="text-base font-medium">
                        Smart Size Comparison Across Brands
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Powered Sizing
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-purple-500" />
                    Your Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Measurement Sliders */}
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Slider
                        value={[measurements.height || 170]}
                        onValueChange={(v) => handleSliderChange('height', v)}
                        min={150}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-lg font-bold text-gray-800">
                        {measurements.height || 170} cm
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Chest (cm)</Label>
                      <Slider
                        value={[measurements.chest || 95]}
                        onValueChange={(v) => handleSliderChange('chest', v)}
                        min={80}
                        max={120}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-lg font-bold text-gray-800">
                        {measurements.chest || 95} cm
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Waist (cm)</Label>
                      <Slider
                        value={[measurements.waist || 85]}
                        onValueChange={(v) => handleSliderChange('waist', v)}
                        min={60}
                        max={110}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-lg font-bold text-gray-800">
                        {measurements.waist || 85} cm
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Hips (cm)</Label>
                      <Slider
                        value={[measurements.hips || 98]}
                        onValueChange={(v) => handleSliderChange('hips', v)}
                        min={80}
                        max={130}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-lg font-bold text-gray-800">
                        {measurements.hips || 98} cm
                      </div>
                    </div>
                  </div>

                  {/* Brand Selection */}
                  <div className="space-y-4">
                    <Label>Select Brands</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2">
                      {AVAILABLE_BRANDS.map((brand) => (
                        <label
                          key={brand.id}
                          className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                            selectedBrands.includes(brand.id)
                              ? 'bg-purple-50 border-purple-500'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox
                            checked={selectedBrands.includes(brand.id)}
                            onCheckedChange={() => toggleBrand(brand.id)}
                            className="mr-3"
                          />
                          <div className={`w-6 h-6 rounded ${brand.color} mr-2`} />
                          <span className="text-sm font-medium">{brand.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Analyze Button */}
                  <Button
                    onClick={analyzeSizes}
                    disabled={loading || selectedBrands.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg font-bold shadow-lg"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-5 w-5" />
                        Analyze Sizes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  {/* Comparison Results */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Size Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {results.comparisons.map((comparison, idx) => {
                        const isBestMatch = comparison.confidence >= 0.85;
                        return (
                          <motion.div
                            key={comparison.brand}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-4 rounded-xl border-2 ${
                              isBestMatch
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-bold">
                                  {comparison.brand[0]}
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{comparison.brand}</h3>
                                  {isBestMatch && (
                                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span>Best Match ({Math.round(comparison.confidence * 100)}% confidence)</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-3xl font-bold ${getConfidenceColor(comparison.confidence)}`}>
                                  {comparison.recommendedSize}
                                </div>
                                <div className="text-sm text-gray-500">Recommended</div>
                              </div>
                            </div>

                            {/* Measurement Matches */}
                            <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                              {comparison.measurementsMatch.chest && (
                                <div className="text-center">
                                  <div className="font-bold text-xl">
                                    {comparison.measurementsMatch.chest.variance.toFixed(1)}cm
                                  </div>
                                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                    {comparison.measurementsMatch.chest.match ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <AlertTriangle className="h-3 w-3 text-orange-600" />
                                    )}
                                    Chest
                                  </div>
                                </div>
                              )}
                              <div className="text-center">
                                <div className="font-bold text-xl">
                                  {comparison.measurementsMatch.waist.variance.toFixed(1)}cm
                                </div>
                                <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                  {comparison.measurementsMatch.waist.match ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                                  )}
                                  Waist
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-xl">
                                  {comparison.measurementsMatch.hips.variance.toFixed(1)}cm
                                </div>
                                <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                  {comparison.measurementsMatch.hips.match ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                                  )}
                                  Hips
                                </div>
                              </div>
                            </div>

                            {/* Confidence Bar */}
                            <div className="mt-3">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500`}
                                  style={{ width: `${comparison.confidence * 100}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {Math.round(comparison.confidence * 100)}% match confidence
                              </div>
                            </div>

                            {/* Risk Factors */}
                            {comparison.riskFactors.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {comparison.riskFactors.map((risk, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {risk}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">Best Overall Size</div>
                          <div className="text-2xl font-bold text-green-600">
                            {results.summary.bestOverallSize}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Consistency Score</div>
                          <div className="text-xl font-bold">
                            {Math.round(results.summary.consistencyScore * 100)}%
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">Recommendations:</div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {results.summary.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button className="bg-green-500 hover:bg-green-600">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Shop Recommended Sizes
                    </Button>
                    <Button variant="outline" onClick={analyzeSizes} disabled={loading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refine Measurements
                    </Button>
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Results
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}

