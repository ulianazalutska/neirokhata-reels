import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/neirokhata-reels/',
  plugins: [react()],
  build: { outDir: 'dist' },
});
