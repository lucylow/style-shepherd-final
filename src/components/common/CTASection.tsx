import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f093fb] via-[#f5576c] to-[#4facfe] text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight"
        >
          Ready to Transform Your Shopping Experience?
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg sm:text-xl mb-8 opacity-90 leading-relaxed"
        >
          Join thousands of smart shoppers who never worry about returns again.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row justify-center gap-4 sm:space-x-6"
        >
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-bold shadow-2xl hover:shadow-elevated-xl w-full sm:w-auto transition-all"
              asChild
            >
              <Link to="/dashboard">Try Free Demo</Link>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/90 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white w-full sm:w-auto transition-all shadow-lg"
            >
              Schedule Demo
            </Button>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-sm opacity-80 flex flex-wrap justify-center gap-2 sm:gap-4"
        >
          <span>No credit card required</span>
          <span className="hidden sm:inline">•</span>
          <span>14-day free trial</span>
          <span className="hidden sm:inline">•</span>
          <span>Cancel anytime</span>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
