import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jiraService } from '@/services/jira.service';
import { sprintReportService } from '@/services/sprint.service';
import type { Sprint, Story, Epic } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = new Date();
const pastDate = (d: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0] as string;
};

function makeSprint(id: number, boardId = 1): Sprint {
  return {
    id,
    name: `Sprint ${id}`,
    state: 'active',
    startDate: new Date(today.getTime() - 7 * 86400000).toISOString(),
    endDate: new Date(today.getTime() + 7 * 86400000).toISOString(),
    completedDate: null,
    boardId,
    teamName: 'Test Team',
    goal: null,
  };
}

function makeStory(key: string, status: 'DONE' | 'IN_PROGRESS' | 'TODO', points: number, timesCarried = 0): Story {
  return {
    id: key,
    key,
    summary: `Story ${key}`,
    status: status === 'DONE' ? 'DONE' : 'IN_PROGRESS',
    assignee: null,
    dueDate: null,
    startDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: today.toISOString(),
    labels: [],
    projectKey: 'PROJ',
    jiraUrl: `https://test.atlassian.net/browse/${key}`,
    type: 'story',
    epicKey: 'PROJ-EPIC-1',
    storyPoints: points,
    sprint: null,
    timesCarried,
    priority: 'MEDIUM',
  };
}

function makeEpic(key: string, dueDate: string | null): Epic {
  return {
    id: key,
    key,
    summary: `Epic ${key}`,
    status: 'IN_PROGRESS',
    assignee: null,
    dueDate,
    startDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: today.toISOString(),
    labels: [],
    projectKey: 'PROJ',
    jiraUrl: `https://test.atlassian.net/browse/${key}`,
    type: 'epic',
    deliverableKey: null,
    initiativeKey: null,
    stories: [],
    storyPointsTotal: 0,
    storyPointsDone: 0,
    slippageSeverity: 'OK',
    daysPastDue: 0,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('sprintReportService.generateReport', () => {
  const sprint = makeSprint(101);
  const prevSprint = { ...makeSprint(100), state: 'closed' as const };
  const nextSprint = { ...makeSprint(102), state: 'future' as const };

  beforeEach(() => {
    vi.spyOn(jiraService, 'fetchSprints').mockResolvedValue([prevSprint, sprint, nextSprint]);
    vi.spyOn(jiraService, 'fetchEpicsByKeys').mockResolvedValue([]);
  });

  it('computes health score 100 for perfect sprint (no slippage, no carry-over)', async () => {
    const delivered = [makeStory('S-1', 'DONE', 5), makeStory('S-2', 'DONE', 3)];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === sprint.id) return Promise.resolve(delivered);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.healthScore).toBe(100);
    expect(report.delivered.count).toBe(2);
    expect(report.carriedOver.count).toBe(0);
  });

  it('reduces health score by 10 for each slipped epic', async () => {
    const stories = [makeStory('S-1', 'DONE', 5)];
    const slippedEpics = [
      makeEpic('E-1', pastDate(15)),
      makeEpic('E-2', pastDate(5)),
    ];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockResolvedValue(stories);
    vi.spyOn(jiraService, 'fetchEpicsByKeys').mockResolvedValue(slippedEpics);

    const report = await sprintReportService.generateReport(sprint, 1);
    // base 100 - (2 slipped epics × 10) = 80, velocity STABLE (no prev sprint delivered)
    expect(report.healthScore).toBe(80);
    expect(report.slippedEpics).toHaveLength(2);
  });

  it('reduces health score by 3 for each carried-over story', async () => {
    const currentStories = [
      makeStory('S-1', 'DONE', 5),
      makeStory('S-3', 'IN_PROGRESS', 3, 1), // already marked as carried (timesCarried=1)
      makeStory('S-4', 'IN_PROGRESS', 2, 1),
    ];
    const prevStories = [makeStory('S-3', 'IN_PROGRESS', 3), makeStory('S-4', 'IN_PROGRESS', 2)];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === prevSprint.id) return Promise.resolve(prevStories);
      if (id === sprint.id) return Promise.resolve(currentStories);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    // 2 carried × 3 = 6 reduction → 100 - 6 = 94
    expect(report.carriedOver.count).toBe(2);
    expect(report.healthScore).toBe(94);
  });

  it('detects carried-over stories by presence in previous sprint', async () => {
    const current = [
      makeStory('S-1', 'DONE', 5),
      makeStory('S-2', 'IN_PROGRESS', 8, 0), // in prev sprint → carry-over
    ];
    const prev = [makeStory('S-2', 'IN_PROGRESS', 8)];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === prevSprint.id) return Promise.resolve(prev);
      if (id === sprint.id) return Promise.resolve(current);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.carriedOver.items.map((i) => i.key)).toContain('S-2');
    expect(report.carriedOver.items[0]?.timesCarried).toBeGreaterThanOrEqual(1);
  });

  it('detects carried-over stories by timesCarried > 0 field', async () => {
    const current = [
      makeStory('S-1', 'DONE', 5),
      makeStory('S-5', 'IN_PROGRESS', 3, 2), // timesCarried=2, not in prev sprint
    ];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === sprint.id) return Promise.resolve(current);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.carriedOver.items.map((i) => i.key)).toContain('S-5');
  });

  it('clamps health score to 0 minimum', async () => {
    // 12 slipped epics × 10 = 120 reduction → clamped to 0
    const tenEpics = Array.from({ length: 12 }, (_, i) =>
      makeEpic(`E-${i}`, pastDate(20))
    );
    // Must have stories referencing epic keys so fetchEpicsByKeys is called
    const storiesWithEpics = Array.from({ length: 12 }, (_, i) => ({
      ...makeStory(`S-${i}`, 'IN_PROGRESS', 1, 0),
      epicKey: `E-${i}`,
    }));
    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === sprint.id) return Promise.resolve(storiesWithEpics);
      return Promise.resolve([]);
    });
    vi.spyOn(jiraService, 'fetchEpicsByKeys').mockResolvedValue(tenEpics);

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.healthScore).toBe(0);
  });

  it('velocity trend UP adds 5 points to health score', async () => {
    // prev: delivered 10pts, current: delivered 15pts → UP
    const prevDelivered = [makeStory('S-OLD', 'DONE', 10)];
    const currentDelivered = [makeStory('S-1', 'DONE', 15)];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === prevSprint.id) return Promise.resolve(prevDelivered);
      if (id === sprint.id) return Promise.resolve(currentDelivered);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.velocityTrend.trend).toBe('UP');
    // health = 100 + 5 (UP) = capped at 100
    expect(report.healthScore).toBe(100);
  });

  it('velocity trend DOWN subtracts 5 points from health score', async () => {
    // prev: delivered 20pts, current: delivered 10pts → DOWN (< 90%)
    const prevDelivered = [makeStory('S-OLD', 'DONE', 20)];
    const currentDelivered = [makeStory('S-1', 'DONE', 10)];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === prevSprint.id) return Promise.resolve(prevDelivered);
      if (id === sprint.id) return Promise.resolve(currentDelivered);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.velocityTrend.trend).toBe('DOWN');
    // health = 100 - 5 (DOWN) = 95
    expect(report.healthScore).toBe(95);
  });

  it('populates delivered, nextSprintCommitted sections correctly', async () => {
    const current = [makeStory('S-1', 'DONE', 5), makeStory('S-2', 'IN_PROGRESS', 3)];
    const nextIssues = [makeStory('S-NEXT', 'TODO', 8)];

    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === sprint.id) return Promise.resolve(current);
      if (id === nextSprint.id) return Promise.resolve(nextIssues);
      return Promise.resolve([]);
    });

    const report = await sprintReportService.generateReport(sprint, 1);
    expect(report.delivered.count).toBe(1);
    expect(report.delivered.storyPoints).toBe(5);
    expect(report.nextSprintCommitted.count).toBe(1);
    expect(report.nextSprintCommitted.storyPoints).toBe(8);
  });
});

describe('sprintReportService.exportToMarkdown', () => {
  it('generates markdown with all sections', async () => {
    const sprint = makeSprint(101);
    const prevSprint = { ...makeSprint(100), state: 'closed' as const };
    const nextSprint = { ...makeSprint(102), state: 'future' as const };

    vi.spyOn(jiraService, 'fetchSprints').mockResolvedValue([prevSprint, sprint, nextSprint]);
    vi.spyOn(jiraService, 'fetchSprintIssues').mockImplementation((id) => {
      if (id === sprint.id) return Promise.resolve([makeStory('S-1', 'DONE', 5)]);
      return Promise.resolve([]);
    });
    vi.spyOn(jiraService, 'fetchEpicsByKeys').mockResolvedValue([]);

    const report = await sprintReportService.generateReport(sprint, 1);
    const md = sprintReportService.exportToMarkdown(report);

    expect(md).toContain('# Sprint Report');
    expect(md).toContain('Delivered');
    expect(md).toContain('Carried Over');
    expect(md).toContain('Health Score');
    expect(md).toContain('S-1');
  });
});
