# Environment Variables Configuration

This document explains how environment variables work in both development and production environments for the chroma-frontend-container project.

## How It Works

### Development Mode (`npm run dev`)
- Environment variables are read from `.env.local` (Vite standard)
- The custom `vite-local-settings-plugin.ts` also loads from `local.settings.json` for Azure Functions compatibility
- Variables must be prefixed with `VITE_` to be accessible in the browser

### Production Mode (Docker Container)
- Environment variables are injected at runtime from Azure App Settings
- The `env-inject.sh` script creates `/usr/share/nginx/html/env.js` with all `VITE_*` environment variables
- The `index.html` loads this script as `window.ENV` object
- Your React app checks `window.ENV` first, then falls back to build-time variables

## Required Environment Variables

The following environment variables need to be set in Azure App Settings:

```bash
VITE_AZURE_CLIENT_ID=00453d7f-84d0-453a-9362-01605376da43
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/8be1bc61-638b-4d9d-88d7-19145f7e7c90
VITE_AZURE_REDIRECT_URI=https://your-app-url.azurecontainerapps.io/
VITE_FUNCTION_APP_URL=https://func-nlli7eqzo247k.azurewebsites.net/
VITE_AZURE_FUNCTIONS_KEY=your-production-key-here
```

## Testing the Setup

### 1. Local Development Test
```bash
npm run dev
```
Open browser console and run:
```javascript
// Check if environment variables are loaded
console.log('Client ID:', import.meta.env.VITE_AZURE_CLIENT_ID);

// Or use the debug utilities
import { debugEnvironmentVariables } from './src/utils/debug';
debugEnvironmentVariables();
```

### 2. Docker Container Test
```bash
# Build the Docker image
docker build -t chroma-frontend .

# Run with environment variables
docker run -p 8080:80 \
  -e VITE_AZURE_CLIENT_ID=test-client-id \
  -e VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/test-tenant \
  -e VITE_AZURE_REDIRECT_URI=http://localhost:8080 \
  -e VITE_FUNCTION_APP_URL=https://test-function-app.azurewebsites.net \
  -e VITE_AZURE_FUNCTIONS_KEY=test-key \
  chroma-frontend
```

Then visit `http://localhost:8080` and check browser console:
```javascript
// Check if runtime environment variables are loaded
console.log('Runtime ENV:', window.ENV);
console.log('Client ID from runtime:', window.ENV?.VITE_AZURE_CLIENT_ID);
```

### 3. Azure Container Apps Test
After deploying to Azure Container Apps, your Bicep template should set the environment variables like this:

```bicep
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'chroma-frontend'
  properties: {
    configuration: {
      // ... other config
    }
    template: {
      containers: [
        {
          name: 'chroma-frontend'
          image: 'your-acr.azurecr.io/chroma-frontend:latest'
          env: [
            {
              name: 'VITE_AZURE_CLIENT_ID'
              value: azureClientId
            }
            {
              name: 'VITE_AZURE_AUTHORITY'
              value: 'https://login.microsoftonline.com/${tenantId}'
            }
            {
              name: 'VITE_AZURE_REDIRECT_URI'
              value: 'https://${containerApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'VITE_FUNCTION_APP_URL'
              value: functionAppUrl
            }
            {
              name: 'VITE_AZURE_FUNCTIONS_KEY'
              secretRef: 'azure-functions-key'
            }
          ]
        }
      ]
    }
  }
}
```

## Troubleshooting

### Environment Variables Not Loading
1. Check that variables are prefixed with `VITE_`
2. Verify `/env.js` exists in the container: `docker exec -it <container> cat /usr/share/nginx/html/env.js`
3. Check browser console for `window.ENV` object
4. Verify Azure App Settings are correctly set

### Development vs Production Differences
- Development: Uses `.env.local` and `local.settings.json`
- Production: Uses Azure App Settings injected as `window.ENV`
- Both environments are handled automatically by the `src/utils/env.ts` utility

## Key Files

- `src/utils/env.ts` - Centralized environment variable handling
- `src/config/authConfig.ts` - Azure authentication configuration
- `src/config/azureFunctionsConfig.ts` - Azure Functions configuration
- `env-inject.sh` - Docker script to inject runtime environment variables
- `index.html` - Loads runtime environment script
- `nginx.conf` - Nginx configuration for serving the app
