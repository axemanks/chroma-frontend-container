# Blue Edge Collections API Portal

A React-based admin portal for managing the Blue Edge Collections API, built with TypeScript, FluentUI, and Microsoft Authentication Library (MSAL).

**Author:** Keith Scheldt
**Repository:** [Azure DevOps](https://dev.azure.com/blue-edge-ai/Collections%20API)

## 🚀 Features

- **Microsoft Authentication** - Secure login with Azure AD/Entra ID
- **Modern UI** - Built with Microsoft FluentUI components
- **TypeScript** - Full type safety throughout the application
- **Responsive Design** - Works on desktop and mobile devices
- **Route Protection** - Protected routes with authentication checks
- **Admin Dashboard** - Manage collections, documents, and view analytics

## 🛠️ Tech Stack

- **React 18** - Latest stable React version
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing with hash router
- **FluentUI** - Microsoft's design system
- **MSAL** - Microsoft Authentication Library
- **ESLint & Prettier** - Code quality and formatting

## 📁 Project Structure

```
src/
├── api/                    # API layer
│   ├── api.ts             # Organized API functions (adminApi, documentApi, fileApi)
│   ├── models.ts          # TypeScript interfaces and types
│   └── index.ts           # Clean exports
├── components/            # Reusable UI components
│   ├── layout/
│   │   └── Layout.tsx     # Main layout with header and navigation
│   └── ProtectedRoute/
│       └── ProtectedRoute.tsx  # Route protection wrapper
├── config/               # Configuration files
│   ├── authConfig.ts     # MSAL authentication configuration
│   ├── azure.ts          # Azure-specific settings
│   └── index.ts          # Configuration exports
├── hooks/                # Custom React hooks
│   └── useAuth.ts        # Authentication state and methods
├── pages/                # Page components
│   ├── ChromaPage/       # Main admin dashboard
│   ├── LoginPage/        # Authentication page
│   └── NoPage.tsx        # 404 error page
├── router/               # Routing configuration
│   └── index.tsx         # React Router setup
├── utils/                # Utility functions
│   ├── helpers.ts        # URL helpers and generic functions
│   └── index.ts          # Utility exports
└── App.tsx               # Root application component
```

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Azure AD App Registration (for authentication)

### 1. Clone and Install

```bash
# Navigate to the frontend directory
cd src/frontend

# Install dependencies
npm install
```

### 2. Configure Authentication

1. **Create Azure AD App Registration:**

   - Go to Azure Portal → Azure Active Directory → App registrations
   - Create new registration
   - Set redirect URI to `http://localhost:5173`
   - Note the Client ID and Tenant ID

2. **Set up environment variables:**

   ```bash
   # Copy the example file
   cp .env.example .env.local

   # Edit .env.local with your values:
   VITE_AZURE_CLIENT_ID=your-client-id-here
   VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id-here
   VITE_AZURE_REDIRECT_URI=http://localhost:5173
   ```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔐 Authentication Flow

1. **Unauthenticated users** are redirected to the login page
2. **Login page** shows Microsoft sign-in button
3. **MSAL popup** handles authentication with Azure AD
4. **Successful login** redirects to the intended page
5. **User info** is displayed in the header with logout option

## 🎨 UI Components

The application uses Microsoft FluentUI for consistent design:

- **Layout** - Header with user info and logout menu
- **Login Page** - Centered login form with Microsoft branding
- **Protected Routes** - Automatic authentication checks
- **404 Page** - User-friendly error handling

## 📊 API Integration

The project includes two approaches for API integration:

### Current Implementation (ChromaPage)

Uses direct URL construction with helper functions:

```typescript
import { getFunctionUrl } from "../../config";

const response = await fetch(getFunctionUrl("/api/admin-collections"));
```

### Organized API Functions (Ready for Future Use)

Structured API functions organized by domain:

- **Admin Operations** - `adminApi.getCollections()`, `adminApi.getStats()`, `adminApi.getQueueStats()`
- **Document Management** - `documentApi.search()`, `documentApi.getStatus()`, `documentApi.update()`
- **File Operations** - `fileApi.upload()`, `fileApi.download()`, `fileApi.delete()`

#### Usage Example

```typescript
import { adminApi, documentApi } from "../api";

// Get collections
const collections = await adminApi.getCollections();

// Search documents
const results = await documentApi.search({
  query: "search term",
  limit: 10,
});
```

> **Note:** ChromaPage currently uses the direct approach. The organized API functions are available for new features or refactoring.

## 🏗️ Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## 📝 Development Guidelines

### Code Organization

- **Components** - Single responsibility, reusable components
- **API Layer** - Grouped by domain (admin, document, file)
- **Types** - Centralized in `api/models.ts`
- **Utilities** - Generic helpers in `utils/`

### Authentication

- Uses MSAL for Azure AD integration
- Popup authentication (no redirects)
- Automatic token refresh
- Secure token storage

### Routing

- Hash router for Azure Static Web Apps compatibility
- Protected routes by default
- Remembers intended destination
- Clean route organization

## 🚀 Deployment

This project is designed to work with Azure Static Web Apps:

1. **Build the project** with `npm run build`
2. **Deploy to Azure Static Web Apps** via GitHub Actions or Azure CLI
3. **Configure authentication** in Azure portal
4. **Update environment variables** for production

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Parent Project

This frontend is part of the larger Collections API project:

```
Collections API/
├── src/frontend/          # This React admin portal
├── src/functions/         # Azure Functions API
├── infra/                 # Bicep infrastructure templates
└── azure.yaml            # Azure Developer CLI configuration
```

## 🤝 Contributing

1. Follow the established code organization patterns
2. Use TypeScript for all new code
3. Follow FluentUI design patterns
4. Add proper error handling
5. Update types in `api/models.ts` for new features

## 📄 License

This project is part of the Blue Edge Collections API system.

# React Vite Container App

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Docker Build & Run

```bash
docker build -t my-react-app .
docker run -p 8080:80 -e VITE_API_URL=https://api.example.com my-react-app
```

## Runtime Environment Variables

- Any environment variable prefixed with `VITE_` will be injected at runtime and available in the app as `window.ENV`.
- Example: `VITE_API_URL`, `VITE_FEATURE_FLAG`, etc.

## Accessing Runtime Vars in React

```js
const apiUrl = window.ENV?.VITE_API_URL;
```

## Azure Container Registry (ACR)

- Build and push the image to ACR as you would any Docker image.
- Set environment variables in your Azure App Service or container settings.
