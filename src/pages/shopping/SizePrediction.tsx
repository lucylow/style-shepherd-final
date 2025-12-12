import HeaderNav from "@/components/layout/HeaderNav";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SizePredictionDemo from "@/components/shopping/SizePredictionDemo";

const SizePrediction = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <HeaderNav />
      <main id="main">
        <SizePredictionDemo />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default SizePrediction;

