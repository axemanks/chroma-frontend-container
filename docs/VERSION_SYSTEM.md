# 🏗️ Automatic Version Incrementing System

**Author:** Keith Scheldt
**Project:** Blue Edge Collections API Portal

This document explains the automatic version incrementing system implemented for the frontend application.

## 📋 Overview

The versioning system automatically increments the version number in `package.json` on every build, providing:

- **Semantic versioning** (major.minor.patch)
- **Build metadata** (build number, date, environment)
- **CI/CD integration** with Azure DevOps
- **Runtime version display** in the application UI

## 🔧 How It Works

### 1. **Automatic Patch Increment**

Every time you run `npm run build`, the patch version automatically increments:

- `1.0.0` → `1.0.1` → `1.0.2` → etc.

### 2. **Manual Version Control**

Use these commands for different increment types:

```bash
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0
```

### 3. **Build Metadata**

Each build adds metadata to `package.json`:

```json
{
    "version": "1.0.5-build.123",
    "buildInfo": {
        "buildDate": "2025-06-16T10:30:00.000Z",
        "buildNumber": "123",
        "environment": "production",
        "incrementType": "patch"
    }
}
```

## 📝 Available Scripts

| Script                    | Description                           |
| ------------------------- | ------------------------------------- |
| `npm run build`           | Build with automatic patch increment  |
| `npm run build:prod`      | Production build with CI build number |
| `npm run build:staging`   | Staging build with CI build number    |
| `npm run version:patch`   | Manual patch increment                |
| `npm run version:minor`   | Manual minor increment                |
| `npm run version:major`   | Manual major increment                |
| `npm run version:display` | Show current version info             |
| `npm run version:reset`   | Reset version to 1.0.0                |

## 🏗️ CI/CD Integration

### Azure DevOps Pipeline

The system integrates with Azure DevOps build pipelines:

```yaml
# In your azure-pipelines.yml
steps:
    - task: Npm@1
      inputs:
          command: 'run'
          arguments: 'build:prod'
      env:
          BUILD_BUILDNUMBER: $(Build.BuildNumber)
```

### Environment Variables

The build process uses these environment variables:

- `BUILD_BUILDNUMBER` - Azure DevOps build number
- `NODE_ENV` - Environment (development, staging, production)

## 🎯 Version Display

The current version is displayed in:

### 1. **Application Header**

- Shows in the header subtitle: "Instance: func-xyz • v1.0.5 (Build #123 - 6/16/2025)"

### 2. **Browser Console**

Automatic logging on app load:

```
🎯 Blue Edge Collections API Portal
📦 Version: 1.0.5-build.123
🏗️  Build: 123
📅 Date: 2025-06-16T10:30:00.000Z
🌍 Environment: production
```

### 3. **Runtime API**

Access version info programmatically:

```typescript
import { getAppVersion, getBuildInfo, formatVersionDisplay } from '@/utils/version';

const version = getAppVersion(); // "1.0.5-build.123"
const buildInfo = getBuildInfo(); // Full build metadata
const display = formatVersionDisplay(); // "v1.0.5 (Build #123 - 6/16/2025)"
```

## 📁 File Structure

```
src/frontend/
├── scripts/
│   └── version-increment.mjs      # Version increment script
├── plugins/
│   └── vite-version-plugin.ts     # Vite plugin for version injection
├── src/
│   └── utils/
│       └── version.ts             # Version utilities for React app
├── package.json                   # Contains version and build info
└── vite.config.ts                # Configured with version plugin
```

## 🔄 Version Format Examples

| Environment | Example Version                 | Description                |
| ----------- | ------------------------------- | -------------------------- |
| Development | `1.0.5-dev.2025-06-16T10-30-45` | Local dev with timestamp   |
| CI Build    | `1.0.5-build.123`               | CI build with build number |
| Local Build | `1.0.5`                         | Clean semantic version     |

## ⚙️ Customization

### Change Increment Behavior

Edit the `prebuild` script in `package.json`:

```json
{
    "scripts": {
        "prebuild": "node scripts/version-increment.mjs minor"
    }
}
```

### Disable Auto-Increment

Remove the `prebuild` script and increment manually:

```bash
npm run version:patch
npm run build
```

### Custom Version Format

Modify `scripts/version-increment.mjs` to change version formatting logic.

## 🚀 Benefits

1. **Automatic Tracking** - Never forget to increment versions
2. **Build Traceability** - Easy to identify which build is deployed
3. **Environment Awareness** - Different version formats per environment
4. **CI/CD Ready** - Integrates seamlessly with Azure DevOps
5. **User Visibility** - Users can see the current version
6. **Debug Friendly** - Console logging helps with troubleshooting

## 🛠️ Troubleshooting

### Build Fails with Version Error

```bash
# Reset version and try again
npm run version:reset
npm run build
```

### Version Not Updating in UI

- Check browser cache (hard refresh: Ctrl+Shift+R)
- Verify Vite plugin is loaded in `vite.config.ts`
- Check console for version logs

### CI/CD Not Setting Build Number

- Ensure `BUILD_BUILDNUMBER` environment variable is set
- Check Azure DevOps pipeline configuration
- Verify script is using `build:prod` or `build:staging`

This versioning system ensures professional build management and helps track deployments across environments! 🎉
