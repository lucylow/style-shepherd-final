import { PilotKPIDashboard } from '@/components/PilotKPIDashboard';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';

export default function PilotKPIsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PilotKPIDashboard />
      </main>
      <Footer />
    </div>
  );
}

