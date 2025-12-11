import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { toast } from 'sonner';

interface TrendData {
  topColors: Array<{ name: string; hex?: string; score: number }>;
  topStyles: Array<{ name: string; score: number }>;
  topFabrics: Array<{ name: string; score: number }>;
  styleForecasts: Record<string, Array<{ month: string; predicted: number }>>;
  timeSeries: {
    colors: Array<{
      name: string;
      hex: string;
      history: Array<{ month: string; popularity: number }>;
    }>;
    styles: Array<{
      name: string;
      history: Array<{ month: string; popularity: number }>;
    }>;
    fabrics: Array<{
      name: string;
      history: Array<{ month: string; popularity: number }>;
    }>;
  };
  personalized?: {
    topStyles: Array<{ name: string; score: number }>;
    topColors: Array<{ name: string; score: number }>;
  } | null;
  imageAnalysis?: {
    success: boolean;
    detectedStyles: string[];
    confidence: number[];
    dominantColor: string;
    notes: string;
  } | null;
}

interface TrendAnalysisResponse {
  success: boolean;
  meta: {
    region: string;
    city: string | null;
    category: string;
    generatedAt: string;
    timeframeMonths: number;
  };
  summary: {
    headline: string;
    insight: string;
  };
  data: TrendData;
  recommendations: Array<{
    type: string;
    picks?: Array<{ text: string; score: number }>;
    palette?: Array<{ name: string; hex: string | null; score: number }>;
    fabricPick?: Array<{ name: string; score: number }>;
    rationale?: string;
    text?: string;
  }>;
}

export default function TrendAnalysis() {
  const [region, setRegion] = useState('Europe');
  const [city, setCity] = useState('Paris');
  const [category, setCategory] = useState('coats');
  const [months, setMonths] = useState(8);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrendAnalysisResponse | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [sampleImageText, setSampleImageText] = useState('');

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/functions/v1/trend-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          city,
          category,
          timeframeMonths: months,
          sampleImage: sampleImageText || null,
          userProfile: { preferences: ['Bohemian'] },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }

      const result: TrendAnalysisResponse = await response.json();
      setData(result);
      if (result?.data?.topStyles && result.data.topStyles.length > 0) {
        setSelectedStyle(result.data.topStyles[0].name);
      }
      toast.success('Trend analysis loaded successfully');
    } catch (error) {
      console.error('Trend analysis error:', error);
      toast.error('Failed to load trend analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const topColorsData =
    data?.data?.topColors.map((c) => ({
      name: c.name,
      score: c.score,
      hex: c.hex,
    })) || [];

  const styleHistoryData = (styleName: string) => {
    const timeSeries = data?.data?.timeSeries;
    if (!timeSeries) return [];

    const style = timeSeries.styles.find((s) => s.name === styleName);
    if (!style) return [];

    return style.history.map((h) => ({
      month: h.month,
      popularity: h.popularity,
    }));
  };

  const selectedStyleHistory = selectedStyle
    ? styleHistoryData(selectedStyle)
    : [];

  // Combine history and forecast for selected style
  const styleForecastData = selectedStyle
    ? (() => {
        const history = selectedStyleHistory.map((h) => ({
          month: h.month,
          popularity: h.popularity,
        }));
        const forecast =
          data?.data?.styleForecasts[selectedStyle]?.map((f) => ({
            month: f.month,
            popularity: f.predicted,
          })) || [];
        return [...history, ...forecast];
      })()
    : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Trend Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          Analyze current fashion trends and market insights using mock data
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Europe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="coats"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">Months</Label>
              <Input
                id="months"
                type="number"
                min="3"
                max="24"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sampleImage">Mock Image Classifier Input</Label>
              <Input
                id="sampleImage"
                value={sampleImageText}
                onChange={(e) => setSampleImageText(e.target.value)}
                placeholder="Enter sample image ID (e.g., img123)"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchTrends} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh Trends'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{data.summary.headline}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{data.summary.insight}</p>
              <div className="flex gap-2 mt-4">
                <Badge variant="outline">Region: {data.meta.region}</Badge>
                {data.meta.city && (
                  <Badge variant="outline">City: {data.meta.city}</Badge>
                )}
                <Badge variant="outline">Category: {data.meta.category}</Badge>
                <Badge variant="outline">
                  Timeframe: {data.meta.timeframeMonths} months
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Top Colors Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Colors</CardTitle>
              </CardHeader>
              <CardContent>
                {topColorsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topColorsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="score" name="Score">
                        {topColorsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.hex || '#888'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No color data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recommendations.map((rec, idx) => (
                    <div key={idx} className="space-y-2">
                      <Badge variant="secondary">{rec.type}</Badge>
                      {rec.picks && (
                        <ul className="list-disc list-inside space-y-1">
                          {rec.picks.map((pick, i) => (
                            <li key={i} className="text-sm">
                              {pick.text} (score: {pick.score.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      )}
                      {rec.palette && (
                        <div className="flex gap-2 flex-wrap">
                          {rec.palette.map((color, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div
                                className="w-6 h-6 rounded border"
                                style={{
                                  backgroundColor: color.hex || '#ccc',
                                }}
                              />
                              <span>{color.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {rec.fabricPick && (
                        <div className="text-sm">
                          <strong>Fabrics:</strong>{' '}
                          {rec.fabricPick.map((f) => f.name).join(', ')}
                        </div>
                      )}
                      {rec.text && <p className="text-sm">{rec.text}</p>}
                      {rec.rationale && (
                        <p className="text-sm text-muted-foreground">
                          {rec.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Style Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Styles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.data.topStyles.map((style) => (
                    <Button
                      key={style.name}
                      variant={
                        selectedStyle === style.name ? 'default' : 'outline'
                      }
                      className="w-full justify-between"
                      onClick={() => setSelectedStyle(style.name)}
                    >
                      <span>{style.name}</span>
                      <Badge variant="secondary">
                        {style.score.toFixed(2)}
                      </Badge>
                    </Button>
                  ))}
                </div>

                {/* Image Analysis */}
                {data.data.imageAnalysis && (
                  <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-semibold">Image Classifier (Mock)</h4>
                    <div>
                      <strong>Detected Styles:</strong>{' '}
                      {data.data.imageAnalysis.detectedStyles.join(', ')}
                    </div>
                    <div>
                      <strong>Dominant Color:</strong>{' '}
                      <div
                        className="inline-block w-4 h-4 rounded border ml-2 align-middle"
                        style={{
                          backgroundColor:
                            data.data.imageAnalysis.dominantColor,
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {data.data.imageAnalysis.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Style History & Forecast — {selectedStyle || 'Select a style'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStyle && selectedStyleHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={styleForecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="popularity"
                        name={selectedStyle}
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a style to view its history and forecast
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Personalized Trends */}
          {data.data.personalized && (
            <Card>
              <CardHeader>
                <CardTitle>Trends For You (Personalized)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Personalized Styles</h4>
                    <div className="space-y-1">
                      {data.data.personalized.topStyles.map((style) => (
                        <div
                          key={style.name}
                          className="flex justify-between items-center"
                        >
                          <span>{style.name}</span>
                          <Badge variant="outline">
                            {style.score.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Personalized Colors</h4>
                    <div className="space-y-1">
                      {data.data.personalized.topColors.map((color) => (
                        <div
                          key={color.name}
                          className="flex justify-between items-center"
                        >
                          <span>{color.name}</span>
                          <Badge variant="outline">
                            {color.score.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

