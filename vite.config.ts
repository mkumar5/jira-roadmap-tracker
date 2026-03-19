import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file values so proxy config can access VITE_* vars
  const env = loadEnv(mode, process.cwd(), '');

  const jiraHost = env['VITE_JIRA_HOST'] ?? '';

  return {
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
        // IMPORTANT: more-specific prefix must come first — Vite matches in insertion order
        '/api/jira/agile': {
          target: `https://${jiraHost}`,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/jira\/agile/, '/rest/agile/1.0'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('User-Agent', 'jira-roadmap-manager/1.0 node-proxy');
              proxyReq.setHeader('X-Atlassian-Token', 'no-check');
              ['sec-fetch-site','sec-fetch-mode','sec-fetch-dest','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','origin','referer','cookie'].forEach(h => proxyReq.removeHeader(h));
              const raw = proxyReq.getHeader('authorization') as string | undefined;
              const user = raw ? Buffer.from(raw.replace('Basic ',''),'base64').toString().split(':')[0] : '(none)';
              console.log(`[Proxy→Jira/agile] ${req.method} ${req.url} | user: ${user || '(empty)'}`);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                console.error(`[Proxy←Jira/agile] ${proxyRes.statusCode} ${req.url}`);
              }
            });
          },
        },
        '/api/jira': {
          target: `https://${jiraHost}`,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/jira/, '/rest/api/3'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Jira Cloud POST /search/jql enforces XSRF for browser User-Agents.
              // Replacing UA with a non-browser string bypasses this check server-side.
              proxyReq.setHeader('User-Agent', 'jira-roadmap-manager/1.0 node-proxy');
              proxyReq.setHeader('X-Atlassian-Token', 'no-check');
              ['sec-fetch-site','sec-fetch-mode','sec-fetch-dest','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','origin','referer','cookie'].forEach(h => proxyReq.removeHeader(h));
              const raw = proxyReq.getHeader('authorization') as string | undefined;
              const user = raw ? Buffer.from(raw.replace('Basic ',''),'base64').toString().split(':')[0] : '(none)';
              console.log(`[Proxy→Jira] ${req.method} ${req.url} | user: ${user || '(empty)'}`);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                console.error(`[Proxy←Jira] ${proxyRes.statusCode} ${req.url}`);
              }
            });
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
          'dist/',
          'src/__tests__/',
          'src/main.tsx',
          'src/vite-env.d.ts',
          '**/*.d.ts',
          'vite.config.ts',
          'eslint.config.js',
        ],
        include: ['src/**/*.{ts,tsx}'],
      },
    },
  };
});
