#!/usr/bin/env node

/**
 * Simplified patch version increment script
 * Author: Keith Scheldt
 *
 * This script automatically increments the patch version for builds
 * Major and minor versions should be updated manually using npm version
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const buildNumber = process.argv[2] || '';
const environment = process.env.NODE_ENV || 'development';

console.log(`🔧 Auto-incrementing patch version...`);
if (buildNumber) console.log(`🏗️  Build number: ${buildNumber}`);
console.log(`🌍 Environment: ${environment}`);

try {
  // Read package.json
  const packagePath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

  console.log(`📋 Current version: ${packageJson.version}`);

  // Parse current version - handle pre-release versions properly
  const baseVersion = packageJson.version.split('-')[0]; // Get base version before any pre-release
  const versionParts = baseVersion.split('.');

  // Ensure we have valid numbers
  if (versionParts.length !== 3 || versionParts.some(part => isNaN(Number(part)))) {
    console.error('❌ Invalid version format. Expected x.y.z format.');
    process.exit(1);
  }

  let [major, minor, patch] = versionParts.map(Number);

  // Always increment patch version
  patch += 1;

  // Create new version string
  let newVersion = `${major}.${minor}.${patch}`;

  // Add build metadata if provided
  if (buildNumber) {
    newVersion += `-build.${buildNumber}`;
  } else if (environment === 'development') {
    // For dev builds, add timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    newVersion += `-dev.${timestamp}`;
  }

  // Update package.json
  packageJson.version = newVersion;

  // Add simple build metadata
  packageJson.buildInfo = {
    buildDate: new Date().toISOString(),
    buildNumber: buildNumber || 'local',
    environment: environment
  };

  // Write back to package.json
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`✅ Version updated to: ${newVersion}`);
  console.log(`📅 Build date: ${packageJson.buildInfo.buildDate}`);

} catch (error) {
  console.error('❌ Error updating version:', error.message);
  process.exit(1);
}
