// Build script for platform-specific installers
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Shreem POS installers...');

// Ensure web app is built first
try {
  console.log('Building web app...');
  execSync('cd ../web && npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to build web app:', error);
  process.exit(1);
}

// Platform-specific build commands
const platforms = {
  win: 'npm run build:win',
  mac: 'npm run build:mac', 
  linux: 'npm run build:linux'
};

// Build for current platform or all platforms
const targetPlatform = process.argv[2] || process.platform;

if (targetPlatform === 'all') {
  console.log('Building for all platforms...');
  Object.values(platforms).forEach(cmd => {
    try {
      console.log(`Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
      console.error(`Build failed for platform: ${cmd}`, error);
    }
  });
} else if (platforms[targetPlatform]) {
  console.log(`Building for ${targetPlatform}...`);
  try {
    execSync(platforms[targetPlatform], { stdio: 'inherit' });
  } catch (error) {
    console.error(`Build failed for ${targetPlatform}:`, error);
    process.exit(1);
  }
} else {
  console.error(`Unsupported platform: ${targetPlatform}`);
  console.log('Available platforms: win, mac, linux, all');
  process.exit(1);
}

console.log('Build process completed!');
