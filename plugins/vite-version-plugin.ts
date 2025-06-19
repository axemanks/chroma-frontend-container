/**
 * Vite plugin to inject version information from package.json
 * Author: Keith Scheldt
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

export function viteVersionPlugin() {
    return {
        name: 'vite-version-plugin',
        config(config) {
            // Read package.json to get version info
            const packagePath = resolve(process.cwd(), 'package.json');
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

            // Inject environment variables
            config.define = {
                ...config.define,
                'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
                'import.meta.env.VITE_BUILD_DATE': JSON.stringify(
                    packageJson.buildInfo?.buildDate || new Date().toISOString(),
                ),
                'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(packageJson.buildInfo?.buildNumber || 'local'),
                'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(packageJson.buildInfo?.environment || 'development'),
                'import.meta.env.VITE_INCREMENT_TYPE': JSON.stringify(packageJson.buildInfo?.incrementType || 'patch'),
            };

            console.log(`🎯 Building Blue Edge Collections Portal v${packageJson.version}`);
            if (packageJson.buildInfo) {
                console.log(`🏗️  Build #${packageJson.buildInfo.buildNumber} (${packageJson.buildInfo.environment})`);
            }
        },
    };
}
