import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

const cesiumSource = 'node_modules/cesium/Build/Cesium';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/Assets`, dest: 'cesium' },
        { src: `${cesiumSource}/ThirdParty`, dest: 'cesium' },
        { src: `${cesiumSource}/Workers`, dest: 'cesium' },
        { src: `${cesiumSource}/Widgets`, dest: 'cesium' }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
