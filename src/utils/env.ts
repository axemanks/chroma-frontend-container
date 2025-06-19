// Centralized environment configuration
// Handles both development (Vite) and production (Docker runtime) environments

// Type for runtime environment variables injected by Docker
interface RuntimeEnv {
    [key: string]: string;
}

// Extend window interface to include ENV
declare global {
    interface Window {
        ENV?: RuntimeEnv;
    }
}

/**
 * Get environment variable value
 * In development: Uses Vite environment variables from .env.local
 * In production: Uses runtime environment variables injected by Docker container
 */
export const getEnvVar = (key: string): string | undefined => {
    // Check if window.ENV exists (production/Docker environment)
    if (typeof window !== 'undefined' && window.ENV) {
        return window.ENV[key];
    }
    // Fallback to Vite environment variables (development)
    return import.meta.env[key];
};

/**
 * Get environment variable with fallback
 */
export const getEnvVarWithFallback = (key: string, fallback: string): string => {
    return getEnvVar(key) || fallback;
};

/**
 * Get all available environment variables (for debugging)
 */
export const getAllEnvVars = (): Record<string, string> => {
    const envVars: Record<string, string> = {};
    
    // Add runtime ENV variables if available
    if (typeof window !== 'undefined' && window.ENV) {
        Object.assign(envVars, window.ENV);
    }
    
    // Add Vite environment variables
    if (typeof import.meta.env === 'object') {
        Object.keys(import.meta.env).forEach(key => {
            if (key.startsWith('VITE_')) {
                envVars[key] = import.meta.env[key];
            }
        });
    }
    
    return envVars;
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => {
    return import.meta.env.PROD || import.meta.env.MODE === 'production';
};
