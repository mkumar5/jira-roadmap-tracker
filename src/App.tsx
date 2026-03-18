import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from '@salt-ds/core';
import { AppShell } from './components/layout/AppShell';

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
            element={<Suspense fallback={<PageSpinner />}><ExecutiveDashboardPage /></Suspense>}
          />
          <Route
            path="roadmap"
            element={<Suspense fallback={<PageSpinner />}><RoadmapPage /></Suspense>}
          />
          <Route
            path="sprints"
            element={<Suspense fallback={<PageSpinner />}><SprintTrackingPage /></Suspense>}
          />
          <Route
            path="slippage"
            element={<Suspense fallback={<PageSpinner />}><SlippagePage /></Suspense>}
          />
          <Route
            path="reports"
            element={<Suspense fallback={<PageSpinner />}><SprintReportPage /></Suspense>}
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
