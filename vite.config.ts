import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

function cesiumCopyPlugin() {
  const cesiumSource = 'node_modules/cesium/Build/Cesium';
  return {
    name: 'cesium-copy-plugin',
    configureServer(server) {
      const dest = path.resolve(server.config.root, 'public/cesium');
      copyCesium(cesiumSource, dest);
    },
    buildStart() {
      const dest = path.resolve(process.cwd(), 'public/cesium');
      copyCesium(cesiumSource, dest);
    }
  };
}

function copyCesium(source: string, dest: string) {
  if (!fs.existsSync(source)) {
    return;
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(source)) {
    const src = path.join(source, entry);
    const dst = path.join(dest, entry);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      copyCesium(src, dst);
    } else if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < stat.mtimeMs) {
      fs.copyFileSync(src, dst);
    }
  }
}

export default defineConfig({
  plugins: [cesiumCopyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    exclude: ['cesium']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('cesium')) {
            return 'cesium';
          }
        }
      }
    }
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  }
});
