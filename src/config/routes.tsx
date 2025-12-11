/**
 * Route Configuration
 * 
 * Centralized route definitions organized by feature area.
 * This makes it easier to maintain and understand the application structure.
 */

import { lazy } from 'react';
import PageTransition from '@/components/common/PageTransition';

// Public pages
const Index = lazy(() => import('@/pages/Index'));
const FeaturesExplorer = lazy(() => import('@/pages/FeaturesExplorer'));
const FeaturePage = lazy(() => import('@/pages/FeaturePage'));
const Products = lazy(() => import('@/pages/shopping/Products'));
const VoiceShop = lazy(() => import('@/pages/VoiceShop'));

// Authentication pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));

// Dashboard & User pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const Dashboard = lazy(() => import('@/pages/Dashboard')); // Legacy
const AIMemory = lazy(() => import('@/pages/AIMemory'));

// Agent pages
const AgentsDashboard = lazy(() => import('@/pages/agents/AgentsDashboard'));
const AgentDetails = lazy(() => import('@/pages/agents/AgentDetails'));
const AgentCreate = lazy(() => import('@/pages/agents/AgentCreate'));
const AgentAnalytics = lazy(() => import('@/pages/agents/AgentAnalytics'));

// Shopping & Checkout pages
const Checkout = lazy(() => import('@/pages/shopping/Checkout'));
const OrderSuccess = lazy(() => import('@/pages/shopping/OrderSuccess'));
const SubscriptionCheckout = lazy(() => import('@/pages/shopping/SubscriptionCheckout'));
const SubscriptionSuccess = lazy(() => import('@/pages/shopping/SubscriptionSuccess'));

// Idea Quality Framework pages
const IdeaQualityIndex = lazy(() => import('@/pages/idea-quality/IdeaQualityIndex'));
const CompetitiveAnalysis = lazy(() => import('@/pages/idea-quality/CompetitiveAnalysis'));
const MarketOpportunity = lazy(() => import('@/pages/idea-quality/MarketOpportunity'));
const ProblemValidation = lazy(() => import('@/pages/idea-quality/ProblemValidation'));
const InnovationScoring = lazy(() => import('@/pages/idea-quality/InnovationScoring'));
const ImpactMeasurement = lazy(() => import('@/pages/idea-quality/ImpactMeasurement'));
const CompetitiveMoats = lazy(() => import('@/pages/idea-quality/CompetitiveMoats'));
const IdeaQualityAssessment = lazy(() => import('@/pages/idea-quality/IdeaQualityAssessment'));
const JudgingCriteriaAssessment = lazy(() => import('@/pages/idea-quality/JudgingCriteriaAssessment'));

// Judge-Ready Demo pages
const JudgeDemoPage = lazy(() => import('@/pages/demo/JudgeDemo'));
const PilotKPIsPage = lazy(() => import('@/pages/demo/PilotKPIs'));
const UnitEconomicsPage = lazy(() => import('@/pages/demo/UnitEconomics'));
const SponsorMetricsPage = lazy(() => import('@/pages/demo/SponsorMetrics'));

// Lovable Cloud pages
const LovableDashboard = lazy(() => import('@/pages/lovable/LovableDashboard'));
const LovableDeployment = lazy(() => import('@/pages/lovable/LovableDeployment'));
const LovableMonitoring = lazy(() => import('@/pages/lovable/LovableMonitoring'));
const LovableSettings = lazy(() => import('@/pages/lovable/LovableSettings'));
const LovableAnalytics = lazy(() => import('@/pages/lovable/LovableAnalytics'));
const LovableEnvironment = lazy(() => import('@/pages/lovable/LovableEnvironment'));
const LovableLogs = lazy(() => import('@/pages/lovable/LovableLogs'));
const LovableHealth = lazy(() => import('@/pages/lovable/LovableHealth'));

// Demo & Integration pages
const DemoIntegrations = lazy(() => import('@/pages/demo/DemoIntegrations'));
const FashioniDemo = lazy(() => import('@/pages/demo/FashioniDemo'));

// Admin pages
const AdminRisk = lazy(() => import('@/pages/AdminRisk'));

// Error pages
const NotFound = lazy(() => import('@/pages/NotFound'));

/**
 * Route definition interface
 */
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  label?: string;
  group?: string;
}

/**
 * Helper function to create a route element with transition
 */
export const createRouteElement = (
  Component: React.ComponentType,
  pathname: string
) => (
  <PageTransition keyProp={pathname}>
    <Component />
  </PageTransition>
);

/**
 * Route configurations organized by feature area
 */
export const routeConfigs: RouteConfig[] = [
  // Public routes
  {
    path: '/',
    component: Index,
    label: 'Home',
    group: 'public',
  },
  {
    path: '/features',
    component: FeaturesExplorer,
    label: 'Features',
    group: 'public',
  },
  {
    path: '/features/:id',
    component: FeaturePage,
    label: 'Feature Details',
    group: 'public',
  },
  {
    path: '/products',
    component: Products,
    label: 'Products',
    group: 'public',
  },
  {
    path: '/voice-shop',
    component: VoiceShop,
    label: 'Voice Shop',
    group: 'public',
  },

  // Authentication routes
  {
    path: '/login',
    component: Login,
    label: 'Login',
    group: 'auth',
  },
  {
    path: '/signup',
    component: Signup,
    label: 'Sign Up',
    group: 'auth',
  },
  {
    path: '/auth/callback',
    component: AuthCallback,
    label: 'Auth Callback',
    group: 'auth',
  },

  // Dashboard & User routes
  {
    path: '/dashboard',
    component: DashboardPage,
    label: 'Dashboard',
    group: 'user',
  },
  {
    path: '/ai-memory',
    component: AIMemory,
    label: 'AI Memory',
    group: 'user',
  },
  {
    path: '/old-dashboard',
    component: Dashboard,
    label: 'Legacy Dashboard',
    group: 'user',
  },

  // Agent routes
  {
    path: '/agents',
    component: AgentsDashboard,
    label: 'Agents Dashboard',
    group: 'agents',
  },
  {
    path: '/agents/create',
    component: AgentCreate,
    label: 'Create Agent',
    group: 'agents',
  },
  {
    path: '/agents/:id/analytics',
    component: AgentAnalytics,
    label: 'Agent Analytics',
    group: 'agents',
  },
  {
    path: '/agents/:id',
    component: AgentDetails,
    label: 'Agent Details',
    group: 'agents',
  },

  // Shopping & Checkout routes
  {
    path: '/checkout',
    component: Checkout,
    label: 'Checkout',
    group: 'shopping',
  },
  {
    path: '/order-success',
    component: OrderSuccess,
    label: 'Order Success',
    group: 'shopping',
  },
  {
    path: '/subscription-checkout',
    component: SubscriptionCheckout,
    label: 'Subscription Checkout',
    group: 'shopping',
  },
  {
    path: '/subscription-success',
    component: SubscriptionSuccess,
    label: 'Subscription Success',
    group: 'shopping',
  },

  // Idea Quality Framework routes
  {
    path: '/idea-quality',
    component: IdeaQualityIndex,
    label: 'Idea Quality',
    group: 'idea-quality',
  },
  {
    path: '/competitive-analysis',
    component: CompetitiveAnalysis,
    label: 'Competitive Analysis',
    group: 'idea-quality',
  },
  {
    path: '/market-opportunity',
    component: MarketOpportunity,
    label: 'Market Opportunity',
    group: 'idea-quality',
  },
  {
    path: '/problem-validation',
    component: ProblemValidation,
    label: 'Problem Validation',
    group: 'idea-quality',
  },
  {
    path: '/innovation-scoring',
    component: InnovationScoring,
    label: 'Innovation Scoring',
    group: 'idea-quality',
  },
  {
    path: '/impact-measurement',
    component: ImpactMeasurement,
    label: 'Impact Measurement',
    group: 'idea-quality',
  },
  {
    path: '/competitive-moats',
    component: CompetitiveMoats,
    label: 'Competitive Moats',
    group: 'idea-quality',
  },
  {
    path: '/idea-quality-assessment',
    component: IdeaQualityAssessment,
    label: 'Idea Quality Assessment',
    group: 'idea-quality',
  },
  {
    path: '/judging-criteria',
    component: JudgingCriteriaAssessment,
    label: 'Judging Criteria',
    group: 'idea-quality',
  },

  // Judge-Ready Demo routes
  {
    path: '/demo',
    component: JudgeDemoPage,
    label: 'Judge Demo',
    group: 'demo',
  },
  {
    path: '/pilot-kpis',
    component: PilotKPIsPage,
    label: 'Pilot KPIs',
    group: 'demo',
  },
  {
    path: '/unit-economics',
    component: UnitEconomicsPage,
    label: 'Unit Economics',
    group: 'demo',
  },
  {
    path: '/sponsor-metrics',
    component: SponsorMetricsPage,
    label: 'Sponsor Metrics',
    group: 'demo',
  },

  // Lovable Cloud routes
  {
    path: '/lovable',
    component: LovableDashboard,
    label: 'Lovable Dashboard',
    group: 'lovable',
  },
  {
    path: '/lovable/deployment',
    component: LovableDeployment,
    label: 'Deployment',
    group: 'lovable',
  },
  {
    path: '/lovable/monitoring',
    component: LovableMonitoring,
    label: 'Monitoring',
    group: 'lovable',
  },
  {
    path: '/lovable/settings',
    component: LovableSettings,
    label: 'Settings',
    group: 'lovable',
  },
  {
    path: '/lovable/analytics',
    component: LovableAnalytics,
    label: 'Analytics',
    group: 'lovable',
  },
  {
    path: '/lovable/environment',
    component: LovableEnvironment,
    label: 'Environment',
    group: 'lovable',
  },
  {
    path: '/lovable/logs',
    component: LovableLogs,
    label: 'Logs',
    group: 'lovable',
  },
  {
    path: '/lovable/health',
    component: LovableHealth,
    label: 'Health',
    group: 'lovable',
  },

  // Demo & Integration routes
  {
    path: '/demo-integrations',
    component: DemoIntegrations,
    label: 'Demo Integrations',
    group: 'demo',
  },
  {
    path: '/fashioni-demo',
    component: FashioniDemo,
    label: 'Fashioni Demo',
    group: 'demo',
  },

  // Admin routes
  {
    path: '/admin/risk',
    component: AdminRisk,
    label: 'Risk & Compliance',
    group: 'admin',
  },
  {
    path: '/admin/providers',
    component: AdminProviders,
    label: 'Provider Management',
    group: 'admin',
  },

  // Error routes (must be last)
  {
    path: '*',
    component: NotFound,
    label: 'Not Found',
    group: 'error',
  },
];

/**
 * Get routes by group
 */
export const getRoutesByGroup = (group: string): RouteConfig[] => {
  return routeConfigs.filter((route) => route.group === group);
};

/**
 * Get all route groups
 */
export const getRouteGroups = (): string[] => {
  const groups = new Set(routeConfigs.map((route) => route.group).filter(Boolean));
  return Array.from(groups);
};

