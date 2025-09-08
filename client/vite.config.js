import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    base: isProduction ? '/' : '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3000'
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  };
});
