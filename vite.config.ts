import { defineConfig } from 'vite';

// Vite 配置：保持最简，开发服务器端口固定，构建输出到 dist
export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
