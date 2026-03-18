# Task 06 — Roadmap Hierarchy Grid

**Agent:** ui-developer
**Status:** PENDING
**Depends on:** Tasks 02, 03, 04, 05 complete

## Context
The core view: a hierarchical AG Grid showing Initiative → Deliverable → Epic → Story.
Supports grouping, collapsing, filtering, and slippage severity color-coding.
This handles 100s of initiatives and 1000s of stories — must be virtualized.

## Key requirement
AG Grid tree data feature is required here (not row grouping).
Each `HierarchyNode` has a `path: string[]` that AG Grid uses for the tree.

## Steps

### 1. Create TanStack Query hooks (`src/hooks/useRoadmap.ts`)
```typescript
import { useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { buildHierarchyNodes } from '@/utils/hierarchy.utils';
import { useConfigStore } from '@/store/configStore';
import type { HierarchyNode } from '@/types';

export function useRoadmapHierarchy() {
  const { projectKeys } = useConfigStore();

  return useQuery({
    queryKey: ['roadmap', 'hierarchy', projectKeys],
    queryFn: async () => {
      const initiatives = await jiraService.fetchInitiatives(projectKeys);
      // Fetch all epics for each initiative in parallel (batched to avoid rate limits)
      // Build flat HierarchyNode[] with path arrays
      return buildHierarchyNodes(initiatives);
    },
    staleTime: 5 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}

export function useSlippageCount() {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['slippage', 'count', projectKeys],
    queryFn: async () => {
      const items = await jiraService.fetchSlippedItems(projectKeys);
      return items.length;
    },
    staleTime: 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}
```

### 2. Create hierarchy utilities (`src/utils/hierarchy.utils.ts`)
```typescript
import type { Initiative, HierarchyNode } from '@/types';
import { calculateSlippage } from './slippage.utils';

export function buildHierarchyNodes(initiatives: Initiative[]): HierarchyNode[] {
  const nodes: HierarchyNode[] = [];
  const today = new Date();

  for (const initiative of initiatives) {
    // Add initiative node
    nodes.push({
      path: [initiative.key],
      ...toHierarchyNode(initiative, 'initiative', today),
    });

    for (const deliverable of initiative.deliverables) {
      nodes.push({
        path: [initiative.key, deliverable.key],
        ...toHierarchyNode(deliverable, 'deliverable', today),
      });

      for (const epic of deliverable.epics) {
        nodes.push({
          path: [initiative.key, deliverable.key, epic.key],
          ...toHierarchyNode(epic, 'epic', today),
        });

        for (const story of epic.stories) {
          nodes.push({
            path: [initiative.key, deliverable.key, epic.key, story.key],
            ...toHierarchyNode(story, 'story', today),
          });
        }
      }
    }
  }
  return nodes;
}
```

### 3. Create slippage utilities (`src/utils/slippage.utils.ts`)
```typescript
import { differenceInDays, parseISO } from 'date-fns';
import type { SlippageSeverity } from '@/types';

export function calculateSlippage(dueDate: string | null, today: Date): SlippageSeverity {
  if (!dueDate) return 'OK';
  const days = differenceInDays(today, parseISO(dueDate));
  if (days > 14) return 'CRITICAL';
  if (days > 7) return 'HIGH';
  if (days > 0) return 'MEDIUM';
  if (days >= -3) return 'LOW';
  return 'OK';
}

export function getDaysPastDue(dueDate: string | null, today: Date): number {
  if (!dueDate) return 0;
  return differenceInDays(today, parseISO(dueDate));
}

export function formatSlipDate(dueDate: string | null): string {
  if (!dueDate) return '—';
  const days = differenceInDays(new Date(), parseISO(dueDate));
  if (days > 0) return `${days}d overdue (${formatDate(dueDate)})`;
  if (days === 0) return `Due today`;
  return `Due in ${Math.abs(days)}d (${formatDate(dueDate)})`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(parseISO(iso));
}
```

### 4. Create Roadmap Grid component (`src/components/roadmap/RoadmapGrid.tsx`)
```tsx
import { useMemo, useRef } from 'react';
import type { ColDef, GridReadyEvent, IRowNode } from 'ag-grid-community';
import type { AgGridReact } from 'ag-grid-react';
import { BaseGrid } from '@/components/shared/BaseGrid';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { JiraLink } from '@/components/shared/JiraLink';
import type { HierarchyNode } from '@/types';

interface RoadmapGridProps {
  data: HierarchyNode[];
  loading: boolean;
}

export const RoadmapGrid = ({ data, loading }: RoadmapGridProps) => {
  const gridRef = useRef<AgGridReact<HierarchyNode>>(null);

  const columnDefs = useMemo<ColDef<HierarchyNode>[]>(() => [
    {
      field: 'summary',
      headerName: 'Item',
      flex: 3,
      cellRendererParams: { suppressCount: false },
      // auto group column will render here for tree data
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 110,
      cellRenderer: ({ value }: { value: string }) => (
        <span style={{ textTransform: 'capitalize', fontSize: '12px' }}>{value}</span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
    },
    {
      field: 'slippageSeverity',
      headerName: 'Slippage',
      width: 120,
      cellRenderer: ({ value }: { value: HierarchyNode['slippageSeverity'] }) => (
        <SeverityBadge severity={value} />
      ),
      sort: 'desc', // most critical first by default
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 180,
      valueFormatter: ({ value }) => formatSlipDate(value),
    },
    {
      field: 'daysPastDue',
      headerName: 'Days Past Due',
      width: 130,
      type: 'numericColumn',
      cellStyle: ({ value }) => value > 0 ? { color: 'var(--salt-status-error-foreground)' } : {},
    },
    {
      field: 'storyPoints',
      headerName: 'Points',
      width: 80,
      type: 'numericColumn',
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 150,
    },
    {
      field: 'teamName',
      headerName: 'Team',
      width: 130,
    },
    {
      field: 'key',
      headerName: 'Key',
      width: 110,
      cellRenderer: ({ value, data: row }: { value: string; data: HierarchyNode }) => (
        <JiraLink issueKey={value} url={row.jiraUrl} />
      ),
    },
  ], []);

  const autoGroupColumnDef = useMemo<ColDef<HierarchyNode>>(() => ({
    headerName: 'Initiative / Deliverable / Epic / Story',
    minWidth: 300,
    flex: 4,
    cellRendererParams: { suppressCount: false },
  }), []);

  return (
    <BaseGrid<HierarchyNode>
      rowData={data}
      columnDefs={columnDefs}
      loading={loading}
      height="calc(100vh - 160px)"
      treeData={true}
      getDataPath={(node) => node.path}
      gridOptions={{
        autoGroupColumnDef,
        groupDefaultExpanded: 1, // expand to deliverable level by default
        rowSelection: 'multiple',
        enableCellTextSelection: true,
      }}
      testId="roadmap-hierarchy-grid"
    />
  );
};
```

### 5. Create RoadmapPage toolbar (`src/pages/RoadmapPage.tsx`)
Above the grid, add a Salt DS toolbar with:
- Project key filter (multi-select dropdown)
- Severity filter (checkboxes: CRITICAL, HIGH, MEDIUM, LOW)
- Team filter (multi-select)
- Date range filter (from/to)
- Text search (debounced, 300ms)
- "Expand All / Collapse All" buttons
- "Export CSV" button (use AG Grid's built-in `exportDataAsCsv()`)
- Count chip: "Showing 247 of 1,043 items"

## Acceptance Criteria
- [ ] Hierarchy tree renders Initiative → Deliverable → Epic → Story
- [ ] Slippage severity column color-codes rows
- [ ] Filters work: severity, team, project key, text search
- [ ] Export CSV downloads all filtered data
- [ ] Expand/collapse all works
- [ ] Grid virtualizes correctly (no lag with 1000+ rows)
- [ ] Click on Jira key opens Jira issue in new tab
- [ ] Empty state: "No initiatives found — check project keys in Settings"

## Output
Update TASK_REGISTRY.md:
- Mark 06 `DONE`: "Roadmap hierarchy tree grid with slippage colors, filters, CSV export"
