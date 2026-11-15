import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default to production mode when launched via app.js (e.g. on Plesk) if dist/ exists
if (!process.env.NODE_ENV && fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))) {
  process.env.NODE_ENV = 'production';
}

// Register tsx ESM loader when running on Node.js versions (< 22.6) without native TypeScript execution
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 6)) {
  try {
    await import('tsx/esm');
  } catch (err) {
    console.warn('tsx/esm loader notice:', err);
  }
}

const { app } = await import('./server.ts');

export default app;

