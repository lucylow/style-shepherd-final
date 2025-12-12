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
const ElevenLabsVoiceSelector = lazy(() => import('@/components/ElevenLabsVoiceSelector'));

// Authentication pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'));

// Dashboard & User pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AIMemory = lazy(() => import('@/pages/AIMemory'));
const ScanItem = lazy(() => import('@/pages/user/ScanItem'));
const Wardrobe = lazy(() => import('@/pages/user/Wardrobe'));
const AIChat = lazy(() => import('@/pages/user/AIChat'));

// Agent pages
const AgentsDashboard = lazy(() => import('@/pages/agents/AgentsDashboard'));
const AgentDetails = lazy(() => import('@/pages/agents/AgentDetails'));
const AgentCreate = lazy(() => import('@/pages/agents/AgentCreate'));
const AgentAnalytics = lazy(() => import('@/pages/agents/AgentAnalytics'));
const AgentsOrchestrator = lazy(() => import('@/pages/agents/AgentsOrchestrator'));

// Shopping & Checkout pages
const Checkout = lazy(() => import('@/pages/shopping/Checkout'));
const OrderSuccess = lazy(() => import('@/pages/shopping/OrderSuccess'));
const SubscriptionCheckout = lazy(() => import('@/pages/shopping/SubscriptionCheckout'));
const SubscriptionSuccess = lazy(() => import('@/pages/shopping/SubscriptionSuccess'));
const StyleRecommendations = lazy(() => import('@/pages/shopping/StyleRecommendations'));
const SizePredictor = lazy(() => import('@/pages/shopping/SizePredictor'));
const SizeComparison = lazy(() => import('@/pages/shopping/SizeComparison'));

// Makeup Artist page
const MakeupArtist = lazy(() => import('@/pages/MakeupArtist'));


// Judge-Ready Demo pages
const JudgeDemoPage = lazy(() => import('@/pages/demo/JudgeDemo'));
const PilotKPIsPage = lazy(() => import('@/pages/demo/PilotKPIs'));
const UnitEconomicsPage = lazy(() => import('@/pages/demo/UnitEconomics'));
const SponsorMetricsPage = lazy(() => import('@/pages/demo/SponsorMetrics'));

// Lovable Cloud features have been integrated into MonitoringDashboard
const LovableAnalytics = lazy(() => import('@/pages/lovable/Analytics'));
const LovableSettings = lazy(() => import('@/pages/lovable/Settings'));

// Demo & Integration pages
const DemoIntegrations = lazy(() => import('@/pages/demo/DemoIntegrations'));
const FashioniDemo = lazy(() => import('@/pages/demo/FashioniDemo'));
const TrendAnalysisPage = lazy(() => import('@/pages/demo/TrendAnalysisPage'));

// Admin pages
const AdminRisk = lazy(() => import('@/pages/admin/AdminRisk'));
const AdminProviders = lazy(() => import('@/pages/admin/Providers'));

// Monitoring pages
const MonitoringDashboard = lazy(() => import('@/pages/MonitoringDashboard'));

// Stylist pages
const StylistDashboard = lazy(() => import('@/pages/stylist/StylistDashboard'));

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
  {
    path: '/voice-selector',
    component: ElevenLabsVoiceSelector,
    label: 'Voice Selector',
    group: 'public',
  },
  {
    path: '/makeup-artist',
    component: MakeupArtist,
    label: 'Makeup Artist',
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
    path: '/scan-item',
    component: ScanItem,
    label: 'Scan Item',
    group: 'user',
  },
  {
    path: '/wardrobe',
    component: Wardrobe,
    label: 'My Wardrobe',
    group: 'user',
  },
  {
    path: '/ai-chat',
    component: AIChat,
    label: 'AI Chat',
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
    path: '/agents/orchestrator',
    component: AgentsOrchestrator,
    label: 'Agents Orchestrator',
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
    path: '/style-recommendations',
    component: StyleRecommendations,
    label: 'Style Recommendations',
    group: 'shopping',
  },
  {
    path: '/size-prediction',
    component: SizePredictor,
    label: 'Size Prediction',
    group: 'shopping',
  },
  {
    path: '/size-comparison',
    component: SizeComparison,
    label: 'Size Comparison',
    group: 'shopping',
  },
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

  // Lovable Cloud features integrated into /monitoring route
  {
    path: '/lovable/analytics',
    component: LovableAnalytics,
    label: 'Analytics',
    group: 'lovable',
  },
  {
    path: '/lovable/settings',
    component: LovableSettings,
    label: 'Settings',
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
  {
    path: '/trend-analysis',
    component: TrendAnalysisPage,
    label: 'Trend Analysis',
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
  {
    path: '/monitoring',
    component: MonitoringDashboard,
    label: 'Monitoring Dashboard',
    group: 'admin',
  },

  // Stylist routes
  {
    path: '/stylist/dashboard',
    component: StylistDashboard,
    label: 'Stylist Dashboard',
    group: 'stylist',
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

