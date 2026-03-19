import { useNavigate } from 'react-router-dom';
import { Text, Button, Banner, BannerContent, StackLayout, GridLayout, GridItem, SplitLayout, FlowLayout, Card } from '@salt-ds/core';
import { useExecutiveSummary } from '@/hooks/useExecutiveSummary';
import { useConfigStore } from '@/store/configStore';
import { KpiCard } from '@/components/shared/KpiCard';
import { StatusRing } from '@/components/shared/StatusRing';
import { TeamHealthGrid } from '@/components/shared/TeamHealthGrid';
import { TopSlippedList } from '@/components/roadmap/TopSlippedList';
import { UpcomingDeadlines } from '@/components/roadmap/UpcomingDeadlines';
import { formatRelativeTime } from '@/utils/date.utils';

function SectionHeader({ title, badge }: { title: string; badge?: string | number }) {
  return (
    <SplitLayout
      style={{
        padding: 'var(--salt-spacing-50) var(--salt-spacing-100)',
        borderBottom: '1px solid var(--salt-separable-primary-borderColor)',
        background: 'var(--salt-color-background-secondary)',
      }}
      align="center"
      startItem={
        <Text styleAs="label" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>
          {title}
        </Text>
      }
      endItem={
        badge !== undefined ? (
          <Text styleAs="label" color="secondary" style={{ fontSize: 11 }}>{badge}</Text>
        ) : undefined
      }
    />
  );
}

export const ExecutiveDashboardPage = () => {
  const navigate = useNavigate();
  const { projectKeys } = useConfigStore();
  const { data: summary, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useExecutiveSummary();

  if (projectKeys.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: 'var(--salt-spacing-400) auto' }}>
        <Banner status="warning">
          <BannerContent>
            <StackLayout gap={1}>
              <Text styleAs="label" style={{ fontWeight: 700 }}>Jira not configured</Text>
              <Text styleAs="label">Configure your Jira connection in Settings to start tracking your roadmap.</Text>
              <Button variant="cta" onClick={() => navigate('/settings')}>Go to Settings</Button>
            </StackLayout>
          </BannerContent>
        </Banner>
      </div>
    );
  }

  const lastUpdated = dataUpdatedAt
    ? formatRelativeTime(new Date(dataUpdatedAt).toISOString())
    : null;

  const is = summary?.initiativeSummary;
  const km = summary?.keyMetrics;

  return (
    <StackLayout gap={2} direction="column">
      {/* Page header */}
      <SplitLayout
        align="center"
        startItem={<Text styleAs="h4" style={{ fontWeight: 700 }}>Executive Dashboard</Text>}
        endItem={
          <FlowLayout gap={1} align="center">
            {lastUpdated && (
              <Text styleAs="label" color="secondary">Updated {lastUpdated}</Text>
            )}
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </FlowLayout>
        }
      />

      {isError && (
        <Banner status="error">
          <BannerContent>
            Failed to load dashboard data. Check your Jira connection in Settings.{' '}
            <Button variant="secondary" onClick={() => void refetch()}>Retry</Button>
          </BannerContent>
        </Banner>
      )}

      {isLoading && (
        <div className="loading-container">
          <Text color="secondary">Loading executive summary…</Text>
        </div>
      )}

      {summary && (
        <>
          {/* Row 1 — KPI Cards (6-column) */}
          <GridLayout columns={6} gap={1}>
            <KpiCard title="Total Epics" value={is?.total ?? 0} color="neutral" onClick={() => navigate('/roadmap')} />
            <KpiCard title="On Track" value={is?.onTrack ?? 0} color="positive" onClick={() => navigate('/roadmap')} />
            <KpiCard title="At Risk" value={is?.atRisk ?? 0} color="warning" onClick={() => navigate('/slippage')} />
            <KpiCard title="Slipped" value={is?.slipped ?? 0} color="negative" onClick={() => navigate('/slippage')} />
            <KpiCard title="Active Teams" value={summary.teamSummaries.length} color="neutral" onClick={() => navigate('/sprints')} />
            <KpiCard
              title="Team Health"
              value={summary.overallHealthScore}
              unit="/100"
              color={summary.overallHealthScore >= 80 ? 'positive' : summary.overallHealthScore >= 60 ? 'warning' : 'negative'}
              onClick={() => navigate('/sprints')}
            />
          </GridLayout>

          {/* Row 2 — Status ring + Team health */}
          <GridLayout columns={3} gap={2}>
            <GridItem colSpan={1}>
              <Card variant="primary" style={{ padding: 0 }}>
                <SectionHeader title="Program Status" />
                <div style={{ padding: 'var(--salt-spacing-150)', display: 'flex', justifyContent: 'center' }}>
                  <StatusRing
                    total={is?.total ?? 0}
                    onTrack={is?.onTrack ?? 0}
                    atRisk={is?.atRisk ?? 0}
                    slipped={is?.slipped ?? 0}
                    done={is?.done ?? 0}
                  />
                </div>
              </Card>
            </GridItem>

            <GridItem colSpan={2}>
              <Card variant="primary" style={{ padding: 0 }}>
                <SectionHeader title="Team Health" badge={`${summary.teamSummaries.length} teams`} />
                {summary.teamSummaries.length === 0 ? (
                  <div style={{ padding: 'var(--salt-spacing-300)', textAlign: 'center' }}>
                    <Text color="secondary">No active sprints found.</Text>
                  </div>
                ) : (
                  <TeamHealthGrid teams={summary.teamSummaries} />
                )}
              </Card>
            </GridItem>
          </GridLayout>

          {/* Row 3 — Top slipped + Upcoming deadlines */}
          <GridLayout columns={2} gap={2}>
            <Card variant="primary" style={{ padding: 0 }}>
              <SectionHeader title="Top Slipped Items" badge={summary.topSlippedItems.length} />
              <TopSlippedList items={summary.topSlippedItems} />
            </Card>

            <Card variant="primary" style={{ padding: 0 }}>
              <SectionHeader title="Upcoming Deadlines — 14 days" badge={summary.upcomingDeadlines.length} />
              <UpcomingDeadlines items={summary.upcomingDeadlines} />
            </Card>
          </GridLayout>

          {/* Key metrics footer */}
          {km && (
            <Card variant="secondary" style={{ padding: 'var(--salt-spacing-75) var(--salt-spacing-100)' }}>
              <FlowLayout gap={4} align="center">
                <StackLayout gap={0} direction="column">
                  <Text styleAs="label" color="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Points Delivered</Text>
                  <Text styleAs="h4" style={{ fontWeight: 700 }}>{km.totalPointsDeliveredThisSprint}</Text>
                </StackLayout>
                <StackLayout gap={0} direction="column">
                  <Text styleAs="label" color="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Slipped</Text>
                  <Text styleAs="h4" style={{ fontWeight: 700 }}>{km.totalSlippedItems}</Text>
                </StackLayout>
                <StackLayout gap={0} direction="column">
                  <Text styleAs="label" color="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Avg Carryover / Team</Text>
                  <Text styleAs="h4" style={{ fontWeight: 700 }}>{km.averageCarryoverRate}</Text>
                </StackLayout>
                <StackLayout gap={0} direction="column">
                  <Text styleAs="label" color="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>On-Track Rate</Text>
                  <Text styleAs="h4" style={{ fontWeight: 700 }}>{km.percentInitiativesOnTrack}%</Text>
                </StackLayout>
              </FlowLayout>
            </Card>
          )}
        </>
      )}
    </StackLayout>
  );
};
