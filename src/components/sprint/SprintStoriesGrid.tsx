import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Spinner, Text } from '@salt-ds/core';
import { JiraLink } from '@/components/shared/JiraLink';
import { formatSlipDate } from '@/utils/slippage.utils';
import type { Story } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

// Status sort order: Done first so completed work is visible at top
const STATUS_ORDER: Record<string, number> = {
  DONE: 0,
  IN_PROGRESS: 1,
  TODO: 2,
  BLOCKED: 3,
};

const STATUS_LABELS: Record<string, string> = {
  DONE: 'Done',
  IN_PROGRESS: 'In Progress',
  TODO: 'To Do',
  BLOCKED: 'Blocked',
};

const KeyCellRenderer = ({ value, data }: ICellRendererParams<Story>) =>
  data ? <JiraLink issueKey={String(value)} url={data.jiraUrl} /> : null;

const DueDateCellRenderer = ({ value }: ICellRendererParams<Story>) => (
  <span style={{ fontSize: 12 }}>{formatSlipDate(value as string | null)}</span>
);

const CarriedCellRenderer = ({ value }: ICellRendererParams<Story>) => {
  const v = value as number;
  if (v === 0) return <span style={{ color: 'var(--salt-color-foreground-secondary)' }}>—</span>;
  return (
    <span
      style={{
        color: v >= 2 ? 'var(--salt-status-error-foreground)' : 'var(--salt-status-warning-foreground)',
        fontWeight: v >= 2 ? 600 : 400,
      }}
      title={`Moved from previous sprint ${v} time(s)`}
    >
      {v}×
    </span>
  );
};

const StatusCellRenderer = ({ value }: ICellRendererParams<Story>) => {
  const label = STATUS_LABELS[String(value)] ?? String(value);
  const colors: Record<string, string> = {
    DONE: 'var(--salt-status-success-foreground)',
    IN_PROGRESS: 'var(--salt-color-blue-600)',
    TODO: 'var(--salt-color-foreground-secondary)',
    BLOCKED: 'var(--salt-status-error-foreground)',
  };
  return (
    <span style={{ color: colors[String(value)] ?? 'inherit', fontWeight: 500, fontSize: 12 }}>
      {label}
    </span>
  );
};

interface SprintStoriesGridProps {
  stories: Story[];
  loading?: boolean;
}

export const SprintStoriesGrid = ({ stories, loading = false }: SprintStoriesGridProps) => {
  const sortedStories = useMemo(
    () =>
      [...stories].sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return (b.storyPoints ?? 0) - (a.storyPoints ?? 0);
      }),
    [stories]
  );

  const columnDefs = useMemo<ColDef<Story>[]>(
    () => [
      {
        field: 'key',
        headerName: 'Key',
        width: 100,
        cellRenderer: KeyCellRenderer,
      },
      {
        field: 'summary',
        headerName: 'Story',
        flex: 3,
        minWidth: 200,
        tooltipField: 'summary',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: StatusCellRenderer,
      },
      {
        field: 'storyPoints',
        headerName: 'Pts',
        width: 70,
        type: 'numericColumn',
        valueFormatter: ({ value }) => (value != null ? String(value) : '—'),
      },
      {
        field: 'assignee',
        headerName: 'Assignee',
        width: 150,
        valueFormatter: ({ value }) =>
          (value as { displayName?: string } | null)?.displayName ?? (value as string | null) ?? '—',
      },
      {
        field: 'timesCarried',
        headerName: 'Carried',
        width: 85,
        cellRenderer: CarriedCellRenderer,
      },
      {
        field: 'dueDate',
        headerName: 'Due',
        width: 160,
        cellRenderer: DueDateCellRenderer,
      },
      {
        field: 'priority',
        headerName: 'Priority',
        width: 95,
        valueFormatter: ({ value }) => {
          const map: Record<string, string> = {
            HIGHEST: '🔴 Highest',
            HIGH: '🟠 High',
            MEDIUM: '🟡 Medium',
            LOW: '🔵 Low',
            LOWEST: '⚪ Lowest',
          };
          return map[String(value)] ?? String(value);
        },
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="loading-container" style={{ height: 200 }}>
        <Spinner size="medium" aria-label="Loading sprint stories" />
      </div>
    );
  }

  if (sortedStories.length === 0) {
    return (
      <div className="empty-state" style={{ height: 120 }}>
        <Text color="secondary">No stories in this sprint.</Text>
      </div>
    );
  }

  return (
    <div
      className="ag-theme-quartz"
      style={{ height: Math.min(400, 40 + sortedStories.length * 36 + 8), width: '100%' }}
    >
      <AgGridReact<Story>
        rowData={sortedStories}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, sortable: true }}
        rowHeight={36}
        headerHeight={36}
        suppressRowClickSelection
        enableCellTextSelection
        getRowClass={({ data: row }) => {
          if (!row) return '';
          if (row.status === 'DONE') return 'row-done';
          if (row.timesCarried >= 2) return 'row-carried';
          return '';
        }}
      />
    </div>
  );
};
