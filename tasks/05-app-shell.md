# Task 05 — App Shell & Navigation

**Agent:** ui-developer
**Status:** PENDING
**Depends on:** Tasks 02, 04 complete

## Context
Build the application shell: header bar, sidebar navigation, and React Router setup.
All pages live inside this shell. Design for 5-20 teams and 100s of initiatives.

## Steps

### 1. Create App Router (`src/App.tsx`)
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RoadmapPage } from './pages/RoadmapPage';
import { SprintTrackingPage } from './pages/SprintTrackingPage';
import { SlippagePage } from './pages/SlippagePage';
import { SprintReportPage } from './pages/SprintReportPage';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ExecutiveDashboardPage />} />
          <Route path="roadmap" element={<RoadmapPage />} />
          <Route path="sprints" element={<SprintTrackingPage />} />
          <Route path="slippage" element={<SlippagePage />} />
          <Route path="reports" element={<SprintReportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### 2. Create App Shell (`src/components/layout/AppShell.tsx`)
```tsx
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export const AppShell = () => (
  <div className="app-layout">
    <header className="app-header">
      <AppHeader />
    </header>
    <nav className="app-sidebar">
      <AppSidebar />
    </nav>
    <main className="app-main">
      <Outlet />
    </main>
  </div>
);
```

### 3. Create App Header (`src/components/layout/AppHeader.tsx`)
Salt DS `AppHeader`-style bar with:
- App name/logo left
- Last sync timestamp center
- Theme toggle + user avatar right

```tsx
import { Text, Button, Tooltip } from '@salt-ds/core';
import { RefreshIcon, LightIcon, DarkIcon } from '@salt-ds/icons';
// Use Salt DS FlowLayout for header layout
// Show: "Last synced: 2 min ago" with refresh button
// Show theme toggle (light/dark)
```

### 4. Create App Sidebar (`src/components/layout/AppSidebar.tsx`)
Navigation items using Salt DS `NavigationItem` pattern:

```tsx
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Executive Dashboard', icon: 'DashboardIcon' },
  { path: '/roadmap', label: 'Roadmap', icon: 'MapIcon' },
  { path: '/sprints', label: 'Sprint Tracking', icon: 'SprintIcon' },
  { path: '/slippage', label: 'Slippage Alerts', icon: 'WarningIcon', badge: slippedCount },
  { path: '/reports', label: 'Sprint Reports', icon: 'ReportIcon' },
  { path: '/settings', label: 'Settings', icon: 'SettingsIcon' },
] as const;
```

Show a live count badge on "Slippage Alerts" from a lightweight query.
Active state highlighted with Salt DS active styling.

### 5. Create Settings Page (`src/pages/SettingsPage.tsx`)
Critical — users configure Jira connection here if env vars aren't set.

Form fields using Salt DS `FormField` + `Input`:
- Jira Host (`yourorg.atlassian.net`)
- Jira Email
- Jira API Token (password input, masked)
- Project Keys (comma-separated, e.g. `PROJ1,PROJ2`)
- Hierarchy Strategy (dropdown: `JIRA_PREMIUM | PORTFOLIO | LABEL_BASED | COMPONENT_BASED`)
- Save to localStorage (since we can't write to .env from the browser)

Include a "Test Connection" button that calls `jiraClient.get('/myself')` and shows success/error.

### 6. Create placeholder pages (one per route)
Create minimal placeholder for each page that will be fleshed out in later tasks:
```tsx
// Template for each placeholder:
import { Text, Panel } from '@salt-ds/core';
export const [PageName]Page = () => (
  <Panel>
    <Text styleAs="h1">[Page Name]</Text>
    <Text>Coming in Task [N]</Text>
  </Panel>
);
```
Pages: `RoadmapPage`, `SprintTrackingPage`, `SlippagePage`, `SprintReportPage`, `ExecutiveDashboardPage`

### 7. Create Zustand config store (`src/store/configStore.ts`)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HierarchyStrategy, RoadmapFilters } from '@/types';

interface ConfigState {
  jiraHost: string;
  jiraEmail: string;
  jiraApiToken: string;
  projectKeys: string[];
  hierarchyStrategy: HierarchyStrategy;
  filters: RoadmapFilters;
  setConfig: (config: Partial<ConfigState>) => void;
  setFilters: (filters: Partial<RoadmapFilters>) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      jiraHost: import.meta.env.VITE_JIRA_HOST ?? '',
      jiraEmail: import.meta.env.VITE_JIRA_EMAIL ?? '',
      jiraApiToken: import.meta.env.VITE_JIRA_API_TOKEN ?? '',
      projectKeys: (import.meta.env.VITE_JIRA_PROJECT_KEYS ?? '').split(',').filter(Boolean),
      hierarchyStrategy: (import.meta.env.VITE_HIERARCHY_STRATEGY ?? 'JIRA_PREMIUM') as HierarchyStrategy,
      filters: {
        projectKeys: [],
        teams: [],
        severities: [],
        statuses: [],
        dueDateRange: { from: null, to: null },
        searchText: '',
      },
      setConfig: (config) => set((state) => ({ ...state, ...config })),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
    }),
    { name: 'jira-roadmap-config' }
  )
);
```

## Acceptance Criteria
- [ ] All 6 routes render without errors
- [ ] Sidebar highlights active route
- [ ] Settings page saves to localStorage and reads back on reload
- [ ] "Test Connection" button shows success/error Salt DS banner
- [ ] App header shows "Last synced" timestamp (static "Never" for now)
- [ ] Theme toggle switches between light/dark (Salt DS modes)
- [ ] No TypeScript errors

## Output
Update TASK_REGISTRY.md:
- Mark 05 `DONE`: "App shell, routing, sidebar navigation, settings page with Jira config"
