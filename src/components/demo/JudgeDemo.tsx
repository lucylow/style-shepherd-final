/**
 * Judge-Ready Demo Component
 * Enhanced interactive demo with better visuals and UX
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Sparkles, CheckCircle2, TrendingDown, Leaf, Target, 
  Play, Pause, RotateCcw, Zap, Shield, Brain, ArrowRight,
  User, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface DemoStep {
  id: number;
  duration: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  userMessage?: string;
  assistantResponse: string;
  metrics?: {
    label: string;
    value: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down';
    color?: string;
  }[];
  highlight?: string;
}

const DEMO_SCRIPT: DemoStep[] = [
  {
    id: 1,
    duration: 10,
    title: 'Voice-First Fashion Discovery',
    subtitle: 'Natural conversation, instant understanding',
    icon: <Mic className="w-5 h-5" />,
    color: 'from-blue-500 to-purple-500',
    userMessage: 'I need something for a beach wedding that matches my skin tone',
    assistantResponse: "I'll help you find the perfect beach wedding outfit! Based on your style profile, I recommend a light, flowy maxi dress. Would you like me to show you options in your preferred colors?",
    metrics: [
      { label: 'Response Time', value: '<250ms', icon: <Zap className="w-4 h-4" />, color: 'text-blue-500' },
      { label: 'Intent Accuracy', value: '94%', icon: <Target className="w-4 h-4" />, color: 'text-green-500', trend: 'up' },
    ],
  },
  {
    id: 2,
    duration: 15,
    title: 'Multi-Agent Intelligence',
    subtitle: 'Size Oracle Agent predicts perfect fit',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-purple-500 to-pink-500',
    assistantResponse: "I've analyzed your measurements and past purchases. For this brand, I recommend size Medium. My Fit Confidence is 92% based on your chest measurement (38\") matching this brand's sizing matrix.",
    metrics: [
      { label: 'Fit Confidence', value: '92%', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500', trend: 'up' },
      { label: 'Size Prediction', value: 'Medium', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-500' },
      { label: 'Cross-Brand Accuracy', value: '89%', icon: <Target className="w-4 h-4" />, color: 'text-blue-500', trend: 'up' },
    ],
    highlight: 'Chest fit + 3% sizing variance in this brand',
  },
  {
    id: 3,
    duration: 20,
    title: 'Returns Prophet Engine',
    subtitle: 'Proactive returns prevention powered by AI',
    icon: <Shield className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500',
    assistantResponse: "Great choice! I've analyzed this item and your purchase history. Return Risk: 12% (low). This is excellent - your past successful purchases in similar styles suggest a 88% fit likelihood. Estimated savings: $45 in return costs and 5.8kg CO₂ prevented.",
    metrics: [
      { label: 'Return Risk', value: '12%', icon: <TrendingDown className="w-4 h-4" />, color: 'text-green-500', trend: 'down' },
      { label: 'Fit Likelihood', value: '88%', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500', trend: 'up' },
      { label: 'CO₂ Saved', value: '5.8kg', icon: <Leaf className="w-4 h-4" />, color: 'text-emerald-500' },
    ],
    highlight: 'Style compatibility + brand fit history + measurement match',
  },
  {
    id: 4,
    duration: 15,
    title: 'Intelligent Recommendations',
    subtitle: 'Context-aware styling suggestions',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-500',
    assistantResponse: "Based on your beach wedding context and style preferences, here are 3 additional options that would work well. All have Return Risk below 15% and match your color palette.",
    metrics: [
      { label: 'Items Recommended', value: '3', icon: <Sparkles className="w-4 h-4" />, color: 'text-pink-500' },
      { label: 'Avg Return Risk', value: '13%', icon: <TrendingDown className="w-4 h-4" />, color: 'text-green-500', trend: 'down' },
      { label: 'Style Match', value: '95%', icon: <Target className="w-4 h-4" />, color: 'text-purple-500', trend: 'up' },
    ],
  },
];

export const JudgeDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentStepData = DEMO_SCRIPT[currentStep];

  useEffect(() => {
    if (!isPlaying || isComplete) return;

    setTimeRemaining(currentStepData.duration);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (currentStep < DEMO_SCRIPT.length - 1) {
            setCurrentStep((step) => step + 1);
            return DEMO_SCRIPT[currentStep + 1].duration;
          } else {
            setIsComplete(true);
            setIsPlaying(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, isComplete, currentStepData.duration]);

  const startDemo = () => {
    setCurrentStep(0);
    setIsComplete(false);
    setIsPlaying(true);
    setTimeRemaining(DEMO_SCRIPT[0].duration);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setIsComplete(false);
    setTimeRemaining(0);
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setIsPlaying(false);
    setIsComplete(false);
    setTimeRemaining(DEMO_SCRIPT[stepIndex].duration);
  };

  const progress = ((currentStep + 1) / DEMO_SCRIPT.length) * 100;
  const stepProgress = currentStepData ? ((currentStepData.duration - timeRemaining) / currentStepData.duration) * 100 : 0;
  const totalDuration = DEMO_SCRIPT.reduce((sum, step) => sum + step.duration, 0);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">Interactive Feature Demo</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalDuration}s showcase • {DEMO_SCRIPT.length} steps
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={isPlaying ? () => setIsPlaying(false) : startDemo}
                disabled={isComplete}
                variant={isPlaying ? 'secondary' : 'default'}
                size="lg"
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Demo
                  </>
                )}
              </Button>
              {isComplete && (
                <Button onClick={resetDemo} variant="outline" size="lg" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="space-y-3 mt-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">Step {currentStep + 1} of {DEMO_SCRIPT.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            {isPlaying && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{currentStepData.title}</span>
                <span className="font-medium tabular-nums">{timeRemaining}s remaining</span>
              </div>
            )}
            {isPlaying && <Progress value={stepProgress} className="h-1" />}
          </div>
        </CardHeader>
      </Card>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DEMO_SCRIPT.map((step, index) => (
          <motion.button
            key={step.id}
            onClick={() => goToStep(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              index === currentStep
                ? 'border-primary bg-primary/10 shadow-lg'
                : index < currentStep
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-border bg-card hover:bg-accent/50'
            }`}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${step.color} ${
                index === currentStep ? 'scale-110' : 'opacity-60'
              } transition-transform`}>
                {step.icon}
              </div>
              <div className="w-full space-y-1">
                <div className="text-xs font-semibold line-clamp-2">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.duration}s</div>
              </div>
              {index < currentStep && (
                <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-green-500" />
              )}
              {index === currentStep && isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary"
                />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Current Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-2">
            <CardHeader className={`bg-gradient-to-r ${currentStepData.color} text-white p-6`}>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    Step {currentStepData.id}
                  </Badge>
                  <CardTitle className="text-2xl md:text-3xl text-white">
                    {currentStepData.title}
                  </CardTitle>
                  <p className="text-white/90 text-sm md:text-base">
                    {currentStepData.subtitle}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                  {currentStepData.icon}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Conversation */}
              <div className="space-y-4">
                {currentStepData.userMessage && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start gap-4"
                  >
                    <div className="p-2 rounded-full bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        User
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="text-foreground">"{currentStepData.userMessage}"</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: currentStepData.userMessage ? 0.4 : 0.2 }}
                  className="flex items-start gap-4"
                >
                  <div className={`p-2 rounded-full bg-gradient-to-br ${currentStepData.color} flex-shrink-0`}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <span>Style Shepherd AI</span>
                      <Badge variant="secondary" className="text-xs">Real-time</Badge>
                    </div>
                    <div className={`p-4 rounded-lg bg-gradient-to-br ${currentStepData.color}/10 border-2 border-primary/30`}>
                      <p className="text-foreground leading-relaxed">{currentStepData.assistantResponse}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Highlight */}
              {currentStepData.highlight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="p-4 rounded-lg bg-green-500/10 border-2 border-green-500/20"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-green-700 dark:text-green-400 mb-1">
                        Why This Works
                      </div>
                      <p className="text-sm text-muted-foreground">{currentStepData.highlight}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Metrics */}
              {currentStepData.metrics && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {currentStepData.metrics.map((metric, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="p-5 rounded-lg border-2 border-border bg-card hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-muted`}>
                          <div className={metric.color || 'text-primary'}>
                            {metric.icon}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {metric.label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{metric.value}</span>
                        {metric.trend === 'up' && (
                          <TrendingDown className="w-5 h-5 text-green-500 rotate-180" />
                        )}
                        {metric.trend === 'down' && (
                          <TrendingDown className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Completion Summary */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Demo Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Voice-first conversational interface',
                  'Multi-agent architecture (Size Oracle + Returns Prophet)',
                  'Proactive returns prevention (12% vs 25% industry avg)',
                  'Interpretable confidence scores & reasoning',
                  'Environmental impact tracking (5.8kg CO₂ saved)',
                ].map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Response Latency', value: '<250ms', color: 'text-blue-500' },
                  { label: 'Fit Confidence', value: '92%', color: 'text-green-500' },
                  { label: 'Return Risk Reduction', value: '52% lower', color: 'text-green-500' },
                  { label: 'Environmental Impact', value: '5.8kg CO₂ saved', color: 'text-emerald-500' },
                ].map((metric, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium">{metric.label}</span>
                    <span className={`font-bold ${metric.color}`}>{metric.value}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
