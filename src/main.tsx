import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppThemeProvider } from './providers/ThemeProvider';
import App from './App';

// Global styles — order matters: Salt DS tokens first, then AG Grid, then app overrides
import '@salt-ds/theme/index.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './styles/global.css';

// Bootstrap: clear stale localStorage if it contains broken settings (e.g. JIRA_PREMIUM default)
// This runs before any React component mounts so the store initializes cleanly.
;(function fixStaleSettings() {
  try {
    const raw = localStorage.getItem('jira-roadmap-config');
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: { hierarchyStrategy?: string; projectKeys?: string[] }; version?: number };
    const state = parsed.state;
    if (!state) return;
    const envStrategy = (import.meta.env.VITE_HIERARCHY_STRATEGY as string | undefined) ?? 'LABEL_BASED';
    const envKeys = ((import.meta.env.VITE_JIRA_PROJECT_KEYS as string | undefined) ?? '').split(',').map((k) => k.trim()).filter(Boolean);
    let dirty = false;
    if (state.hierarchyStrategy === 'JIRA_PREMIUM' && envStrategy !== 'JIRA_PREMIUM') {
      state.hierarchyStrategy = envStrategy;
      dirty = true;
    }
    if ((state.projectKeys ?? []).length === 0 && envKeys.length > 0) {
      state.projectKeys = envKeys;
      dirty = true;
    }
    if (dirty) {
      parsed.version = 3;
      localStorage.setItem('jira-roadmap-config', JSON.stringify(parsed));
    }
  } catch { /* ignore */ }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
