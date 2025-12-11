import HeaderNav from "@/components/layout/HeaderNav";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import RecommendationList from "@/components/recommendations/RecommendationList";
import { useAuth } from "@/contexts/AuthContext";

const StyleRecommendations = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <HeaderNav />
      <main id="main" className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Style Recommendations</h1>
            <p className="text-muted-foreground">
              Get AI-powered personalized style recommendations based on your preferences
            </p>
          </div>
          <RecommendationList userId={user?.id} />
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default StyleRecommendations;
