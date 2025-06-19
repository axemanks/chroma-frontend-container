// Azure Functions configuration
// In development: Uses Vite environment variables from .env.local
// In production: Uses runtime environment variables injected by Docker container

import { getEnvVar } from '../utils/env';

const functionAppUrl = getEnvVar('VITE_FUNCTION_APP_URL');
const functionsKey = getEnvVar('VITE_AZURE_FUNCTIONS_KEY');

if (!functionAppUrl) {
    throw new Error('VITE_FUNCTION_APP_URL environment variable is required');
}

if (!functionsKey) {
    throw new Error('VITE_AZURE_FUNCTIONS_KEY environment variable is required');
}

export const AZURE_FUNCTIONS_URL = functionAppUrl;
export const AZURE_FUNCTIONS_KEY = functionsKey;