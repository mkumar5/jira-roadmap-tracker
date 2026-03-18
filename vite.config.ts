import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@types': resolve(__dirname, './src/types'),
      '@services': resolve(__dirname, './src/services'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@store': resolve(__dirname, './src/store'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/jira': {
        target: `https://${process.env.VITE_JIRA_HOST}`,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/jira/, '/rest/api/3'),
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.VITE_JIRA_EMAIL}:${process.env.VITE_JIRA_API_TOKEN}`
          ).toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      '/api/jira/agile': {
        target: `https://${process.env.VITE_JIRA_HOST}`,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/jira\/agile/, '/rest/agile/1.0'),
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.VITE_JIRA_EMAIL}:${process.env.VITE_JIRA_API_TOKEN}`
          ).toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          agGrid: ['ag-grid-react', 'ag-grid-community'],
          saltDs: ['@salt-ds/core', '@salt-ds/lab', '@salt-ds/icons'],
          utils: ['date-fns', 'axios', 'zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
        'vite.config.ts',
      ],
    },
  },
});
