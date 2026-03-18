import { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, GridReadyEvent, ICellRendererParams, GridApi, CellStyle } from 'ag-grid-community';
import { Spinner, Text } from '@salt-ds/core';
import { format, parseISO } from 'date-fns';
import { JiraLink } from '@/components/shared/JiraLink';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import type { SlippedItem, AtRiskItem, SlippageSeverity } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Shared cell renderers ────────────────────────────────────────────────────

const KeyCellRenderer = ({ value, data }: ICellRendererParams<SlippedItem | AtRiskItem>) =>
  data ? <JiraLink issueKey={String(value)} url={data.jiraUrl} /> : null;

const SeverityCellRenderer = ({ value }: ICellRendererParams<SlippedItem>) =>
  value ? <SeverityBadge severity={value as SlippageSeverity} showDot /> : null;

const TypeCellRenderer = ({ value }: ICellRendererParams<SlippedItem>) => (
  <span style={{ textTransform: 'capitalize', fontSize: 12 }}>{String(value)}</span>
);

const DateCellRenderer = ({ value }: ICellRendererParams<SlippedItem>) => (
  <span style={{ fontSize: 12 }}>
    {value ? format(parseISO(value as string), 'MMM d, yyyy') : '—'}
  </span>
);

// ─── Slipped items grid ───────────────────────────────────────────────────────

const OVERDUE_CELL_STYLE = ({ value }: { value: unknown }): CellStyle => {
  const v = value as number;
  if (v > 14) return { color: 'var(--salt-status-error-foreground)', fontWeight: '600' };
  if (v > 7) return { color: 'var(--salt-color-orange-700)' };
  return { color: 'var(--salt-color-yellow-700)' };
};

interface SlippageGridProps {
  items: SlippedItem[];
  loading: boolean;
  onGridReady?: (api: GridApi<SlippedItem>) => void;
}

export const SlippageGrid = ({ items, loading, onGridReady }: SlippageGridProps) => {
  const gridRef = useRef<AgGridReact<SlippedItem>>(null);

  const columnDefs = useMemo<ColDef<SlippedItem>[]>(
    () => [
      {
        field: 'slippageSeverity',
        headerName: '',
        width: 100,
        pinned: 'left' as const,
        cellRenderer: SeverityCellRenderer,
        sortable: true,
        comparator: (a: SlippageSeverity, b: SlippageSeverity) => {
          const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, OK: 4 };
          return (order[a] ?? 9) - (order[b] ?? 9);
        },
      },
      {
        field: 'key',
        headerName: 'Key',
        width: 110,
        pinned: 'left' as const,
        cellRenderer: KeyCellRenderer,
      },
      {
        field: 'summary',
        headerName: 'Summary',
        flex: 3,
        minWidth: 200,
        tooltipField: 'summary',
      },
      {
        field: 'issueType',
        headerName: 'Type',
        width: 110,
        cellRenderer: TypeCellRenderer,
      },
      {
        field: 'daysPastDue',
        headerName: 'Days Overdue',
        width: 130,
        type: 'numericColumn',
        cellStyle: OVERDUE_CELL_STYLE,
        sort: 'desc' as const,
      },
      {
        field: 'dueDate',
        headerName: 'Was Due',
        width: 130,
        cellRenderer: DateCellRenderer,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
      },
      {
        field: 'assignee',
        headerName: 'Assignee',
        width: 160,
        valueGetter: ({ data: row }) => row?.assignee?.displayName ?? '—',
      },
      {
        field: 'teamName',
        headerName: 'Team',
        width: 130,
        valueFormatter: ({ value }) => (value as string | null) ?? '—',
      },
      {
        field: 'sprintName',
        headerName: 'Sprint',
        width: 150,
        valueFormatter: ({ value }) => (value as string | null) ?? '—',
      },
      {
        field: 'projectKey',
        headerName: 'Project',
        width: 90,
      },
    ],
    []
  );

  const handleGridReady = useCallback(
    (e: GridReadyEvent<SlippedItem>) => onGridReady?.(e.api),
    [onGridReady]
  );

  if (loading) {
    return (
      <div className="loading-container" style={{ height: 400 }}>
        <Spinner size="medium" aria-label="Loading slipped items" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ height: 300 }}>
        <Text styleAs="h3" color="secondary">All items on track!</Text>
        <Text color="secondary">No overdue items found for the selected projects.</Text>
      </div>
    );
  }

  return (
    <div
      className="ag-theme-quartz"
      style={{ height: 'calc(100vh - 380px)', minHeight: 300, width: '100%' }}
      data-testid="slippage-grid"
    >
      <AgGridReact<SlippedItem>
        ref={gridRef}
        rowData={items}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, resizable: true, filter: true }}
        rowHeight={36}
        headerHeight={40}
        suppressRowClickSelection
        enableCellTextSelection
        onGridReady={handleGridReady}
        getRowClass={({ data: row }) => {
          if (!row) return '';
          if (row.slippageSeverity === 'CRITICAL') return 'row-critical';
          return '';
        }}
      />
    </div>
  );
};

// ─── At-risk items grid ───────────────────────────────────────────────────────

const AtRiskKeyCellRenderer = ({ value, data }: ICellRendererParams<AtRiskItem>) =>
  data ? <JiraLink issueKey={String(value)} url={data.jiraUrl} /> : null;

const DaysUntilCellRenderer = ({ value }: ICellRendererParams<AtRiskItem>) => {
  const v = value as number;
  const color =
    v <= 3
      ? 'var(--salt-status-error-foreground)'
      : v <= 7
        ? 'var(--salt-status-warning-foreground)'
        : 'var(--salt-color-foreground-secondary)';
  return <span style={{ color, fontWeight: v <= 3 ? 600 : 400 }}>{v}d</span>;
};

interface AtRiskGridProps {
  items: AtRiskItem[];
  loading: boolean;
  onGridReady?: (api: GridApi<AtRiskItem>) => void;
}

export const AtRiskGrid = ({ items, loading, onGridReady }: AtRiskGridProps) => {
  const columnDefs = useMemo<ColDef<AtRiskItem>[]>(
    () => [
      {
        field: 'key',
        headerName: 'Key',
        width: 110,
        pinned: 'left' as const,
        cellRenderer: AtRiskKeyCellRenderer,
      },
      {
        field: 'summary',
        headerName: 'Summary',
        flex: 3,
        minWidth: 200,
        tooltipField: 'summary',
      },
      {
        field: 'issueType',
        headerName: 'Type',
        width: 110,
        cellRenderer: TypeCellRenderer,
      },
      {
        field: 'daysUntilDue',
        headerName: 'Due In',
        width: 100,
        type: 'numericColumn',
        cellRenderer: DaysUntilCellRenderer,
        sort: 'asc' as const,
      },
      {
        field: 'dueDate',
        headerName: 'Due Date',
        width: 130,
        cellRenderer: DateCellRenderer,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
      },
      {
        field: 'assignee',
        headerName: 'Assignee',
        width: 160,
        valueGetter: ({ data: row }) => row?.assignee?.displayName ?? '—',
      },
      {
        field: 'teamName',
        headerName: 'Team',
        width: 130,
        valueFormatter: ({ value }) => (value as string | null) ?? '—',
      },
      {
        field: 'projectKey',
        headerName: 'Project',
        width: 90,
      },
    ],
    []
  );

  const handleGridReady = useCallback(
    (e: GridReadyEvent<AtRiskItem>) => onGridReady?.(e.api),
    [onGridReady]
  );

  if (loading) {
    return (
      <div className="loading-container" style={{ height: 300 }}>
        <Spinner size="medium" aria-label="Loading at-risk items" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ height: 300 }}>
        <Text styleAs="h3" color="secondary">No items at risk</Text>
        <Text color="secondary">No items due within the lookahead window.</Text>
      </div>
    );
  }

  return (
    <div
      className="ag-theme-quartz"
      style={{ height: 'calc(100vh - 380px)', minHeight: 300, width: '100%' }}
      data-testid="at-risk-grid"
    >
      <AgGridReact<AtRiskItem>
        rowData={items}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, resizable: true, filter: true }}
        rowHeight={36}
        headerHeight={40}
        suppressRowClickSelection
        enableCellTextSelection
        onGridReady={handleGridReady}
      />
    </div>
  );
};
