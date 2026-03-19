import { lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from '@salt-ds/core';
import { AppShell } from './components/layout/AppShell';

class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[PageErrorBoundary]', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: 'red' }}>
          <strong>Render error:</strong> {(this.state.error as Error).message}
          <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {(this.state.error as Error).stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16 }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ExecutiveDashboardPage = lazy(() =>
  import('./pages/ExecutiveDashboardPage').then((m) => ({ default: m.ExecutiveDashboardPage }))
);
const RoadmapPage = lazy(() =>
  import('./pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage }))
);
const SprintTrackingPage = lazy(() =>
  import('./pages/SprintTrackingPage').then((m) => ({ default: m.SprintTrackingPage }))
);
const SlippagePage = lazy(() =>
  import('./pages/SlippagePage').then((m) => ({ default: m.SlippagePage }))
);
const SprintReportPage = lazy(() =>
  import('./pages/SprintReportPage').then((m) => ({ default: m.SprintReportPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
    <Spinner size="large" aria-label="Loading page" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={<PageErrorBoundary><Suspense fallback={<PageSpinner />}><ExecutiveDashboardPage /></Suspense></PageErrorBoundary>}
          />
          <Route
            path="roadmap"
            element={<Suspense fallback={<PageSpinner />}><RoadmapPage /></Suspense>}
          />
          <Route
            path="sprints"
            element={<PageErrorBoundary><Suspense fallback={<PageSpinner />}><SprintTrackingPage /></Suspense></PageErrorBoundary>}
          />
          <Route
            path="slippage"
            element={<Suspense fallback={<PageSpinner />}><SlippagePage /></Suspense>}
          />
          <Route
            path="reports"
            element={<PageErrorBoundary><Suspense fallback={<PageSpinner />}><SprintReportPage /></Suspense></PageErrorBoundary>}
          />
          <Route
            path="settings"
            element={<Suspense fallback={<PageSpinner />}><SettingsPage /></Suspense>}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
