# Task 02 — Salt DS + AG Grid Setup

**Agent:** ui-developer
**Status:** PENDING
**Depends on:** Task 01 complete

## Context
Configure Salt DS theming and AG Grid as the foundational UI layer.
Every component in the app will use Salt DS tokens. Every data view uses AG Grid.

## Steps

### 1. Create Salt DS theme provider (`src/providers/ThemeProvider.tsx`)
```tsx
import { SaltProvider } from '@salt-ds/core';
import { useState, type FC, type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  return (
    <SaltProvider theme="salt" mode={mode}>
      <div data-theme-mode={mode} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </SaltProvider>
  );
};
```

### 2. Create global CSS (`src/styles/global.css`)
```css
/* Import Salt DS theme tokens */
@import '@salt-ds/theme/index.css';

/* Import AG Grid base styles */
@import 'ag-grid-community/styles/ag-grid.css';
@import 'ag-grid-community/styles/ag-theme-quartz.css';

/* App layout */
:root {
  font-family: var(--salt-typography-fontFamily);
  font-size: var(--salt-typography-fontSize-100);
  color: var(--salt-color-foreground);
  background: var(--salt-color-background);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 48px 1fr;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  grid-column: 1 / -1;
  grid-row: 1;
}

.app-sidebar {
  grid-column: 1;
  grid-row: 2;
  overflow-y: auto;
  border-right: 1px solid var(--salt-separable-primary-borderColor);
}

.app-main {
  grid-column: 2;
  grid-row: 2;
  overflow-y: auto;
  padding: var(--salt-spacing-200);
}

/* AG Grid Salt DS integration */
.ag-theme-quartz {
  --ag-background-color: var(--salt-color-white);
  --ag-header-background-color: var(--salt-color-gray-30);
  --ag-odd-row-background-color: var(--salt-color-gray-10);
  --ag-border-color: var(--salt-separable-primary-borderColor);
  --ag-row-hover-color: var(--salt-color-blue-10);
  --ag-selected-row-background-color: var(--salt-color-blue-20);
  --ag-font-family: var(--salt-typography-fontFamily);
  --ag-font-size: 13px;
}

/* Slippage severity colors */
.severity-critical { color: var(--salt-status-error-foreground); font-weight: 600; }
.severity-high { color: var(--salt-color-orange-700); font-weight: 600; }
.severity-medium { color: var(--salt-color-yellow-700); }
.severity-low { color: var(--salt-status-warning-foreground); }
.severity-ok { color: var(--salt-status-success-foreground); }
```

### 3. Create base AG Grid wrapper (`src/components/shared/BaseGrid.tsx`)
```tsx
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import type { FC } from 'react';
import { Spinner } from '@salt-ds/core';

export interface BaseGridProps<T extends object> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  loading?: boolean;
  height?: string | number;
  gridOptions?: GridOptions<T>;
  onGridReady?: (event: GridReadyEvent<T>) => void;
  treeData?: boolean;
  getDataPath?: (data: T) => string[];
  testId?: string;
}

export function BaseGrid<T extends object>({
  rowData,
  columnDefs,
  loading = false,
  height = '100%',
  gridOptions,
  onGridReady,
  treeData = false,
  getDataPath,
  testId,
}: BaseGridProps<T>): ReturnType<FC> {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
        <Spinner size="medium" aria-label="Loading data" />
      </div>
    );
  }

  return (
    <div
      className="ag-theme-quartz"
      style={{ height, width: '100%' }}
      data-testid={testId}
    >
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
          minWidth: 80,
        }}
        rowSelection="multiple"
        animateRows={true}
        suppressRowClickSelection={true}
        treeData={treeData}
        getDataPath={getDataPath}
        onGridReady={onGridReady}
        {...gridOptions}
      />
    </div>
  );
}
```

### 4. Create severity cell renderer (`src/components/shared/SeverityBadge.tsx`)
```tsx
import type { FC } from 'react';
import type { SlippageSeverity } from '@/types/roadmap.types';

interface SeverityBadgeProps {
  severity: SlippageSeverity;
}

const SEVERITY_CONFIG: Record<SlippageSeverity, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'severity-critical' },
  HIGH: { label: 'High', className: 'severity-high' },
  MEDIUM: { label: 'Medium', className: 'severity-medium' },
  LOW: { label: 'At Risk', className: 'severity-low' },
  OK: { label: 'On Track', className: 'severity-ok' },
};

export const SeverityBadge: FC<SeverityBadgeProps> = ({ severity }) => {
  const config = SEVERITY_CONFIG[severity];
  return <span className={config.className}>{config.label}</span>;
};
```

### 5. Update `src/main.tsx`
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppThemeProvider } from './providers/ThemeProvider';
import App from './App';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
```

## Acceptance Criteria
- [ ] App renders with Salt DS light theme (no CSS errors)
- [ ] `BaseGrid` renders with AG Grid quartz theme using Salt color tokens
- [ ] `SeverityBadge` renders each severity with correct color
- [ ] `npm run dev` shows a white-themed app shell (can be blank content)
- [ ] No TypeScript errors from AG Grid or Salt DS types

## Output
Update TASK_REGISTRY.md:
- Mark 02 `DONE`: "Salt DS + AG Grid configured with custom integration CSS"
- Mark 03 `IN_PROGRESS`
