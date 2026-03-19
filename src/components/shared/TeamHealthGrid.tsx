import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import type { TeamSummary } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'var(--salt-status-success-foreground)'
      : score >= 60
      ? 'var(--salt-status-warning-foreground)'
      : 'var(--salt-status-error-foreground)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: 'var(--salt-separable-primary-borderColor)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ width: 32, textAlign: 'right', fontSize: 13, fontWeight: 600, color }}>
        {score}
      </span>
    </div>
  );
}

const COL_DEFS: ColDef<TeamSummary>[] = [
  { field: 'teamName', headerName: 'Team', flex: 2, minWidth: 140 },
  {
    field: 'healthScore',
    headerName: 'Health Score',
    width: 180,
    sort: 'asc',
    cellRenderer: ({ value }: { value: number }) => <HealthBar score={value} />,
  },
  { field: 'activeSprintName', headerName: 'Active Sprint', flex: 1, minWidth: 120, valueGetter: (p) => p.data?.activeSprintName ?? '—' },
  { field: 'deliveredPoints', headerName: 'Delivered (pts)', width: 130, type: 'numericColumn' },
  { field: 'carriedCount', headerName: 'Carried Over', width: 120, type: 'numericColumn' },
];

interface TeamHealthGridProps {
  teams: TeamSummary[];
}

export const TeamHealthGrid = ({ teams }: TeamHealthGridProps) => (
  <div className="ag-theme-quartz" style={{ height: Math.max(160, 40 + teams.length * 40 + 8) }}>
    <AgGridReact<TeamSummary>
      columnDefs={COL_DEFS}
      rowData={teams}
      rowHeight={40}
      headerHeight={40}
      suppressMovableColumns
      suppressCellFocus
    />
  </div>
);

// Export HealthBar for use in other components
export { HealthBar };
