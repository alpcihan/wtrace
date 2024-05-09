import { defineConfig } from 'vite';
import { resolve } from 'path';
import rawPlugin from 'vite-raw-plugin';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  build: { lib: { entry: resolve(__dirname, 'src/wtrace.ts'), formats: ['es'] } },
  resolve: { alias: { src: resolve('src/') } },
  plugins: [
    dts(),
    rawPlugin({
      fileRegex: /\.wgsl$/,
    })
  ]
});
