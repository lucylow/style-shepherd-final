import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mic, PlayCircle, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const Hero = () => {
  const [stats, setStats] = useState({ returns: 0, timeSaved: 0, rating: 0 });

  useEffect(() => {
    const targets = { returns: 90, timeSaved: 50, rating: 4.9 };
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(timer);
        setStats(targets);
      } else {
        setStats({
          returns: Math.floor((targets.returns / steps) * currentStep),
          timeSaved: Math.floor((targets.timeSaved / steps) * currentStep),
          rating: parseFloat(((targets.rating / steps) * currentStep).toFixed(1)),
        });
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  const [conversation, setConversation] = useState([
    { role: "user", text: "What should I wear to a beach wedding?" },
    {
      role: "assistant",
      text: "For a beach wedding, I recommend a lightweight linen suit or a flowy maxi dress. Would you like to see some options?",
    },
  ]);
  const [input, setInput] = useState("");

  const quickActions = [
    "What's my size in Levi's?",
    "Find summer dresses under $50",
  ];

  const handleQuickAction = (question: string) => {
    setInput(question);
    addMessage(question);
  };

  const addMessage = (text: string) => {
    setConversation([...conversation, { role: "user", text }]);
    setInput("");

    setTimeout(() => {
      const responses: Record<string, string> = {
        "What's my size in Levi's?":
          "Based on your profile, you're a size 31 in Levi's 511 jeans. Your usual size 32 runs a bit large in this brand.",
        "Find summer dresses under $50":
          "I found 15 summer dresses under $50 that match your style! Showing options from H&M, Old Navy, and ASOS with low return risk.",
      };
      const response =
        responses[text] ||
        "I'd be happy to help with that! Could you provide a bit more detail about what you're looking for?";
      setConversation((prev) => [...prev, { role: "assistant", text: response }]);
    }, 1000);
  };

  return (
    <section className="pt-16 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] text-white relative overflow-hidden gradient-animate">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-float-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-2xl animate-float-slow" style={{ animationDelay: '3s' }} />
        {/* Additional floating particles with more variety */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white/40 rounded-full animate-float shadow-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-white/30 rounded-full animate-float shadow-glow" style={{ animationDelay: '3s' }} />
        <div className="absolute top-2/3 right-1/3 w-2.5 h-2.5 bg-white/35 rounded-full animate-float shadow-glow" style={{ animationDelay: '5s' }} />
        <div className="absolute top-1/2 left-1/5 w-2 h-2 bg-white/25 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/5 w-3 h-3 bg-white/20 rounded-full animate-float" style={{ animationDelay: '4s' }} />
      </div>
      
      {/* Enhanced grid overlay with better visibility */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2 backdrop-blur-md border border-white/30 shadow-lg"
            >
                <Mic className="w-4 h-4 text-fashion-gold animate-pulse" />
                <span className="text-xs sm:text-sm font-medium">AI-Powered Fashion Assistant</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight"
              >
                Your Personal
                <span className="text-fashion-gold block drop-shadow-2xl bg-gradient-to-r from-fashion-gold via-yellow-400 to-fashion-gold bg-clip-text text-transparent animate-pulse-slow">Fashion</span>
                AI Stylist
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg sm:text-xl text-blue-100 max-w-2xl leading-relaxed"
              >
                Stop guessing sizes and dealing with returns. Style Shepherd uses advanced AI to predict your perfect fit and reduce returns by up to 90%.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
            >
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.98 }}
                className="group ripple-effect"
              >
                <Button
                  size="lg"
                  className="bg-fashion-gold text-gray-900 hover:bg-fashion-gold/90 font-bold shadow-2xl hover:shadow-glow transition-all group-hover:shadow-2xl relative overflow-hidden"
                  asChild
                >
                  <Link to="/dashboard" className="flex items-center relative z-10">
                    <Mic className="mr-2 h-5 w-5 group-hover:animate-pulse transition-transform" />
                    Try Voice Assistant
                  </Link>
                </Button>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.98 }}
                className="group ripple-effect"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/90 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white font-semibold shadow-lg hover:shadow-xl transition-all relative overflow-hidden"
                  asChild
                >
                  <Link to="/dashboard" className="flex items-center relative z-10">
                    <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-4 sm:gap-8 pt-8"
            >
              <motion.div 
                whileHover={{ scale: 1.1, y: -5, rotate: 1 }}
                className="text-center p-4 sm:p-6 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 hover:bg-white/25 hover:border-white/40 transition-all shadow-elevated hover:shadow-glow"
              >
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">{stats.returns}%</div>
                <div className="text-blue-100 text-xs sm:text-sm mt-1 font-medium">Returns Reduced</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -5, rotate: -1 }}
                className="text-center p-4 sm:p-6 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 hover:bg-white/25 hover:border-white/40 transition-all shadow-elevated hover:shadow-glow"
              >
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">{stats.timeSaved}%</div>
                <div className="text-blue-100 text-xs sm:text-sm mt-1 font-medium">Time Saved</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -5, rotate: 1 }}
                className="text-center p-4 sm:p-6 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 hover:bg-white/25 hover:border-white/40 transition-all shadow-elevated hover:shadow-glow"
              >
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">{stats.rating}</div>
                <div className="text-blue-100 text-xs sm:text-sm mt-1 font-medium">User Rating</div>
              </motion.div>
            </motion.div>
          </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative group"
            >
            <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 relative z-10 border border-gray-100/50 backdrop-blur-sm hover:shadow-elevated-xl transition-all duration-300 hover:scale-[1.01] shimmer-effect">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative mx-auto mb-4"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg animate-voice-pulse">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </motion.div>
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ask Me Anything</h3>
                <p className="text-gray-600 flex items-center justify-center gap-2">
                  <Bot className="w-4 h-4" />
                  About fashion, sizing, or styling
                </p>
              </div>

              <div className="space-y-3 mb-4 sm:mb-6 h-40 sm:h-48 overflow-y-auto scrollbar-thin">
                <AnimatePresence>
                  {conversation.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className={`flex items-start gap-2 ${
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === "user"
                            ? "bg-primary/20 text-primary"
                            : "bg-gradient-to-br from-primary to-primary/70 text-white shadow-md"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>
                      
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[75%] shadow-sm ${
                          msg.role === "user"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-gradient-to-br from-primary to-primary/90 text-white"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex space-x-4">
                <Input
                  type="text"
                  placeholder="Type your fashion question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && input && addMessage(input)}
                  className="flex-1"
                />
                <Button onClick={() => input && addMessage(input)}>
                  <span>→</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleQuickAction(action)}
                    className="text-xs"
                  >
                    "{action}"
                  </Button>
                ))}
              </div>
            </div>

            <motion.div 
              animate={{ 
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-4 -right-4 w-24 h-24 bg-fashion-gold rounded-full blur-xl"
            />
            <motion.div
              animate={{ 
                y: [0, 20, 0],
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary rounded-full blur-xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
