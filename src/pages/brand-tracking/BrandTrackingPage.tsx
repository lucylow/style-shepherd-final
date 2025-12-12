/**
 * Brand Tracking Page
 * 
 * Main page for brand monitoring and comparison features
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BrandMonitoringDashboard from '@/components/brand-tracking/BrandMonitoringDashboard';
import BrandComparison from '@/components/brand-tracking/BrandComparison';
import { SearchableSEO } from '@/components/seo/SearchableSEO';

export default function BrandTrackingPage() {
  return (
    <>
      <SearchableSEO
        title="Brand Tracking - Style Shepherd"
        description="Monitor and compare SEO metrics for fashion e-commerce brands including Zara, H&M, Nike, ASOS, Nordstrom, and more."
      />
      <div className="container mx-auto py-6">
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monitoring">Monitoring Dashboard</TabsTrigger>
            <TabsTrigger value="comparison">Brand Comparison</TabsTrigger>
          </TabsList>
          <TabsContent value="monitoring" className="mt-6">
            <BrandMonitoringDashboard />
          </TabsContent>
          <TabsContent value="comparison" className="mt-6">
            <BrandComparison />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
