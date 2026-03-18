import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, ICellRendererParams, GridApi } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Spinner, Text } from '@salt-ds/core';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { JiraLink } from '@/components/shared/JiraLink';
import { formatSlipDate } from '@/utils/slippage.utils';
import type { HierarchyNode, SlippageSeverity } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Hierarchy expansion context (mutable ref pattern for AG Grid) ────────────

interface HierarchyContext {
  collapsedKeys: Set<string>;
  hasChildren: Set<string>;
  onToggle: (key: string) => void;
}

// ─── Cell renderers (defined outside component for stability) ─────────────────

const HierarchyCellRenderer = (params: ICellRendererParams<HierarchyNode>) => {
  const data = params.data;
  if (!data) return null;
  const ctx = params.context as HierarchyContext;
  const depth = data.path.length - 1;
  const isExpandable = ctx.hasChildren.has(data.key);
  const isCollapsed = ctx.collapsedKeys.has(data.key);

  const TYPE_COLORS: Record<HierarchyNode['type'], string> = {
    initiative: 'var(--salt-color-purple-600)',
    deliverable: 'var(--salt-color-blue-600)',
    epic: 'var(--salt-color-teal-600)',
    story: 'var(--salt-color-foreground)',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingLeft: depth * 20,
        height: '100%',
        gap: 4,
      }}
    >
      <span style={{ width: 18, flexShrink: 0, display: 'inline-flex', justifyContent: 'center' }}>
        {isExpandable ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              ctx.onToggle(data.key);
            }}
            aria-label={isCollapsed ? 'Expand row' : 'Collapse row'}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--salt-color-foreground-secondary)',
              fontSize: 10,
              padding: 0,
              lineHeight: 1,
            }}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        ) : null}
      </span>
      <span
        style={{
          color: TYPE_COLORS[data.type],
          fontWeight: depth === 0 ? 600 : depth === 1 ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={data.summary}
      >
        {data.summary}
      </span>
    </div>
  );
};

const TypeCellRenderer = ({ value }: ICellRendererParams<HierarchyNode>) => (
  <span
    style={{
      textTransform: 'capitalize',
      fontSize: 11,
      padding: '1px 6px',
      borderRadius: 10,
      background: 'var(--salt-color-gray-30)',
      fontWeight: 500,
    }}
  >
    {String(value)}
  </span>
);

const SlippageCellRenderer = ({ value }: ICellRendererParams<HierarchyNode>) =>
  value ? <SeverityBadge severity={value as SlippageSeverity} showDot /> : null;

const KeyCellRenderer = ({ value, data }: ICellRendererParams<HierarchyNode>) =>
  data ? <JiraLink issueKey={String(value)} url={data.jiraUrl} /> : null;

const DueDateCellRenderer = ({ value }: ICellRendererParams<HierarchyNode>) => (
  <span style={{ fontSize: 12 }}>{formatSlipDate(value as string | null)}</span>
);

// ─── RoadmapGrid component ────────────────────────────────────────────────────

export interface RoadmapGridProps {
  allNodes: HierarchyNode[];
  loading: boolean;
  searchText: string;
  severityFilter: SlippageSeverity[];
  onGridReady?: (api: GridApi<HierarchyNode>) => void;
}

export const RoadmapGrid = ({
  allNodes,
  loading,
  searchText,
  severityFilter,
  onGridReady,
}: RoadmapGridProps) => {
  const gridRef = useRef<AgGridReact<HierarchyNode>>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  // Compute which keys have children
  const hasChildren = useMemo(() => {
    const set = new Set<string>();
    for (const node of allNodes) {
      if (node.path.length > 1) {
        set.add(node.path[node.path.length - 2]);
      }
    }
    return set;
  }, [allNodes]);

  // Toggle expand/collapse
  const onToggle = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Expose expand/collapse all via ref pattern
  const expandAll = useCallback(() => setCollapsedKeys(new Set()), []);
  const collapseAll = useCallback(
    () => setCollapsedKeys(new Set(hasChildren)),
    [hasChildren]
  );
  // Expose to parent via custom events on the grid wrapper div
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handleExpand = () => expandAll();
    const handleCollapse = () => collapseAll();
    el.addEventListener('roadmap:expand-all', handleExpand);
    el.addEventListener('roadmap:collapse-all', handleCollapse);
    return () => {
      el.removeEventListener('roadmap:expand-all', handleExpand);
      el.removeEventListener('roadmap:collapse-all', handleCollapse);
    };
  }, [expandAll, collapseAll]);

  // Mutable context object — stable identity, updated each render
  const ctxRef = useRef<HierarchyContext>({ collapsedKeys: new Set(), hasChildren: new Set(), onToggle });
  ctxRef.current.collapsedKeys = collapsedKeys;
  ctxRef.current.hasChildren = hasChildren;
  ctxRef.current.onToggle = onToggle;

  // Filter nodes: exclude children of collapsed parents, apply severity and text filters
  const visibleNodes = useMemo(() => {
    let nodes = allNodes;

    // Expansion filter
    nodes = nodes.filter((node) => {
      for (let i = 0; i < node.path.length - 1; i++) {
        if (collapsedKeys.has(node.path[i])) return false;
      }
      return true;
    });

    // Severity filter (include ancestors of matching nodes so tree context is preserved)
    if (severityFilter.length > 0) {
      const matchingPaths = new Set<string>();
      for (const node of nodes) {
        if (severityFilter.includes(node.slippageSeverity)) {
          node.path.forEach((_, i) => {
            matchingPaths.add(node.path.slice(0, i + 1).join('/'));
          });
        }
      }
      nodes = nodes.filter((n) => matchingPaths.has(n.path.join('/')));
    }

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const matchingPaths = new Set<string>();
      for (const node of nodes) {
        if (node.summary.toLowerCase().includes(q) || node.key.toLowerCase().includes(q)) {
          node.path.forEach((_, i) => {
            matchingPaths.add(node.path.slice(0, i + 1).join('/'));
          });
        }
      }
      nodes = nodes.filter((n) => matchingPaths.has(n.path.join('/')));
    }

    return nodes;
  }, [allNodes, collapsedKeys, severityFilter, searchText]);

  // Refresh cells after collapse state changes (updates chevrons)
  useEffect(() => {
    gridRef.current?.api?.refreshCells({ force: true, columns: ['summary'] });
  }, [collapsedKeys]);

  const columnDefs = useMemo<ColDef<HierarchyNode>[]>(
    () => [
      {
        field: 'summary',
        headerName: 'Initiative / Deliverable / Epic / Story',
        flex: 4,
        minWidth: 280,
        cellRenderer: HierarchyCellRenderer,
        suppressSizeToFit: false,
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 110,
        cellRenderer: TypeCellRenderer,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
      },
      {
        field: 'slippageSeverity',
        headerName: 'Slippage',
        width: 115,
        cellRenderer: SlippageCellRenderer,
      },
      {
        field: 'dueDate',
        headerName: 'Due Date',
        width: 190,
        cellRenderer: DueDateCellRenderer,
      },
      {
        field: 'daysPastDue',
        headerName: 'Days Overdue',
        width: 125,
        type: 'numericColumn',
        cellStyle: ({ value }) =>
          (value as number) > 0
            ? { color: 'var(--salt-status-error-foreground)' }
            : { color: 'var(--salt-color-foreground-secondary)' },
        valueFormatter: ({ value }) => ((value as number) > 0 ? String(value) : '—'),
      },
      {
        field: 'storyPoints',
        headerName: 'Points',
        width: 80,
        type: 'numericColumn',
        valueFormatter: ({ value }) => (value != null ? String(value) : '—'),
      },
      {
        field: 'assignee',
        headerName: 'Assignee',
        width: 150,
        valueFormatter: ({ value }) => (value as string | null) ?? '—',
      },
      {
        field: 'teamName',
        headerName: 'Team',
        width: 130,
        valueFormatter: ({ value }) => (value as string | null) ?? '—',
      },
      {
        field: 'key',
        headerName: 'Key',
        width: 105,
        cellRenderer: KeyCellRenderer,
      },
    ],
    []
  );

  const handleGridReady = useCallback(
    (e: GridReadyEvent<HierarchyNode>) => {
      onGridReady?.(e.api);
    },
    [onGridReady]
  );

  if (loading) {
    return (
      <div className="loading-container" style={{ height: 'calc(100vh - 180px)' }}>
        <Spinner size="medium" aria-label="Loading roadmap data" />
      </div>
    );
  }

  if (allNodes.length === 0) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 180px)' }}>
        <Text color="secondary" styleAs="h3">
          No initiatives found
        </Text>
        <Text color="secondary">Check your project keys in Settings.</Text>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="ag-theme-quartz"
      style={{ height: 'calc(100vh - 180px)', width: '100%' }}
      data-testid="roadmap-hierarchy-grid"
    >
      <AgGridReact<HierarchyNode>
        ref={gridRef}
        rowData={visibleNodes}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, resizable: true, minWidth: 60 }}
        context={ctxRef.current}
        onGridReady={handleGridReady}
        suppressRowClickSelection
        enableCellTextSelection
        rowHeight={36}
        headerHeight={40}
      />
    </div>
  );
};
