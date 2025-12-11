import { JudgeDemo } from '@/components/demo/JudgeDemo';
import { PilotKPIDashboard } from '@/components/PilotKPIDashboard';
import { UnitEconomicsCalculator } from '@/components/UnitEconomicsCalculator';
import { SponsorDashboard } from '@/components/SponsorDashboard';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlayCircle, BarChart3, Calculator, Building2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JudgeDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1 w-full">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Interactive Demo Hub</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Experience Style Shepherd
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Explore our AI-powered fashion platform through interactive demos and real-time metrics
              </p>
            </motion.div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Tabs defaultValue="demo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50">
              <TabsTrigger 
                value="demo" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Interactive Demo</span>
                <span className="sm:hidden">Demo</span>
              </TabsTrigger>
              <TabsTrigger 
                value="kpis" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Pilot KPIs</span>
                <span className="sm:hidden">KPIs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="economics" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Unit Economics</span>
                <span className="sm:hidden">Economics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sponsor" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Sponsor Metrics</span>
                <span className="sm:hidden">Sponsor</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demo" className="mt-8">
              <JudgeDemo />
            </TabsContent>

            <TabsContent value="kpis" className="mt-8">
              <PilotKPIDashboard />
            </TabsContent>

            <TabsContent value="economics" className="mt-8">
              <UnitEconomicsCalculator />
            </TabsContent>

            <TabsContent value="sponsor" className="mt-8">
              <SponsorDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}

