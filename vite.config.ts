import crypto from 'crypto';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import {fileURLToPath} from 'url';

const currentDir = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

function pwaPlugin() {
  let buildId = '';
  return {
    name: 'pwa-plugin',
    generateBundle(this: any, _options: unknown, bundle: Record<string, any>) {
      const assets: string[] = [];
      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
          assets.push(`/${fileName}`);
        }
      }
      assets.sort();
      buildId = crypto
        .createHash('sha256')
        .update(JSON.stringify(assets))
        .digest('hex')
        .slice(0, 10);

      const manifestObj = {
        buildId,
        assets,
      };
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify(manifestObj, null, 2),
      });
    },
    closeBundle() {
      if (!buildId) return;
      const swDistPath = path.resolve(currentDir, 'dist/sw.js');
      if (fs.existsSync(swDistPath)) {
        let swContent = fs.readFileSync(swDistPath, 'utf-8');
        swContent = swContent.replace(
          /const BUILD_ID = ['"][^'"]*['"];/,
          `const BUILD_ID = '${buildId}';`
        );
        swContent = swContent.replace(
          /const CACHE_NAME = ['"`][^'"`]*['"`];/,
          `const CACHE_NAME = 'convera-cache-${buildId}';`
        );
        fs.writeFileSync(swDistPath, swContent, 'utf-8');
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pwaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
