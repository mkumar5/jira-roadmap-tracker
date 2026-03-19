import { useState, useCallback } from 'react';
import { Text, Button, StackLayout, SplitLayout } from '@salt-ds/core';
import { TabsNext, TabNext, TabListNext, TabNextTrigger, TabNextPanel } from '@salt-ds/lab';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { useQuery } from '@tanstack/react-query';
import { sprintReportService } from '@/services/sprint.service';
import { useConfigStore } from '@/store/configStore';
import { HealthScoreGauge } from '@/components/sprint/HealthScoreGauge';
import { VelocityTrendBadge } from '@/components/sprint/VelocityTrendBadge';
import { ReportSection } from '@/components/sprint/ReportSection';
import { exportReportToMarkdown, downloadMarkdown, copyToClipboard, buildReportFilename } from '@/utils/report.utils';
import type { SprintReport, Story } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

const STORY_COLS: ColDef<Story>[] = [
  {
    field: 'key',
    headerName: 'Key',
    width: 110,
    cellRenderer: ({ data }: { data: Story }) =>
      data ? <a href={data.jiraUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--salt-color-blue-600)' }}>{data.key}</a> : null,
  },
  { field: 'summary', headerName: 'Summary', flex: 1, minWidth: 200 },
  { field: 'assignee', headerName: 'Assignee', width: 140, valueGetter: (p) => p.data?.assignee?.displayName ?? '—' },
  { field: 'storyPoints', headerName: 'Pts', width: 60 },
  { field: 'priority', headerName: 'Priority', width: 90 },
];

const CARRIED_COLS: ColDef<Story & { timesCarried: number }>[] = [
  {
    field: 'key',
    headerName: 'Key',
    width: 110,
    cellRenderer: ({ data }: { data: Story }) =>
      data ? <a href={data.jiraUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--salt-color-blue-600)' }}>{data.key}</a> : null,
  },
  { field: 'summary', headerName: 'Summary', flex: 1, minWidth: 200 },
  {
    field: 'timesCarried',
    headerName: 'Carried',
    width: 80,
    cellRenderer: ({ value }: { value: number }) => {
      const color = value >= 2 ? 'var(--salt-status-error-foreground)' : 'var(--salt-color-orange-700)';
      return <span style={{ color, fontWeight: 600 }}>{value}x</span>;
    },
  },
  { field: 'storyPoints', headerName: 'Pts', width: 60 },
];

function ReportBody({ report }: { report: SprintReport }) {
  const [copied, setCopied] = useState(false);

  const handleExportMd = useCallback(() => {
    const md = exportReportToMarkdown(report);
    downloadMarkdown(md, buildReportFilename(report));
  }, [report]);

  const handleCopy = useCallback(async () => {
    const md = exportReportToMarkdown(report);
    await copyToClipboard(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [report]);

  const storyGridStyle = { height: 220 };
  const gridProps = {
    suppressMovableColumns: true,
    suppressCellFocus: true,
    rowHeight: 36,
    headerHeight: 36,
    className: 'ag-theme-quartz',
  };

  return (
    <StackLayout gap={2}>
      <div style={{ display: 'flex', gap: 'var(--salt-spacing-200)', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <HealthScoreGauge score={report.healthScore} />
        </div>
        <div
          style={{
            flex: '1 1 300px',
            padding: 'var(--salt-spacing-150)',
            border: '1px solid var(--salt-separable-primary-borderColor)',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--salt-spacing-100)',
          }}
        >
          <Text styleAs="label" color="secondary">Sprint Period</Text>
          <Text style={{ fontWeight: 600 }}>
            {report.sprint.startDate ?? '?'} – {report.sprint.endDate ?? '?'}
          </Text>
          <div style={{ marginTop: 4 }}>
            <VelocityTrendBadge
              trend={report.velocityTrend.trend}
              thisPoints={report.velocityTrend.thisSprintPoints}
              lastPoints={report.velocityTrend.lastSprintPoints}
            />
          </div>
        </div>
      </div>

      <ReportSection title="✅ Delivered" count={report.delivered.count} points={report.delivered.storyPoints} accent="success">
        <div style={storyGridStyle}>
          <AgGridReact<Story> {...gridProps} columnDefs={STORY_COLS} rowData={report.delivered.items} />
        </div>
      </ReportSection>

      <ReportSection
        title="⏩ Carried Over"
        count={report.carriedOver.count}
        points={report.carriedOver.storyPoints}
        accent={report.carriedOver.count > 0 ? 'warning' : 'success'}
      >
        <div style={storyGridStyle}>
          <AgGridReact<Story & { timesCarried: number }> {...gridProps} columnDefs={CARRIED_COLS} rowData={report.carriedOver.items} />
        </div>
      </ReportSection>

      <ReportSection title="📋 Next Sprint Committed" count={report.nextSprintCommitted.count} points={report.nextSprintCommitted.storyPoints} accent="info">
        <div style={storyGridStyle}>
          <AgGridReact<Story> {...gridProps} columnDefs={STORY_COLS} rowData={report.nextSprintCommitted.items} />
        </div>
      </ReportSection>

      <ReportSection
        title="🔴 Slipped Epics"
        count={report.slippedEpics.length}
        accent={report.slippedEpics.length > 0 ? 'error' : 'success'}
        defaultExpanded={report.slippedEpics.length > 0}
      >
        <StackLayout gap={1}>
          {report.slippedEpics.map((e) => (
            <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--salt-spacing-150)', padding: 'var(--salt-spacing-100) 0', borderBottom: '1px solid var(--salt-separable-primary-borderColor)' }}>
              <a href={e.jiraUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--salt-color-blue-600)', fontWeight: 600, minWidth: 90 }}>
                {e.key}
              </a>
              <Text style={{ flex: 1 }}>{e.summary}</Text>
              <span style={{ color: 'var(--salt-status-error-foreground)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {e.daysPastDue}d overdue
              </span>
            </div>
          ))}
        </StackLayout>
      </ReportSection>

      <div style={{ display: 'flex', gap: 'var(--salt-spacing-150)', paddingTop: 'var(--salt-spacing-100)' }}>
        <Button variant="secondary" onClick={handleExportMd}>↓ Export Markdown</Button>
        <Button variant="secondary" onClick={() => void handleCopy()}>
          {copied ? '✓ Copied!' : '⎘ Copy to Clipboard'}
        </Button>
      </div>
    </StackLayout>
  );
}

export const SprintReportPage = () => {
  const { projectKeys } = useConfigStore();
  const [activeTab, setActiveTab] = useState('');

  const { data: reports = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['sprint-reports', projectKeys],
    queryFn: () => sprintReportService.generateAllTeamReports(projectKeys),
    staleTime: 5 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });

  const effectiveTab = activeTab || reports[0]?.sprint.id.toString() || '';

  if (projectKeys.length === 0) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 120px)' }}>
        <Text styleAs="h3" color="secondary">No project keys configured</Text>
        <Text color="secondary">Go to Settings to add your Jira project keys.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--salt-spacing-150)' }}>
      <SplitLayout
        align="center"
        startItem={<Text styleAs="h4" style={{ fontWeight: 700 }}>Sprint Reports</Text>}
        endItem={
          <div style={{ display: 'flex', gap: 'var(--salt-spacing-100)', alignItems: 'center' }}>
            <Button variant="cta" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Generating…' : 'Generate Reports'}
            </Button>
            {reports.length > 0 && (
              <Button variant="secondary" onClick={() => { reports.forEach((r) => { downloadMarkdown(exportReportToMarkdown(r), buildReportFilename(r)); }); }}>
                Export All
              </Button>
            )}
          </div>
        }
      />

      {isLoading && (
        <div style={{ padding: 'var(--salt-spacing-400)', textAlign: 'center' }}>
          <Text color="secondary">Generating sprint reports…</Text>
        </div>
      )}

      {isError && (
        <div style={{ padding: 'var(--salt-spacing-200)' }}>
          <Text color="secondary">Failed to generate reports. Check Jira connection in Settings.</Text>
        </div>
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <div className="empty-state" style={{ height: 'calc(100vh - 180px)' }}>
          <Text styleAs="h3" color="secondary">No active sprints found</Text>
          <Text color="secondary">Reports are generated for teams with active sprints.</Text>
        </div>
      )}

      {reports.length > 0 && (
        <TabsNext value={effectiveTab} onChange={(_e, val) => setActiveTab(val)}>
          <TabListNext>
            {reports.map((r) => (
              <TabNext key={r.sprint.id} value={r.sprint.id.toString()}>
                <TabNextTrigger>
                  {r.teamName}
                  <span style={{
                    marginLeft: 6, padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: r.healthScore >= 80 ? 'var(--salt-status-success-background)' : r.healthScore >= 60 ? 'var(--salt-status-warning-background)' : 'var(--salt-status-error-background)',
                    color: r.healthScore >= 80 ? 'var(--salt-status-success-foreground)' : r.healthScore >= 60 ? 'var(--salt-status-warning-foreground)' : 'var(--salt-status-error-foreground)',
                  }}>
                    {r.healthScore}
                  </span>
                </TabNextTrigger>
              </TabNext>
            ))}
          </TabListNext>
          {reports.map((r) => (
            <TabNextPanel key={r.sprint.id} value={r.sprint.id.toString()} style={{ padding: 'var(--salt-spacing-200) 0 0' }}>
              <ReportBody report={r} />
            </TabNextPanel>
          ))}
        </TabsNext>
      )}
    </div>
  );
};
