/**
 * Version information utilities
 * Author: Keith Scheldt
 */

// Import version and build info from package.json
// Note: This will be replaced at build time by Vite
const packageInfo = {
    version: '1.0.0', // This will be replaced by build process
    buildInfo: {
        buildDate: new Date().toISOString(),
        buildNumber: 'local',
        environment: 'development',
        incrementType: 'patch',
    },
};

export interface BuildInfo {
    buildDate: string;
    buildNumber: string;
    environment: string;
    incrementType: string;
}

export interface VersionInfo {
    version: string;
    buildInfo: BuildInfo;
}

/**
 * Get the current app version
 */
export const getAppVersion = (): string => {
    return import.meta.env.VITE_APP_VERSION || packageInfo.version;
};

/**
 * Get build information
 */
export const getBuildInfo = (): BuildInfo => {
    return {
        buildDate: import.meta.env.VITE_BUILD_DATE || packageInfo.buildInfo.buildDate,
        buildNumber: import.meta.env.VITE_BUILD_NUMBER || packageInfo.buildInfo.buildNumber,
        environment: import.meta.env.VITE_ENVIRONMENT || packageInfo.buildInfo.environment,
        incrementType: import.meta.env.VITE_INCREMENT_TYPE || packageInfo.buildInfo.incrementType,
    };
};

/**
 * Get full version information
 */
export const getVersionInfo = (): VersionInfo => {
    return {
        version: getAppVersion(),
        buildInfo: getBuildInfo(),
    };
};

/**
 * Format version for display
 */
export const formatVersionDisplay = (): string => {
    const info = getVersionInfo();
    const buildDate = new Date(info.buildInfo.buildDate).toLocaleDateString();

    if (info.buildInfo.environment === 'development') {
        return `v${info.version} (Dev Build - ${buildDate})`;
    }

    return `v${info.version} (Build #${info.buildInfo.buildNumber} - ${buildDate})`;
};

/**
 * Log version information to console (useful for debugging)
 */
export const logVersionInfo = (): void => {
    const info = getVersionInfo();
    console.log('🎯 Blue Edge Collections API Portal');
    console.log(`📦 Version: ${info.version}`);
    console.log(`🏗️  Build: ${info.buildInfo.buildNumber}`);
    console.log(`📅 Date: ${info.buildInfo.buildDate}`);
    console.log(`🌍 Environment: ${info.buildInfo.environment}`);
};
