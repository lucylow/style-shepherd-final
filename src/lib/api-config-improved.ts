/**
 * Improved API Configuration with Demo Mode Support
 * Provides graceful fallbacks when API credentials are not configured
 */

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true' || 
         !import.meta.env.VITE_RAINDROP_API_KEY ||
         import.meta.env.VITE_RAINDROP_API_KEY === 'demo_key_replace_with_real';
}

export function getRaindropConfig() {
  const apiKey = import.meta.env.VITE_RAINDROP_API_KEY || '';
  const projectId = import.meta.env.VITE_RAINDROP_PROJECT_ID || '';
  const baseUrl = import.meta.env.VITE_RAINDROP_BASE_URL || 'https://api.raindrop.ai';
  
  const isConfigured = apiKey && 
                       projectId && 
                       apiKey !== 'demo_key_replace_with_real' &&
                       projectId !== 'demo_project_replace_with_real';
  
  return {
    apiKey,
    projectId,
    baseUrl,
    isConfigured,
    isDemoMode: !isConfigured,
  };
}

export function getVultrPostgresConfig() {
  const host = import.meta.env.VITE_VULTR_POSTGRES_HOST || 'localhost';
  const port = import.meta.env.VITE_VULTR_POSTGRES_PORT || '5432';
  const database = import.meta.env.VITE_VULTR_POSTGRES_DATABASE || 'style_shepherd';
  const user = import.meta.env.VITE_VULTR_POSTGRES_USER || 'postgres';
  const password = import.meta.env.VITE_VULTR_POSTGRES_PASSWORD || '';
  const ssl = import.meta.env.VITE_VULTR_POSTGRES_SSL === 'true';
  
  const isConfigured = host !== 'localhost' && password !== '';
  
  return {
    host,
    port,
    database,
    user,
    password,
    ssl,
    isConfigured,
    isDemoMode: !isConfigured,
    connectionString: `postgresql://${user}:${password}@${host}:${port}/${database}${ssl ? '?sslmode=require' : ''}`,
  };
}

export function getVultrValkeyConfig() {
  const host = import.meta.env.VITE_VULTR_VALKEY_HOST || 'localhost';
  const port = import.meta.env.VITE_VULTR_VALKEY_PORT || '6379';
  const password = import.meta.env.VITE_VULTR_VALKEY_PASSWORD || '';
  const tls = import.meta.env.VITE_VULTR_VALKEY_TLS === 'true';
  
  const isConfigured = host !== 'localhost' && password !== '';
  
  return {
    host,
    port,
    password,
    tls,
    isConfigured,
    isDemoMode: !isConfigured,
  };
}

export function getWorkOSConfig() {
  const apiKey = import.meta.env.VITE_WORKOS_API_KEY || '';
  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID || '';
  
  const isConfigured = apiKey && 
                       clientId && 
                       apiKey !== 'demo_workos_key' &&
                       clientId !== 'demo_workos_client';
  
  return {
    apiKey,
    clientId,
    isConfigured,
    isDemoMode: !isConfigured,
  };
}

export function getStripeConfig() {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const isConfigured = publishableKey && publishableKey !== 'pk_test_demo';
  
  return {
    publishableKey,
    isConfigured,
    isDemoMode: !isConfigured,
  };
}

/**
 * Get demo mode status message for UI display
 */
export function getDemoModeMessage(): string | null {
  if (isDemoMode()) {
    return 'Running in demo mode. Some features use mock data. Add real API credentials to enable full functionality.';
  }
  return null;
}

/**
 * Check if all required services are configured
 */
export function getServiceStatus() {
  const raindrop = getRaindropConfig();
  const postgres = getVultrPostgresConfig();
  const valkey = getVultrValkeyConfig();
  const workos = getWorkOSConfig();
  const stripe = getStripeConfig();
  
  return {
    raindrop: {
      name: 'Raindrop Platform',
      configured: raindrop.isConfigured,
      required: true,
    },
    postgres: {
      name: 'Vultr PostgreSQL',
      configured: postgres.isConfigured,
      required: true,
    },
    valkey: {
      name: 'Vultr Valkey (Redis)',
      configured: valkey.isConfigured,
      required: false,
    },
    workos: {
      name: 'WorkOS Authentication',
      configured: workos.isConfigured,
      required: false,
    },
    stripe: {
      name: 'Stripe Payments',
      configured: stripe.isConfigured,
      required: false,
    },
  };
}
