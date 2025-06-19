import type { Configuration } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';
import { getEnvVar } from '../utils/env';

// Get configuration values
// In development: These come from .env.local file via Vite
// In production: These come from window.ENV (injected by Docker container)
const clientId = getEnvVar('VITE_AZURE_CLIENT_ID');
const authority = getEnvVar('VITE_AZURE_AUTHORITY');

if (!clientId) {
    throw new Error('VITE_AZURE_CLIENT_ID environment variable is required');
}

if (!authority) {
    throw new Error('VITE_AZURE_AUTHORITY environment variable is required');
}

const redirectUri = getEnvVar('VITE_AZURE_REDIRECT_URI');

if (!redirectUri) {
    throw new Error('VITE_AZURE_REDIRECT_URI environment variable is required');
}


// MSAL configuration
const msalConfig: Configuration = {
    auth: {
        clientId,
        authority,
        redirectUri,
    },
    cache: {
        cacheLocation: 'sessionStorage', // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
};

// Create an instance of PublicClientApplication
export const msalInstance = new PublicClientApplication(msalConfig);

// Default to using the first account if no account is active on page load
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
    // Account selection logic is app dependent. Adjust as needed for different use cases.
    msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

// Optional - This will update account state if a user signs in from another tab or window
msalInstance.enableAccountStorageEvents();
