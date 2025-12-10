import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import RouteLoadingIndicator from "@/components/RouteLoadingIndicator";
import { routeConfigs, createRouteElement } from "@/config/routes";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";

// Create QueryClient outside component to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Skip to content link for accessibility
 */
const SkipToContent = () => (
  <a
    href="#main"
    className="skip-to-content focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
  >
    Skip to main content
  </a>
);

/**
 * App Routes Component
 * 
 * Dynamically renders routes from the centralized route configuration.
 * All routes are wrapped with PageTransition for smooth navigation.
 */
const AppRoutes = () => {
  const location = useLocation();

  return (
    <>
      <SkipToContent />
      <RouteLoadingIndicator />
      <Suspense fallback={<RouteLoadingIndicator />}>
        <Routes>
          {routeConfigs.map(({ path, component: Component }) => (
            <Route
              key={path}
              path={path}
              element={createRouteElement(Component, location.pathname)}
            />
          ))}
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <KeyboardShortcutsProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </KeyboardShortcutsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
