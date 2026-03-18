# Task 10 — Executive Dashboard

**Agent:** ui-developer
**Status:** PENDING
**Depends on:** Tasks 05, 06, 07, 08 complete

## Context
The landing page for management. Shows the full program health at a glance.
KPI cards, initiative status breakdown, top slipped items, team health grid.
Designed for non-technical stakeholders: no Jira jargon, business language only.

## Steps

### 1. Create Executive Dashboard hook (`src/hooks/useExecutiveSummary.ts`)
Aggregates data from multiple hooks:
```typescript
export function useExecutiveSummary(): UseQueryResult<ExecutiveSummary> {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['executive-summary', projectKeys],
    queryFn: async () => {
      const [initiatives, slipped, atRisk] = await Promise.all([
        jiraService.fetchInitiatives(projectKeys),
        jiraService.fetchSlippedItems(projectKeys),
        jiraService.fetchAtRiskItems(projectKeys, 14),
      ]);
      return buildExecutiveSummary(initiatives, slipped, atRisk);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}
```

### 2. Create KPI Card component (`src/components/shared/KpiCard.tsx`)
```tsx
import { Card, Text, StackLayout } from '@salt-ds/core';

interface KpiCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  color?: 'positive' | 'negative' | 'warning' | 'neutral';
  onClick?: () => void;
}

// Renders: large number value + title + optional trend arrow + optional click → navigates to detail view
```

KPI cards to show on dashboard:
1. **Total Initiatives** (N) → clicks to Roadmap page filtered to all
2. **On Track** (N, green) → Roadmap page filtered to ON_TRACK
3. **At Risk** (N, yellow) → Slippage page filtered to LOW severity
4. **Slipped / Overdue** (N, red) → Slippage page filtered to CRITICAL+HIGH
5. **Teams Active** (N) → Sprint Tracking page
6. **Average Team Health** (N/100) → Sprint Tracking page

### 3. Create Initiative Status Ring (`src/components/shared/StatusRing.tsx`)
Donut chart using CSS conic-gradient (no charting lib needed):
```tsx
// Shows: On Track (green) | At Risk (yellow) | Slipped (red) | Done (gray)
// Percentages from ExecutiveSummary.initiativeSummary
// Center text: "X% On Track"
// Legend below the ring
```

### 4. Create Team Health Grid (`src/components/shared/TeamHealthGrid.tsx`)
AG Grid (simple, no tree) showing all teams:
```typescript
const columnDefs: ColDef<TeamSummary>[] = [
  { field: 'teamName', headerName: 'Team', flex: 2 },
  {
    field: 'healthScore',
    headerName: 'Health',
    width: 140,
    cellRenderer: ({ value }) => <HealthScoreBar score={value} />,
    sort: 'asc', // worst teams first
  },
  { field: 'activeSprintName', headerName: 'Sprint', flex: 1 },
  { field: 'deliveredPoints', headerName: 'Delivered (pts)', width: 140, type: 'numericColumn' },
  { field: 'carriedCount', headerName: 'Carried Over', width: 130, type: 'numericColumn' },
];
```

### 5. Create Top Slipped Initiatives list (`src/components/roadmap/TopSlippedList.tsx`)
Ordered list of top 10 most critical slipped initiatives:
- Initiative key + name
- Days overdue
- Number of child epics slipped
- Owner
- Red severity badge

### 6. Create Upcoming Deadlines timeline (`src/components/roadmap/UpcomingDeadlines.tsx`)
Horizontal timeline (CSS only, no charting lib) for next 14 days:
- Items plotted by due date
- Color coded by type (initiative/epic/story)
- Hoverable tooltip with item details

### 7. Assemble Executive Dashboard page (`src/pages/ExecutiveDashboardPage.tsx`)
Layout using CSS Grid:
```
[Last updated: X min ago | Refresh | Settings link if not configured]

Row 1 — KPI Cards (6 cards, responsive wrap)
[Total Initiatives] [On Track] [At Risk] [Slipped] [Teams Active] [Avg Health]

Row 2 — Two columns
[Status Ring (40%)] [Team Health Grid (60%)]

Row 3 — Two columns
[Top Slipped Initiatives (50%)] [Upcoming Deadlines (50%)]
```

### 8. Add "Not Configured" empty state
If `projectKeys.length === 0`, show Salt DS `Banner` with:
```
⚙️ Jira not configured
Configure your Jira connection in Settings to start tracking your roadmap.
[Go to Settings] button
```

## Acceptance Criteria
- [ ] Dashboard loads in < 2 seconds (parallel data fetching)
- [ ] 6 KPI cards show correct counts, clickable to filtered views
- [ ] Status ring shows correct % breakdown
- [ ] Team health grid sorted worst-to-best by default
- [ ] Top slipped initiatives list shows max 10 items
- [ ] "Not configured" empty state shows if project keys are missing
- [ ] Auto-refreshes every 10 minutes
- [ ] Mobile-responsive: KPI cards wrap, grids scroll horizontally

## Output
Update TASK_REGISTRY.md:
- Mark 10 `DONE`: "Executive dashboard with KPIs, status ring, team health grid, slippage list"
