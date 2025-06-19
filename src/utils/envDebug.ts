// Temporary debug utility to check environment variables
import { getEnvVar } from '../utils/env';
import { AZURE_FUNCTIONS_KEY, AZURE_FUNCTIONS_URL } from '../config/azureFunctionsConfig';

export const debugEnvironmentVariables = () => {
    console.log('🔍 Environment Variable Debug');
    console.log('================================');
    console.log('Raw VITE_AZURE_FUNCTIONS_KEY from env:', getEnvVar('VITE_AZURE_FUNCTIONS_KEY'));
    console.log('Processed AZURE_FUNCTIONS_KEY from config:', AZURE_FUNCTIONS_KEY);
    console.log('AZURE_FUNCTIONS_URL:', AZURE_FUNCTIONS_URL);
    console.log('import.meta.env.VITE_AZURE_FUNCTIONS_KEY:', import.meta.env.VITE_AZURE_FUNCTIONS_KEY);
    
    // Check if window.ENV exists
    if (typeof window !== 'undefined' && (window as any).ENV) {
        console.log('window.ENV.VITE_AZURE_FUNCTIONS_KEY:', (window as any).ENV.VITE_AZURE_FUNCTIONS_KEY);
    } else {
        console.log('window.ENV: Not available (development mode)');
    }
    console.log('================================');
};

// Auto-run in development
if (import.meta.env.DEV) {
    debugEnvironmentVariables();
}
