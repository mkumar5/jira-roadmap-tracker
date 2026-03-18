# Task 09 — Sprint Report Generator

**Agent:** reporter
**Status:** PENDING
**Depends on:** Tasks 03, 04, 07 complete

## Context
End-of-sprint report generation — the most management-visible feature.
Per team: what was delivered, what slipped, what's next.
Supports manual generation + automatic (via `/sprint-report` command).
Output: interactive UI + downloadable Markdown report.

## Steps

### 1. Create sprint report service (`src/services/sprint.service.ts`)
```typescript
export class SprintReportService {
  async generateReport(sprintId: number, teamName: string): Promise<SprintReport> {
    const [sprint, allIssues, previousSprint] = await Promise.all([
      jiraService.fetchSprint(sprintId),
      jiraService.fetchSprintIssues(sprintId),
      jiraService.fetchPreviousSprint(sprintId),
    ]);

    const delivered = allIssues.filter(s => s.status === 'DONE');
    const incomplete = allIssues.filter(s => s.status !== 'DONE');

    // Carried over = incomplete AND was in previous sprint
    const previousIssueKeys = new Set(previousSprint?.issues.map(i => i.key) ?? []);
    const carriedOver = incomplete
      .filter(s => previousIssueKeys.has(s.key))
      .map(s => ({ ...s, timesCarried: (s.timesCarried ?? 0) + 1 }));

    // Next sprint committed
    const nextSprint = await jiraService.fetchNextSprint(sprintId);
    const nextSprintIssues = nextSprint ? await jiraService.fetchSprintIssues(nextSprint.id) : [];

    // Slipped epics: epics with stories in this sprint that are past due
    const epicKeys = [...new Set(allIssues.map(s => s.epicKey).filter(Boolean))] as string[];
    const epics = await Promise.all(epicKeys.map(k => jiraService.fetchEpic(k)));
    const slippedEpics = epics
      .filter(e => e.dueDate && differenceInDays(new Date(), parseISO(e.dueDate)) > 0)
      .map(e => ({ ...e, daysPastDue: differenceInDays(new Date(), parseISO(e.dueDate!)) }));

    const velocityTrend = await this.computeVelocityTrend(sprintId, delivered);
    const healthScore = this.computeHealthScore(slippedEpics, carriedOver, velocityTrend);

    return {
      sprint,
      teamName,
      generatedAt: new Date().toISOString(),
      delivered: { count: delivered.length, storyPoints: sumPoints(delivered), items: delivered },
      carriedOver: { count: carriedOver.length, storyPoints: sumPoints(carriedOver), items: carriedOver },
      nextSprintCommitted: { count: nextSprintIssues.length, storyPoints: sumPoints(nextSprintIssues), items: nextSprintIssues },
      slippedEpics,
      atRisk: { count: 0, items: [] }, // populated separately
      velocityTrend,
      healthScore,
    };
  }

  async generateAllTeamReports(boardIds: number[]): Promise<SprintReport[]> {
    const activeSprints = await jiraService.fetchActiveSprints(boardIds);
    return Promise.all(
      activeSprints.map(s => this.generateReport(s.id, s.teamName))
    );
  }

  exportToMarkdown(report: SprintReport): string {
    // See reporter agent spec for markdown template
  }

  private computeHealthScore(
    slippedEpics: Epic[],
    carriedOver: Story[],
    velocity: SprintReport['velocityTrend']
  ): number {
    let score = 100;
    score -= slippedEpics.length * 10;
    score -= carriedOver.length * 3;
    score += velocity.trend === 'UP' ? 5 : 0;
    return Math.max(0, Math.min(100, score));
  }
}

export const sprintReportService = new SprintReportService();
```

### 2. Create Sprint Report Page (`src/pages/SprintReportPage.tsx`)
Layout:
```
[Header: "Sprint Reports"]
[Toolbar: Sprint selector | Team filter | Generate button | Export All]

[Report Tabs: one tab per team]
  [Tab: Team Alpha | Sprint 24 | Health: 82]
  [Tab: Team Beta | Sprint 24 | Health: 61 ⚠️]

[Report Body — for selected team:]
  ┌─────────────────────────────────────┐
  │  HEALTH SCORE: 82/100  ████████░░   │
  │  Sprint 24 | Mar 4 – Mar 18, 2026  │
  └─────────────────────────────────────┘

  [Section: ✅ Delivered — 18 stories, 42 pts]
    [AG Grid: simple table of completed stories]

  [Section: ⏩ Carried Over — 3 stories]
    [AG Grid: stories with "Carried Nx" badge]

  [Section: 📋 Next Sprint — 22 committed, 54 pts]
    [AG Grid: upcoming sprint stories]

  [Section: 🔴 Slipped Epics — 2 epics]
    [List: Epic key + summary + N days overdue]

  [Section: ⚠️ At Risk — 4 items]
    [List: items due in next 14 days]

  [Footer: Export Markdown | Copy to Clipboard]
```

### 3. Create report components

`src/components/sprint/ReportSection.tsx` — collapsible section with count badge
`src/components/sprint/HealthScoreGauge.tsx` — circular gauge (0-100) using Salt DS colors
`src/components/sprint/VelocityTrendBadge.tsx` — UP/DOWN/STABLE with arrow icon

### 4. Create export utilities (`src/utils/report.utils.ts`)
```typescript
export function exportReportToMarkdown(report: SprintReport): string {
  return `# Sprint ${report.sprint.name} Report — ${report.teamName}
**Period:** ${formatSprintPeriod(report.sprint.startDate, report.sprint.endDate)}
**Generated:** ${format(parseISO(report.generatedAt), 'PPP')}
**Health Score:** ${report.healthScore}/100

## ✅ Delivered (${report.delivered.count} items, ${report.delivered.storyPoints} pts)
${report.delivered.items.map(s => `- [${s.key}](${s.jiraUrl}) ${s.summary}`).join('\n')}

## ⏩ Carried Over (${report.carriedOver.count} items)
${report.carriedOver.items.map(s => `- [${s.key}](${s.jiraUrl}) ${s.summary} *(carried ${s.timesCarried}x)*`).join('\n')}

## 📋 Next Sprint Committed (${report.nextSprintCommitted.count} items)
${report.nextSprintCommitted.items.map(s => `- [${s.key}](${s.jiraUrl}) ${s.summary}`).join('\n')}

## 🔴 Slipped Epics
${report.slippedEpics.map(e => `- [${e.key}](${e.jiraUrl}) ${e.summary} — **${e.daysPastDue} days overdue**`).join('\n')}
`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
```

### 5. Save reports to file system (via MCP/command)
When `/sprint-report` command runs:
```
mkdir -p sprint-reports/
Save: sprint-reports/YYYY-MM-DD-{team-name}-sprint-{N}.md
```

## Acceptance Criteria
- [ ] Report generates for all active sprints with one click
- [ ] Delivered / Carried Over / Next Sprint sections populated correctly
- [ ] Health score shows colored gauge
- [ ] Export to Markdown downloads a properly formatted .md file
- [ ] Copy to Clipboard works
- [ ] Reports persist (saved to `sprint-reports/` directory)
- [ ] Velocity trend shows UP/DOWN/STABLE with historical comparison
- [ ] Handles teams with no active sprint (graceful skip)

## Output
Update TASK_REGISTRY.md:
- Mark 09 `DONE`: "Sprint report generator with health score, velocity trend, markdown export"
