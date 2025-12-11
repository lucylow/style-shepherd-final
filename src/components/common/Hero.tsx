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
    <section className="pt-16 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#667eea] text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid-white/5 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
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
                className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight"
              >
                Your Personal
                <span className="text-fashion-gold block drop-shadow-lg">Fashion</span>
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
                className="group"
              >
                <Button
                  size="lg"
                  className="bg-fashion-gold text-gray-900 hover:bg-fashion-gold/90 font-bold shadow-2xl hover:shadow-glow transition-all group-hover:shadow-2xl"
                  asChild
                >
                  <Link to="/dashboard" className="flex items-center">
                    <Mic className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                    Try Voice Assistant
                  </Link>
                </Button>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/90 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link to="/dashboard" className="flex items-center">
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
                whileHover={{ scale: 1.1, y: -5 }}
                className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold">{stats.returns}%</div>
                <div className="text-blue-200 text-xs sm:text-sm mt-1">Returns Reduced</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -5 }}
                className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold">{stats.timeSaved}%</div>
                <div className="text-blue-200 text-xs sm:text-sm mt-1">Time Saved</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -5 }}
                className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold">{stats.rating}</div>
                <div className="text-blue-200 text-xs sm:text-sm mt-1">User Rating</div>
              </motion.div>
            </motion.div>
          </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative group"
            >
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 relative z-10 border border-gray-100/50 backdrop-blur-sm hover:shadow-elevated-xl transition-shadow duration-300">
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
