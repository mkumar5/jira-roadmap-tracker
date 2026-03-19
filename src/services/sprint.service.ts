/**
 * Sprint Report Service — generates per-team end-of-sprint reports.
 * Orchestrates multiple jiraService calls to build a SprintReport.
 */
import { jiraService } from './jira.service';
import { getDaysPastDue } from '@/utils/slippage.utils';
import type { SprintReport, Sprint, Story, Epic } from '@/types';

function sumPoints(stories: Story[]): number {
  return stories.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
}

function computeHealthScore(
  slippedEpics: Epic[],
  carriedOver: Story[],
  trend: 'UP' | 'DOWN' | 'STABLE'
): number {
  let score = 100;
  score -= slippedEpics.length * 10;
  score -= carriedOver.length * 3;
  if (trend === 'UP') score += 5;
  if (trend === 'DOWN') score -= 5;
  return Math.max(0, Math.min(100, score));
}

class SprintReportService {
  async generateReport(sprint: Sprint, boardId: number): Promise<SprintReport> {
    // Fetch all sprints for the board + current sprint issues in parallel
    const [allSprints, currentIssues] = await Promise.all([
      jiraService.fetchSprints(boardId).catch((): Sprint[] => []),
      jiraService.fetchSprintIssues(sprint.id),
    ]);

    // Find previous (last closed) and next (first future) sprints.
    // Sort by startDate first; fall back to id for sprints without dates (future).
    const STATE_ORDER: Record<string, number> = { closed: 0, active: 1, future: 2 };
    const sorted = [...allSprints].sort((a, b) => {
      if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate);
      return (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9);
    });
    const idx = sorted.findIndex((s) => s.id === sprint.id);
    const prevSprint = idx > 0 ? (sorted[idx - 1] ?? null) : null;
    const nextSprint = sorted.slice(idx + 1).find((s) => s.state === 'future') ?? null;

    const [prevIssues, nextIssues] = await Promise.all([
      prevSprint ? jiraService.fetchSprintIssues(prevSprint.id) : Promise.resolve([]),
      nextSprint ? jiraService.fetchSprintIssues(nextSprint.id) : Promise.resolve([]),
    ]);

    const delivered = currentIssues.filter((s) => s.status === 'DONE');
    const incomplete = currentIssues.filter((s) => s.status !== 'DONE');

    // Carried over = was in previous sprint OR has timesCarried > 0
    const prevKeys = new Set(prevIssues.map((i) => i.key));
    const carriedOver = incomplete
      .filter((s) => prevKeys.has(s.key) || s.timesCarried > 0)
      .map((s) => ({ ...s, timesCarried: Math.max(s.timesCarried, 1) }));

    // Slipped epics: parent epics of current sprint stories that are past due
    const epicKeys = [
      ...new Set(currentIssues.map((s) => s.epicKey).filter((k): k is string => Boolean(k))),
    ];
    const allEpics = epicKeys.length > 0 ? await jiraService.fetchEpicsByKeys(epicKeys) : [];
    const today = new Date();
    const slippedEpics: Array<Epic & { daysPastDue: number }> = allEpics
      .filter((e) => e.dueDate && getDaysPastDue(e.dueDate, today) > 0)
      .map((e) => ({ ...e, daysPastDue: getDaysPastDue(e.dueDate, today) }));

    // Velocity trend
    const thisPoints = sumPoints(delivered);
    const lastPoints = sumPoints(prevIssues.filter((s) => s.status === 'DONE'));
    const trend: 'UP' | 'DOWN' | 'STABLE' =
      lastPoints === 0
        ? 'STABLE'
        : thisPoints > lastPoints * 1.1
        ? 'UP'
        : thisPoints < lastPoints * 0.9
        ? 'DOWN'
        : 'STABLE';

    const healthScore = computeHealthScore(slippedEpics, carriedOver, trend);

    return {
      sprint,
      teamName: sprint.teamName || sprint.name,
      generatedAt: new Date().toISOString(),
      delivered: { count: delivered.length, storyPoints: thisPoints, items: delivered },
      carriedOver: {
        count: carriedOver.length,
        storyPoints: sumPoints(carriedOver),
        items: carriedOver,
      },
      nextSprintCommitted: {
        count: nextIssues.length,
        storyPoints: sumPoints(nextIssues),
        items: nextIssues,
      },
      slippedEpics,
      atRisk: { count: 0, items: [] },
      velocityTrend: {
        thisSprintPoints: thisPoints,
        lastSprintPoints: lastPoints,
        averageLast4Sprints: lastPoints,
        trend,
      },
      healthScore,
    };
  }

  async generateAllTeamReports(projectKeys: string[]): Promise<SprintReport[]> {
    if (projectKeys.length === 0) return [];
    const boardsPerProject = await Promise.allSettled(
      projectKeys.map((k) => jiraService.fetchBoards(k))
    );
    const boards = boardsPerProject.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const boardIds = boards.map((b) => b.id);
    const activeSprints = await jiraService.fetchActiveSprints(boardIds);

    const results = await Promise.allSettled(
      activeSprints.map((sprint) => this.generateReport(sprint, sprint.boardId))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<SprintReport> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  exportToMarkdown(report: SprintReport): string {
    const period = `${report.sprint.startDate ?? '?'} – ${report.sprint.endDate ?? '?'}`;
    const d = report.delivered;
    const c = report.carriedOver;
    const n = report.nextSprintCommitted;

    const section = (title: string, items: Array<{ key: string; jiraUrl: string; summary: string }>, extra?: (i: (typeof items)[0]) => string) =>
      items.length === 0
        ? `${title}\n_None_\n`
        : `${title}\n${items.map((i) => `- [${i.key}](${i.jiraUrl}) ${i.summary}${extra ? extra(i) : ''}`).join('\n')}\n`;

    return [
      `# Sprint Report — ${report.teamName}`,
      `**Sprint:** ${report.sprint.name}`,
      `**Period:** ${period}`,
      `**Generated:** ${new Date(report.generatedAt).toLocaleDateString()}`,
      `**Health Score:** ${report.healthScore}/100`,
      '',
      `## ✅ Delivered (${d.count} items, ${d.storyPoints} pts)`,
      section('', d.items),
      `## ⏩ Carried Over (${c.count} items, ${c.storyPoints} pts)`,
      section('', c.items, (i) => ` *(carried ${'timesCarried' in i ? (i as Story & { timesCarried: number }).timesCarried : 1}×)*`),
      `## 📋 Next Sprint Committed (${n.count} items, ${n.storyPoints} pts)`,
      section('', n.items),
      `## 🔴 Slipped Epics (${report.slippedEpics.length})`,
      report.slippedEpics.length === 0
        ? '_None_\n'
        : report.slippedEpics
            .map((e) => `- [${e.key}](${e.jiraUrl}) ${e.summary} — **${e.daysPastDue}d overdue**`)
            .join('\n') + '\n',
      `---`,
      `_Generated by Jira Roadmap Manager_`,
    ].join('\n');
  }
}

export const sprintReportService = new SprintReportService();
