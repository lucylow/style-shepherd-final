import HeaderNav from "@/components/layout/HeaderNav";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import Hero from "@/components/common/Hero";
import Features from "@/components/common/Features";
import { ResearchStats } from "@/components/agents/ResearchStats";
import ReturnsCalculator from "@/components/shopping/ReturnsCalculator";
import Testimonials from "@/components/common/Testimonials";
import CTASection from "@/components/common/CTASection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <HeaderNav />
      <main id="main">
        <Hero />
        <Features />
        <ResearchStats />
        <ReturnsCalculator />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Index;
