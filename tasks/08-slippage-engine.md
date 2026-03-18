# Task 08 — Slippage Detection Engine & Dashboard

**Agent:** jira-integrator
**Status:** PENDING
**Depends on:** Tasks 03, 04 complete

## Context
Core business logic: identifying delayed and at-risk items across all projects.
The slippage dashboard is what management will check first every morning.
Performance critical: must handle 500+ slipped items without lag.

## Steps

### 1. Enhance Jira service with slippage methods
Implement in `src/services/jira.service.ts`:

```typescript
async fetchSlippedItems(projectKeys: string[]): Promise<SlippedItem[]> {
  const jql = `
    project in (${projectKeys.map(k => `"${k}"`).join(',')})
    AND duedate < now()
    AND statusCategory not in (Done)
    AND issuetype in (Initiative, Feature, Epic, Story)
    ORDER BY duedate ASC
  `;
  return paginateJiraSearch(jql, SLIPPAGE_FIELDS, transformToSlippedItem);
}

async fetchAtRiskItems(projectKeys: string[], days = 14): Promise<AtRiskItem[]> {
  const jql = `
    project in (${projectKeys.map(k => `"${k}"`).join(',')})
    AND duedate >= now()
    AND duedate <= "${days}d"
    AND statusCategory not in (Done)
    AND issuetype in (Initiative, Feature, Epic)
    ORDER BY duedate ASC
  `;
  return paginateJiraSearch(jql, SLIPPAGE_FIELDS, transformToAtRiskItem);
}
```

### 2. Create slippage store (`src/store/slippageStore.ts`)
```typescript
import { create } from 'zustand';
import type { SlippedItem, AtRiskItem, SlippageSeverity } from '@/types';

interface SlippageState {
  slippedItems: SlippedItem[];
  atRiskItems: AtRiskItem[];
  lastChecked: string | null;
  filters: {
    severity: SlippageSeverity[];
    teams: string[];
    issueTypes: string[];
    projectKeys: string[];
  };
  setSlippedItems: (items: SlippedItem[]) => void;
  setAtRiskItems: (items: AtRiskItem[]) => void;
  setFilters: (filters: Partial<SlippageState['filters']>) => void;
}
```

### 3. Create slippage hooks (`src/hooks/useSlippage.ts`)
```typescript
export function useSlippage() {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['slippage', projectKeys],
    queryFn: () => jiraService.fetchSlippedItems(projectKeys),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // check every 10 min
    enabled: projectKeys.length > 0,
  });
}

export function useAtRisk(days = 14) {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['at-risk', projectKeys, days],
    queryFn: () => jiraService.fetchAtRiskItems(projectKeys, days),
    staleTime: 5 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}
```

### 4. Create Slippage AG Grid (`src/components/roadmap/SlippageGrid.tsx`)
```typescript
const columnDefs: ColDef<SlippedItem>[] = [
  {
    field: 'slippageSeverity',
    headerName: '',
    width: 40,
    pinned: 'left',
    cellRenderer: ({ value }) => <SeverityDot severity={value} />,
    sort: 'desc',
  },
  { field: 'key', width: 110, pinned: 'left', cellRenderer: JiraLink },
  { field: 'summary', flex: 3, minWidth: 200 },
  { field: 'issueType', headerName: 'Type', width: 110 },
  {
    field: 'daysPastDue',
    headerName: 'Days Overdue',
    width: 130,
    type: 'numericColumn',
    cellStyle: ({ value }) => ({
      color: value > 14
        ? 'var(--salt-status-error-foreground)'
        : value > 7
          ? 'var(--salt-color-orange-700)'
          : 'var(--salt-color-yellow-700)',
      fontWeight: value > 14 ? '600' : '400',
    }),
  },
  {
    field: 'dueDate',
    headerName: 'Was Due',
    width: 130,
    valueFormatter: ({ value }) => value ? format(parseISO(value), 'MMM d, yyyy') : '—',
  },
  { field: 'status', width: 130 },
  { field: 'assignee', width: 160, valueGetter: ({ data }) => data?.assignee?.displayName ?? '—' },
  { field: 'teamName', headerName: 'Team', width: 130 },
  { field: 'projectKey', headerName: 'Project', width: 90 },
];
```
Add row grouping by `issueType` so management can see:
- `🔴 Initiatives (3)` → `🟠 Epics (12)` → `🟡 Stories (45)`

### 5. Create Slippage Page (`src/pages/SlippagePage.tsx`)
Layout:
```
[Summary Banner]
  "🔴 3 Critical | 🟠 12 High | 🟡 23 Medium | ⚠️ 8 At Risk"

[Filter Bar]
  Severity checkboxes | Type filter | Team filter | Project filter | Search

[Tabs: "Slipped Items" | "At Risk (due in 14 days)"]

[Tab 1: SlippageGrid with all overdue items]
[Tab 2: AtRiskGrid with items due soon]

[Footer: "Last checked: 3 min ago | Refresh"]
```

### 6. Create summary banner component (`src/components/roadmap/SlippageSummaryBanner.tsx`)
Salt DS `Banner` variant with severity counts.
Clicking a severity filter automatically filters the grid below.

### 7. Alerting configuration
Add to Settings page:
- "Alert threshold" — default: show MEDIUM+ (hide LOW/OK)
- "At-risk lookahead" — default: 14 days (configurable 7/14/30)

## Acceptance Criteria
- [ ] Slippage grid shows all overdue items with severity-coded rows
- [ ] Summary banner counts are accurate (matches grid row count per severity)
- [ ] Filters work: severity, type, team, project, text
- [ ] Tabs switch between "Slipped" and "At Risk" without re-fetching
- [ ] Clicking severity chip in banner filters the grid
- [ ] Export CSV works for slippage report
- [ ] "Last checked" timestamp updates on each refetch
- [ ] Handles zero slippage gracefully: "All items on track!"

## Output
Update TASK_REGISTRY.md:
- Mark 08 `DONE`: "Slippage engine with severity grid, at-risk tab, summary banner"
