import { SaltProvider } from '@salt-ds/core';
import '@salt-ds/theme/index.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './styles/global.css';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';

// Pages — implemented in tasks 06-10
// Using lazy imports for code splitting
import { lazy, Suspense } from 'react';
import { Spinner } from '@salt-ds/core';

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
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  return (
    <SaltProvider theme="salt" mode={mode}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell mode={mode} onModeChange={setMode} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageSpinner />}>
                  <ExecutiveDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="roadmap"
              element={
                <Suspense fallback={<PageSpinner />}>
                  <RoadmapPage />
                </Suspense>
              }
            />
            <Route
              path="sprints"
              element={
                <Suspense fallback={<PageSpinner />}>
                  <SprintTrackingPage />
                </Suspense>
              }
            />
            <Route
              path="slippage"
              element={
                <Suspense fallback={<PageSpinner />}>
                  <SlippagePage />
                </Suspense>
              }
            />
            <Route
              path="reports"
              element={
                <Suspense fallback={<PageSpinner />}>
                  <SprintReportPage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageSpinner />}>
                  <SettingsPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </SaltProvider>
  );
}
