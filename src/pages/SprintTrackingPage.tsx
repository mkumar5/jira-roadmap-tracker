import { useState, useMemo } from 'react';
import { Text, Spinner, Dropdown, Option, Button } from '@salt-ds/core';
import { SprintTeamCard } from '@/components/sprint/SprintTeamCard';
import { useAllBoards, useActiveSprints, useSprintIssues } from '@/hooks/useSprint';
import { useConfigStore } from '@/store/configStore';
import type { Story } from '@/types';

export const SprintTrackingPage = () => {
  const { projectKeys } = useConfigStore();
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  const { data: boards = [], isLoading: boardsLoading } = useAllBoards();
  const boardIds = useMemo(() => boards.map((b) => b.id), [boards]);

  const { data: activeSprints = [], isLoading: sprintsLoading } = useActiveSprints(boardIds);

  const sprintIds = useMemo(() => activeSprints.map((s) => s.id), [activeSprints]);
  const issueResults = useSprintIssues(sprintIds);

  // Build team name → stories map
  const sprintStories = useMemo<Story[][]>(
    () => issueResults.map((r) => r.data ?? []),
    [issueResults]
  );

  // Enrich sprints with team names from boards
  const enrichedSprints = useMemo(
    () =>
      activeSprints.map((sprint) => {
        const board = boards.find((b) => b.id === sprint.boardId);
        return { ...sprint, teamName: board?.teamName ?? sprint.teamName ?? sprint.name };
      }),
    [activeSprints, boards]
  );

  // All team names for the filter dropdown
  const teamNames = useMemo(
    () => [...new Set(enrichedSprints.map((s) => s.teamName).filter(Boolean))].sort(),
    [enrichedSprints]
  );

  // Apply team filter
  const filteredSprints = useMemo(
    () =>
      teamFilter.length > 0
        ? enrichedSprints.filter((s) => teamFilter.includes(s.teamName))
        : enrichedSprints,
    [enrichedSprints, teamFilter]
  );

  // Summary stats
  const summaryStats = useMemo(() => {
    let onTrack = 0;
    let atRisk = 0;
    let slipping = 0;
    sprintStories.forEach((stories) => {
      const committed = stories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);
      const delivered = stories
        .filter((st) => st.status === 'DONE')
        .reduce((s, st) => s + (st.storyPoints ?? 0), 0);
      const ratio = committed > 0 ? delivered / committed : 0;
      if (ratio >= 0.8) onTrack++;
      else if (ratio >= 0.6) atRisk++;
      else slipping++;
    });
    return { total: enrichedSprints.length, onTrack, atRisk, slipping };
  }, [enrichedSprints, sprintStories]);

  const isLoading = boardsLoading || sprintsLoading;
  const anyIssuesLoading = issueResults.some((r) => r.isLoading);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--salt-spacing-200)' }}>
      {/* Page header */}
      <div className="page-header">
        <Text styleAs="h1">Sprint Tracking</Text>
        <Text styleAs="label" color="secondary">
          Auto-refreshes every 5 minutes
        </Text>
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <Dropdown
          selected={teamFilter.length > 0 ? teamFilter : ['All Teams']}
          onSelectionChange={(_e, selected) => {
            const filtered = selected.filter((s) => s !== 'All Teams');
            setTeamFilter(filtered);
          }}
          multiselect
          style={{ minWidth: 200 }}
          aria-label="Filter by team"
        >
          {teamNames.map((name) => (
            <Option key={name} value={name}>
              {name}
            </Option>
          ))}
        </Dropdown>

        {teamFilter.length > 0 && (
          <Button variant="secondary" onClick={() => setTeamFilter([])}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Summary row */}
      {enrichedSprints.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--salt-spacing-300)',
            padding: 'var(--salt-spacing-150) var(--salt-spacing-200)',
            background: 'var(--salt-color-background)',
            borderRadius: 4,
            border: '1px solid var(--salt-separable-primary-borderColor)',
            flexWrap: 'wrap',
          }}
        >
          <Text styleAs="label">
            <strong>{summaryStats.total}</strong> active sprint{summaryStats.total !== 1 ? 's' : ''}
          </Text>
          <Text styleAs="label" style={{ color: 'var(--salt-status-success-foreground)' }}>
            <strong>{summaryStats.onTrack}</strong> on track
          </Text>
          {summaryStats.atRisk > 0 && (
            <Text styleAs="label" style={{ color: 'var(--salt-status-warning-foreground)' }}>
              <strong>{summaryStats.atRisk}</strong> at risk
            </Text>
          )}
          {summaryStats.slipping > 0 && (
            <Text styleAs="label" style={{ color: 'var(--salt-status-error-foreground)' }}>
              <strong>{summaryStats.slipping}</strong> slipping
            </Text>
          )}
        </div>
      )}

      {/* Cards grid */}
      {filteredSprints.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <Text styleAs="h3" color="secondary">
            {enrichedSprints.length === 0 ? 'No active sprints found' : 'No sprints match filter'}
          </Text>
          {enrichedSprints.length === 0 && (
            <Text color="secondary">
              Boards were found but have no active sprints. Check Jira project configuration.
            </Text>
          )}
        </div>
      ) : (
        <div className="sprint-cards-grid">
          {filteredSprints.map((sprint) => {
            const sprintIndex = activeSprints.findIndex((s) => s.id === sprint.id);
            const stories = sprintIndex >= 0 ? (sprintStories[sprintIndex] ?? []) : [];
            const isStoriesLoading =
              sprintIndex >= 0 ? (issueResults[sprintIndex]?.isLoading ?? false) : false;

            return (
              <SprintTeamCard
                key={sprint.id}
                sprint={sprint}
                stories={stories}
                loading={anyIssuesLoading && isStoriesLoading}
              />
            );
          })}
        </div>
      )}

      {/* Boards with no active sprint */}
      {boards.length > activeSprints.length && !isLoading && (
        <Text styleAs="label" color="secondary" style={{ textAlign: 'center' }}>
          {boards.length - activeSprints.length} board(s) have no active sprint
        </Text>
      )}
    </div>
  );
};
