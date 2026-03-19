import { useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { useConfigStore } from '@/store/configStore';
import { getDaysPastDue } from '@/utils/slippage.utils';
import type { ExecutiveSummary, TeamSummary, SlippedItem, AtRiskItem } from '@/types';

function buildExecutiveSummary(
  epicCount: number,
  slipped: SlippedItem[],
  atRisk: AtRiskItem[],
  teamSummaries: TeamSummary[]
): ExecutiveSummary {
  const today = new Date();

  // Derive initiative counts from slippage info
  // Epics with CRITICAL/HIGH severity are slipped, LOW is at-risk, OK is on-track
  const slippedEpics = slipped.filter((i) => i.issueType === 'epic');
  const atRiskEpics = atRisk.filter((i) => i.issueType === 'epic');
  const doneCount = 0; // not tracked without full epic fetch

  const slippedCount = slippedEpics.length;
  const atRiskCount = atRiskEpics.length;
  const onTrackCount = Math.max(0, epicCount - slippedCount - atRiskCount - doneCount);

  const avgHealth =
    teamSummaries.length > 0
      ? Math.round(teamSummaries.reduce((s, t) => s + t.healthScore, 0) / teamSummaries.length)
      : 100;

  const totalDeliveredPts = teamSummaries.reduce((s, t) => s + t.deliveredPoints, 0);
  const totalCarried = teamSummaries.reduce((s, t) => s + t.carriedCount, 0);
  const avgCarryRate =
    teamSummaries.length > 0 ? Math.round((totalCarried / teamSummaries.length) * 10) / 10 : 0;

  const topSlipped = slipped
    .filter(
      (i) =>
        i.slippageSeverity === 'CRITICAL' || i.slippageSeverity === 'HIGH'
    )
    .slice(0, 10);

  const upcomingDeadlines = atRisk
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 10);

  return {
    asOf: today.toISOString(),
    overallHealthScore: avgHealth,
    initiativeSummary: {
      total: epicCount,
      onTrack: onTrackCount,
      atRisk: atRiskCount,
      slipped: slippedCount,
      done: doneCount,
    },
    teamSummaries,
    topSlippedItems: topSlipped,
    upcomingDeadlines,
    keyMetrics: {
      totalPointsDeliveredThisSprint: totalDeliveredPts,
      totalSlippedItems: slipped.length,
      averageCarryoverRate: avgCarryRate,
      percentInitiativesOnTrack:
        epicCount > 0 ? Math.round((onTrackCount / epicCount) * 100) : 100,
    },
  };
}

export function useExecutiveSummary() {
  const { projectKeys, hierarchyStrategy } = useConfigStore();

  return useQuery({
    queryKey: ['executive-summary', projectKeys, hierarchyStrategy],
    queryFn: async (): Promise<ExecutiveSummary> => {
      // Fetch top-level items, slipped items, and at-risk items in parallel
      const [topItemsResult, slippedResult, atRiskResult, boardsResult] = await Promise.allSettled([
        hierarchyStrategy === 'LABEL_BASED' || hierarchyStrategy === 'COMPONENT_BASED'
          ? jiraService.fetchEpics(undefined, projectKeys)
          : jiraService.fetchInitiatives(projectKeys),
        jiraService.fetchSlippedItems(projectKeys),
        jiraService.fetchAtRiskItems(projectKeys, 14),
        Promise.allSettled(projectKeys.map((k) => jiraService.fetchBoards(k))).then(
          (r) => r.flatMap((x) => (x.status === 'fulfilled' ? x.value : []))
        ),
      ]);

      const topItems = topItemsResult.status === 'fulfilled' ? topItemsResult.value : [];
      const slipped = slippedResult.status === 'fulfilled' ? slippedResult.value : [];
      const atRisk = atRiskResult.status === 'fulfilled' ? atRiskResult.value : [];
      const boards = boardsResult.status === 'fulfilled' ? boardsResult.value : [];

      const boardIds = boards.map((b) => b.id);
      const activeSprints = boardIds.length > 0
        ? await jiraService.fetchActiveSprints(boardIds)
        : [];

      // Build team summaries from active sprints
      // For each active sprint, compute health from its issues
      const today = new Date();
      const teamSummaryResults = await Promise.allSettled(
        activeSprints.map(async (sprint): Promise<TeamSummary> => {
          const issues = await jiraService.fetchSprintIssues(sprint.id);
          const delivered = issues.filter((s) => s.status === 'DONE');
          const carried = issues.filter((s) => s.status !== 'DONE' && s.timesCarried > 0);
          const deliveredPts = delivered.reduce((s, i) => s + (i.storyPoints ?? 0), 0);

          // Slipped epics in this sprint
          const epicKeys = [
            ...new Set(issues.map((s) => s.epicKey).filter((k): k is string => Boolean(k))),
          ];
          const epics = epicKeys.length > 0 ? await jiraService.fetchEpicsByKeys(epicKeys) : [];
          const slippedEpicsCount = epics.filter(
            (e) => e.dueDate && getDaysPastDue(e.dueDate, today) > 0
          ).length;

          let healthScore = 100;
          healthScore -= slippedEpicsCount * 10;
          healthScore -= carried.length * 3;
          healthScore = Math.max(0, Math.min(100, healthScore));

          return {
            teamName: sprint.teamName || sprint.name,
            healthScore,
            activeSprintName: sprint.name,
            deliveredPoints: deliveredPts,
            carriedCount: carried.length,
            boardId: sprint.boardId,
          };
        })
      );
      const teamSummaries: TeamSummary[] = teamSummaryResults.flatMap((r) =>
        r.status === 'fulfilled' ? [r.value] : []
      );

      return buildExecutiveSummary(topItems.length, slipped, atRisk, teamSummaries);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}
