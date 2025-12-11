import TrendAnalysis from './TrendAnalysis';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';

export default function TrendAnalysisPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1">
        <TrendAnalysis />
      </main>
      <Footer />
    </div>
  );
}

