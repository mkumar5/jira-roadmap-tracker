# Task 07 — Sprint Tracking View

**Agent:** ui-developer
**Status:** PENDING
**Depends on:** Tasks 03, 04, 05 complete

## Context
Per-team sprint tracking view. Shows all active sprints across 5-20 teams.
Each team's sprint has: committed stories, completed stories, carried-over stories.
Management can see ALL teams at once or filter to specific teams.

## Steps

### 1. Create sprint hooks (`src/hooks/useSprint.ts`)
```typescript
import { useQueries, useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { useConfigStore } from '@/store/configStore';

export function useAllBoards() {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['boards', projectKeys],
    queryFn: () => Promise.all(
      projectKeys.map((key) => jiraService.fetchBoards(key))
    ).then((results) => results.flat()),
    staleTime: 30 * 60 * 1000, // boards rarely change
    enabled: projectKeys.length > 0,
  });
}

export function useActiveSprints(boardIds: number[]) {
  return useQuery({
    queryKey: ['sprints', 'active', boardIds],
    queryFn: () => jiraService.fetchActiveSprints(boardIds),
    staleTime: 60 * 1000,
    enabled: boardIds.length > 0,
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });
}

export function useSprintIssues(sprintIds: number[]) {
  // Parallel queries per sprint
  return useQueries({
    queries: sprintIds.map((id) => ({
      queryKey: ['sprint', 'issues', id],
      queryFn: () => jiraService.fetchSprintIssues(id),
      staleTime: 60 * 1000,
    })),
  });
}
```

### 2. Create Sprint Team Card (`src/components/sprint/SprintTeamCard.tsx`)
Salt DS `Card` per team showing:
- Team name + sprint name (e.g. "Team Alpha | Sprint 24")
- Sprint dates (start → end, X days remaining)
- Health score badge (color: green >80, yellow 60-80, red <60)
- Mini stats: `Committed: 23 pts | Done: 14 pts | Remaining: 9 pts`
- Progress bar (Salt DS `LinearProgress`)
- Expand button to show story-level grid below

```tsx
import { Card, Text, StackLayout, LinearProgress, Badge } from '@salt-ds/core';
import type { Sprint, SprintReport } from '@/types';

interface SprintTeamCardProps {
  sprint: Sprint;
  report: Partial<SprintReport>;
  expanded: boolean;
  onToggle: () => void;
}
```

### 3. Create Sprint Stories Grid (`src/components/sprint/SprintStoriesGrid.tsx`)
AG Grid (not tree) with row grouping by status:
```typescript
const columnDefs: ColDef<Story>[] = [
  { field: 'key', width: 100, cellRenderer: JiraLink },
  { field: 'summary', flex: 3 },
  { field: 'status', width: 130, rowGroup: true, hide: true },
  { field: 'storyPoints', headerName: 'Pts', width: 70 },
  { field: 'assignee', width: 150 },
  {
    field: 'timesCarried',
    headerName: 'Carried',
    width: 90,
    cellStyle: ({ value }) => value >= 2 ? { color: 'var(--salt-status-error-foreground)' } : {},
    tooltipValueGetter: ({ value }) => value > 0 ? `Moved from previous sprint ${value} time(s)` : '',
  },
  { field: 'dueDate', headerName: 'Due', width: 120 },
];
```
Group rows: `Done (14 pts)`, `In Progress (6 pts)`, `To Do (3 pts)`, `Blocked (0 pts)`

### 4. Create Sprint Tracking Page (`src/pages/SprintTrackingPage.tsx`)
Layout:
```
[Filter Bar: Team dropdown | Sprint filter | Show: Cards/Grid toggle]

[Summary Row: "5 active sprints | 3 on track | 1 at risk | 1 slipped"]

[Grid of SprintTeamCards — 2 columns on wide screen, 1 on narrow]
  [Team Alpha | Sprint 24] [Team Beta | Sprint 24]
  [Team Gamma | Sprint 25] [Team Delta | Sprint 24]
  ...

[When a card is expanded: SprintStoriesGrid appears below the card]
```

Use CSS Grid for card layout: `grid-template-columns: repeat(auto-fill, minmax(480px, 1fr))`

### 5. Sprint date/time utilities (`src/utils/date.utils.ts`)
```typescript
import { differenceInDays, formatDistanceToNow, parseISO, format } from 'date-fns';

export function sprintDaysRemaining(endDate: string): number {
  return Math.max(0, differenceInDays(parseISO(endDate), new Date()));
}

export function formatSprintPeriod(startDate: string, endDate: string): string {
  return `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
}

export function sprintProgress(startDate: string, endDate: string): number {
  const total = differenceInDays(parseISO(endDate), parseISO(startDate));
  const elapsed = differenceInDays(new Date(), parseISO(startDate));
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function isSprintOverdue(endDate: string): boolean {
  return differenceInDays(new Date(), parseISO(endDate)) > 0;
}
```

### 6. "Carried Over" detection logic
A story is "carried over" if:
- It appears in current active sprint
- AND it also appeared in previous sprint (check sprint history)
- AND it was NOT completed in the previous sprint

The `timesCarried` field must be computed during data transformation.
This requires fetching 2 sprints per board (current + last closed).
Implement in `jira.service.ts` → `fetchSprintIssues` with `includeCarryoverCount: true` option.

## Acceptance Criteria
- [ ] Sprint team cards render for all active sprints
- [ ] Progress bars show sprint time elapsed vs. points done
- [ ] Carried-over stories highlighted in red when carried 2+ times
- [ ] Team filter narrows cards shown
- [ ] Expanding a card shows AG Grid of that sprint's stories
- [ ] Health score badge updates based on delivered/committed ratio
- [ ] Auto-refreshes every 5 minutes (TanStack Query `refetchInterval`)
- [ ] Handles board with no active sprint gracefully (show "No active sprint" card)

## Output
Update TASK_REGISTRY.md:
- Mark 07 `DONE`: "Sprint tracking: team cards, stories grid, carryover detection, auto-refresh"
