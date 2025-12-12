import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe,
  Clock,
  MousePointerClick,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart
} from 'recharts';

// Generate time series data for charts
const generateTimeSeriesData = (days: number) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    const visitors = Math.floor(Math.random() * 500) + 2000;
    return {
      date: date.toISOString().split('T')[0],
      visitors,
      pageViews: Math.floor(Math.random() * 1500) + 5000,
      sessions: Math.floor(Math.random() * 300) + 1500,
      bounceRate: Math.floor(Math.random() * 15) + 25,
      desktop: Math.floor(visitors * 0.58),
      mobile: Math.floor(visitors * 0.35),
      tablet: Math.floor(visitors * 0.07),
    };
  });
};

// Generate hourly data
const generateHourlyData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    visitors: Math.floor(Math.random() * 200) + (i >= 9 && i <= 17 ? 100 : 20),
    pageViews: Math.floor(Math.random() * 500) + (i >= 9 && i <= 17 ? 300 : 50),
  }));
};

const COLORS = {
  direct: '#3b82f6',
  search: '#10b981',
  social: '#ec4899',
  referral: '#8b5cf6',
  desktop: '#3b82f6',
  mobile: '#10b981',
  tablet: '#8b5cf6',
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [timeSeriesData, setTimeSeriesData] = useState(generateTimeSeriesData(7));
  const [hourlyData] = useState(generateHourlyData());
  const [analytics, setAnalytics] = useState({
    visitors: {
      total: 45230,
      unique: 32150,
      returning: 13080,
      trend: 12.5,
    },
    pageViews: {
      total: 125000,
      average: 2.8,
      trend: 8.3,
    },
    engagement: {
      avgSessionDuration: 245,
      bounceRate: 32.5,
      pagesPerSession: 3.2,
    },
    traffic: {
      direct: 45,
      search: 30,
      social: 15,
      referral: 10,
    },
    topPages: [
      { path: '/', views: 45230, unique: 32150 },
      { path: '/products', views: 32150, unique: 24500 },
      { path: '/dashboard', views: 18900, unique: 15200 },
      { path: '/voice-shop', views: 12400, unique: 9800 },
    ],
    devices: {
      desktop: 58,
      mobile: 35,
      tablet: 7,
    },
    countries: [
      { country: 'United States', visitors: 18500, percentage: 41 },
      { country: 'United Kingdom', visitors: 8200, percentage: 18 },
      { country: 'Canada', visitors: 5600, percentage: 12 },
      { country: 'Australia', visitors: 4200, percentage: 9 },
    ],
  });

  useEffect(() => {
    // Update time series data based on selected range
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    setTimeSeriesData(generateTimeSeriesData(days));
  }, [timeRange]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setAnalytics(prev => ({
        ...prev,
        visitors: {
          ...prev.visitors,
          total: prev.visitors.total + Math.floor(Math.random() * 5),
        },
        pageViews: {
          ...prev.pageViews,
          total: prev.pageViews.total + Math.floor(Math.random() * 10),
        },
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Prepare data for charts
  const trafficSourceData = Object.entries(analytics.traffic).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[name as keyof typeof COLORS] || '#6b7280',
  }));

  const deviceData = Object.entries(analytics.devices).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[name as keyof typeof COLORS] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">Track your application performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.visitors.total.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              {analytics.visitors.trend}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pageViews.total.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              {analytics.pageViews.trend}% increase
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagement.avgSessionDuration}s</div>
            <div className="text-xs text-muted-foreground mt-1">
              {analytics.engagement.pagesPerSession} pages per session
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagement.bounceRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;40%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="devices">Devices & Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Overview</CardTitle>
                <CardDescription>Visitor trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return timeRange === '24h' 
                            ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
                            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="visitors" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#visitorsGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficSourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {trafficSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Page Views Over Time</CardTitle>
                <CardDescription>Daily page view trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number) => [value.toLocaleString(), 'Page Views']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pageViews" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hourly Visitor Patterns</CardTitle>
                <CardDescription>Visitor activity by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hour" 
                        tickFormatter={(value) => `${value}:00`}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(label) => `${label}:00`}
                        formatter={(value: number, name: string) => {
                          if (name === 'visitors') return [value, 'Visitors'];
                          return [value, 'Page Views'];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="visitors" name="Visitors" fill="#3b82f6" />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="pageViews" 
                        name="Page Views" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources Breakdown</CardTitle>
              <CardDescription>Detailed analysis of traffic sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.traffic).map(([source, percentage]) => (
                  <div key={source} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Globe className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium capitalize">{source}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round((analytics.visitors.total * percentage) / 100).toLocaleString()} visitors
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{percentage}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited pages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={analytics.topPages}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="path" 
                        type="category" 
                        width={90}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), 'Views']}
                      />
                      <Bar dataKey="views" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
                <CardDescription>Views vs Unique Visitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.topPages}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="path" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'views') return [value.toLocaleString(), 'Total Views'];
                          return [value.toLocaleString(), 'Unique Visitors'];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="views" name="Total Views" fill="#3b82f6" />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="unique" 
                        name="Unique Visitors" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Devices</CardTitle>
                <CardDescription>Visitor device breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Visitor locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={analytics.countries}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={70} />
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
                      />
                      <Bar dataKey="visitors" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Device Usage Trends</CardTitle>
              <CardDescription>Device distribution over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="desktopGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="mobileGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="tabletGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="desktop" 
                      name="Desktop" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="url(#desktopGradient)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mobile" 
                      name="Mobile" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="url(#mobileGradient)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tablet" 
                      name="Tablet" 
                      stackId="1"
                      stroke="#8b5cf6" 
                      fill="url(#tabletGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
