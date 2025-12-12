import { motion } from 'framer-motion';
import HeaderNav from "@/components/layout/HeaderNav";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import RecommendationList from "@/components/recommendations/RecommendationList";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Sparkles } from "lucide-react";

const StyleRecommendations = () => {
  const { user } = useAuth();

  return (
    <ErrorBoundary>
      <div className="min-h-screen pb-20 md:pb-0">
        <HeaderNav />
        <main id="main" className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Style Recommendations</h1>
                  <p className="text-muted-foreground">
                    Get AI-powered personalized style recommendations based on your preferences
                  </p>
                </div>
              </div>
            </motion.div>
            <RecommendationList userId={user?.id} />
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </ErrorBoundary>
  );
};

export default StyleRecommendations;
