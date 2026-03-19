import { useState, useMemo } from 'react';
import { Text, Spinner, Dropdown, Option, Button, FlowLayout, Banner, BannerContent, Tag } from '@salt-ds/core';
import { SprintStoriesGrid } from '@/components/sprint/SprintStoriesGrid';
import { useAllBoards, useActiveSprints, useSprintIssues } from '@/hooks/useSprint';
import { useConfigStore } from '@/store/configStore';
import { sprintDaysRemaining, sprintProgress, formatSprintPeriod } from '@/utils/date.utils';
import { LinearProgress } from '@salt-ds/core';
import type { Sprint, Story } from '@/types';

function HealthTag({ score }: { score: number }) {
  if (score >= 80)
    return <Tag variant="secondary" style={{ background: 'var(--salt-status-success-background)', color: 'var(--salt-status-success-foreground)', fontSize: 11 }}>Healthy</Tag>;
  if (score >= 60)
    return <Tag variant="secondary" style={{ background: 'var(--salt-status-warning-background)', color: 'var(--salt-status-warning-foreground)', fontSize: 11 }}>At Risk</Tag>;
  return <Tag variant="secondary" style={{ background: 'var(--salt-status-error-background)', color: 'var(--salt-status-error-foreground)', fontSize: 11 }}>Slipping</Tag>;
}

function computeStats(stories: Story[]) {
  const committed = stories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);
  const delivered = stories.filter((st) => st.status === 'DONE').reduce((s, st) => s + (st.storyPoints ?? 0), 0);
  const carriedHeavy = stories.filter((st) => st.timesCarried >= 2).length;
  const deliveryRatio = committed > 0 ? (delivered / committed) * 100 : 0;
  const healthScore = Math.round(Math.max(0, Math.min(100, deliveryRatio - carriedHeavy * 10)));
  return { committed, delivered, healthScore, pointsProgress: committed > 0 ? Math.round((delivered / committed) * 100) : 0 };
}

function SprintListItem({
  sprint,
  stories,
  isSelected,
  onSelect,
}: {
  sprint: Sprint & { teamName: string };
  stories: Story[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { committed, delivered, healthScore, pointsProgress } = computeStats(stories);
  const timeProgress = sprint.startDate && sprint.endDate ? sprintProgress(sprint.startDate, sprint.endDate) : 0;
  const daysRemaining = sprint.endDate ? sprintDaysRemaining(sprint.endDate) : 0;
  const period = sprint.startDate && sprint.endDate ? formatSprintPeriod(sprint.startDate, sprint.endDate) : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      style={{
        padding: 'var(--salt-spacing-150)',
        borderBottom: '1px solid var(--salt-separable-primary-borderColor)',
        cursor: 'pointer',
        background: isSelected
          ? 'var(--salt-color-blue-30)'
          : 'var(--salt-color-background)',
        borderLeft: isSelected ? '3px solid var(--salt-color-blue-600)' : '3px solid transparent',
        transition: 'background 0.1s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Text style={{ fontWeight: 700, fontSize: 14, display: 'block', lineHeight: 1.3, color: isSelected ? 'var(--salt-color-blue-700)' : 'var(--salt-color-foreground)' }}>
            {sprint.teamName || sprint.name}
          </Text>
          <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', display: 'block', marginTop: 1 }}>
            {sprint.name}
          </Text>
        </div>
        <HealthTag score={healthScore} />
      </div>

      {period && (
        <Text style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)', display: 'block', marginBottom: 8 }}>
          {period} · {daysRemaining > 0 ? `${daysRemaining}d left` : 'Ended'}
        </Text>
      )}

      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>Time</Text>
          <Text style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>{timeProgress}%</Text>
        </div>
        <LinearProgress value={timeProgress} hideLabel aria-label="Sprint time" />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>Points</Text>
          <Text style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>{delivered}/{committed}</Text>
        </div>
        <LinearProgress value={pointsProgress} hideLabel aria-label="Points delivered" />
      </div>
    </div>
  );
}

export const SprintTrackingPage = () => {
  const { projectKeys } = useConfigStore();
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const { data: boards = [], isLoading: boardsLoading, isError: boardsError, error: boardsErrorObj } = useAllBoards();
  const boardIds = useMemo(() => boards.map((b) => b.id), [boards]);
  const { data: activeSprints = [], isLoading: sprintsLoading } = useActiveSprints(boardIds);
  const sprintIds = useMemo(() => activeSprints.map((s) => s.id), [activeSprints]);
  const issueResults = useSprintIssues(sprintIds);
  const sprintStories = useMemo<Story[][]>(() => issueResults.map((r) => r.data ?? []), [issueResults]);

  const enrichedSprints = useMemo(
    () => activeSprints.map((sprint) => {
      const board = boards.find((b) => b.id === sprint.boardId);
      return { ...sprint, teamName: board?.teamName ?? sprint.teamName ?? sprint.name };
    }),
    [activeSprints, boards]
  );

  const teamNames = useMemo(
    () => [...new Set(enrichedSprints.map((s) => s.teamName).filter(Boolean))].sort(),
    [enrichedSprints]
  );

  const filteredSprints = useMemo(
    () => teamFilter.length > 0
      ? enrichedSprints.filter((s) => teamFilter.includes(s.teamName))
      : enrichedSprints,
    [enrichedSprints, teamFilter]
  );

  // Auto-select first sprint when data loads
  const selectedSprint = filteredSprints.find((s) => s.id === selectedSprintId) ?? filteredSprints[0] ?? null;
  const selectedIndex = selectedSprint ? activeSprints.findIndex((s) => s.id === selectedSprint.id) : -1;
  const selectedStories = selectedIndex >= 0 ? (sprintStories[selectedIndex] ?? []) : [];
  const selectedStoriesLoading = selectedIndex >= 0 ? (issueResults[selectedIndex]?.isLoading ?? false) : false;

  const summaryStats = useMemo(() => {
    let onTrack = 0, atRisk = 0, slipping = 0;
    sprintStories.forEach((stories) => {
      const committed = stories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);
      const delivered = stories.filter((st) => st.status === 'DONE').reduce((s, st) => s + (st.storyPoints ?? 0), 0);
      const ratio = committed > 0 ? delivered / committed : 0;
      if (ratio >= 0.8) onTrack++;
      else if (ratio >= 0.6) atRisk++;
      else slipping++;
    });
    return { total: enrichedSprints.length, onTrack, atRisk, slipping };
  }, [enrichedSprints, sprintStories]);

  const isLoading = boardsLoading || sprintsLoading;

  if (projectKeys.length === 0) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 120px)' }}>
        <Text styleAs="h3" color="secondary">No project keys configured</Text>
        <Text color="secondary">Go to Settings to add your Jira project keys.</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container" style={{ height: 'calc(100vh - 120px)' }}>
        <Spinner size="large" aria-label="Loading sprint data" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Sprint Tracking</div>
          <div className="page-subtitle">Active sprints across all teams</div>
        </div>
        <FlowLayout gap={1.5} align="center">
          {enrichedSprints.length > 0 && (
            <>
              <Text styleAs="label" color="secondary">{summaryStats.total} sprint{summaryStats.total !== 1 ? 's' : ''}</Text>
              {summaryStats.onTrack > 0 && <Tag variant="secondary" style={{ background: 'var(--salt-status-success-background)', color: 'var(--salt-status-success-foreground)', fontSize: 11 }}>{summaryStats.onTrack} healthy</Tag>}
              {summaryStats.atRisk > 0 && <Tag variant="secondary" style={{ background: 'var(--salt-status-warning-background)', color: 'var(--salt-status-warning-foreground)', fontSize: 11 }}>{summaryStats.atRisk} at risk</Tag>}
              {summaryStats.slipping > 0 && <Tag variant="secondary" style={{ background: 'var(--salt-status-error-background)', color: 'var(--salt-status-error-foreground)', fontSize: 11 }}>{summaryStats.slipping} slipping</Tag>}
            </>
          )}
          <Text styleAs="label" color="secondary" style={{ marginLeft: 8 }}>Auto-refreshes every 5 min</Text>
        </FlowLayout>
      </div>

      {boardsError && (
        <Banner status="error" style={{ marginBottom: 'var(--salt-spacing-100)' }}>
          <BannerContent>
            Failed to load boards: {boardsErrorObj instanceof Error ? boardsErrorObj.message : 'Unknown error'}
          </BannerContent>
        </Banner>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--salt-spacing-100)', paddingBottom: 'var(--salt-spacing-100)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)', marginBottom: 'var(--salt-spacing-150)' }}>
        <Dropdown
          selected={teamFilter.length > 0 ? teamFilter : ['All Teams']}
          onSelectionChange={(_e, selected) => {
            const filtered = selected.filter((s) => s !== 'All Teams');
            setTeamFilter(filtered);
            setSelectedSprintId(null);
          }}
          multiselect
          style={{ minWidth: 200 }}
          aria-label="Filter by team"
        >
          {teamNames.map((name) => (
            <Option key={name} value={name}>{name}</Option>
          ))}
        </Dropdown>
        {teamFilter.length > 0 && (
          <Button variant="secondary" onClick={() => { setTeamFilter([]); setSelectedSprintId(null); }}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Two-panel layout: sprint list (left) + stories grid (right) */}
      {filteredSprints.length === 0 ? (
        <div className="empty-state" style={{ flex: 1 }}>
          <Text styleAs="h4" color="secondary">
            {enrichedSprints.length === 0 ? 'No active sprints found' : 'No sprints match filter'}
          </Text>
          <Text styleAs="label" color="secondary">
            {enrichedSprints.length === 0
              ? boards.length > 0
                ? `Found ${boards.length} board(s) but none have an active sprint.`
                : 'No boards found for configured project keys.'
              : 'Try clearing the team filter.'}
          </Text>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 0, border: '1px solid var(--salt-separable-primary-borderColor)', borderRadius: 8, overflow: 'hidden', background: 'var(--salt-color-background)' }}>
          {/* Left: sprint list */}
          <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--salt-separable-primary-borderColor)', overflowY: 'auto' }}>
            <div style={{ padding: 'var(--salt-spacing-75) var(--salt-spacing-150)', background: 'var(--salt-color-background-secondary)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)' }}>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--salt-color-foreground-secondary)' }}>
                Teams · {filteredSprints.length}
              </Text>
            </div>
            {filteredSprints.map((sprint) => {
              const idx = activeSprints.findIndex((s) => s.id === sprint.id);
              const stories = idx >= 0 ? (sprintStories[idx] ?? []) : [];
              return (
                <SprintListItem
                  key={sprint.id}
                  sprint={sprint}
                  stories={stories}
                  isSelected={selectedSprint?.id === sprint.id}
                  onSelect={() => setSelectedSprintId(sprint.id)}
                />
              );
            })}
          </div>

          {/* Right: stories grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {selectedSprint ? (
              <>
                <div style={{ padding: 'var(--salt-spacing-100) var(--salt-spacing-200)', background: 'var(--salt-color-background-secondary)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Text style={{ fontWeight: 700, fontSize: 15 }}>{selectedSprint.teamName || selectedSprint.name}</Text>
                    <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', marginLeft: 8 }}>{selectedSprint.name}</Text>
                  </div>
                  <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)' }}>
                    {selectedStories.length} stories
                  </Text>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <SprintStoriesGrid stories={selectedStories} loading={selectedStoriesLoading} fullHeight />
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ flex: 1 }}>
                <Text color="secondary">Select a team to view stories</Text>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
