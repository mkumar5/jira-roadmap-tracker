import { useState, useMemo } from 'react';
import { Text, Spinner, Dropdown, Option, Button, SplitLayout, FlowLayout, StackLayout, Banner, BannerContent } from '@salt-ds/core';
import { SprintTeamCard } from '@/components/sprint/SprintTeamCard';
import { useAllBoards, useActiveSprints, useSprintIssues } from '@/hooks/useSprint';
import { useConfigStore } from '@/store/configStore';
import type { Story } from '@/types';

export const SprintTrackingPage = () => {
  const { projectKeys } = useConfigStore();
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  const { data: boards = [], isLoading: boardsLoading, isError: boardsError, error: boardsErrorObj } = useAllBoards();
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
    <StackLayout gap={2} direction="column">
      {/* Page header */}
      <SplitLayout
        align="center"
        startItem={<Text styleAs="h4" style={{ fontWeight: 700 }}>Sprint Tracking</Text>}
        endItem={<Text styleAs="label" color="secondary">Auto-refreshes every 5 minutes</Text>}
      />

      {boardsError && (
        <Banner status="error">
          <BannerContent>
            Failed to load boards: {boardsErrorObj instanceof Error ? boardsErrorObj.message : 'Unknown error'}
          </BannerContent>
        </Banner>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--salt-spacing-100)', flexWrap: 'wrap', paddingBottom: 'var(--salt-spacing-75)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)' }}>
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
        <FlowLayout gap={3} style={{ padding: 'var(--salt-spacing-75) var(--salt-spacing-100)', background: 'var(--salt-color-background)', borderRadius: 4, border: '1px solid var(--salt-separable-primary-borderColor)' }}>
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
        </FlowLayout>
      )}

      {/* Cards grid */}
      {filteredSprints.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <Text styleAs="h4" color="secondary">
            {enrichedSprints.length === 0 ? 'No active sprints found' : 'No sprints match filter'}
          </Text>
          {enrichedSprints.length === 0 && (
            <Text styleAs="label" color="secondary">
              {boards.length > 0
                ? `Found ${boards.length} board(s) but none have an active sprint.`
                : 'No boards found for configured project keys.'}
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
    </StackLayout>
  );
};
