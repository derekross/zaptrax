import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Read package.json to get version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

// Read and update service worker
const swPath = path.join('./dist/sw.js');
const swContent = readFileSync(swPath, 'utf-8');

// Replace the version placeholder with actual version
const updatedContent = swContent.replace(
  /const APP_VERSION = '[^']*';/,
  `const APP_VERSION = '${version}';`
);

// Write updated service worker
writeFileSync(swPath, updatedContent);

// Read and update manifest
const manifestPath = path.join('./dist/manifest.webmanifest');
const manifestContent = readFileSync(manifestPath, 'utf-8');
const manifest = JSON.parse(manifestContent);

// Update manifest version and start_url
manifest.version = version;
manifest.start_url = `/?v=${version}`;

// Write updated manifest
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Updated service worker and manifest to version ${version}`);