# Task Registry — Jira Roadmap Manager

## How to use this file
- Each task is in its own file: `tasks/NN-name.md`
- Status: `PENDING` | `IN_PROGRESS` | `DONE` | `BLOCKED`
- When running in loop mode, Claude checks this file first, picks next `PENDING` task
- Update status here when starting/finishing each task
- `BLOCKED` tasks require human input — loop stops automatically

## Execution instructions for Claude (any mode)
1. **Switch to Opus 4.6** → read this file → read the full task file
2. **Plan** the approach (still Opus) — understand AC, identify files to touch
3. **Switch to Sonnet 4.6** → write code, run commands, edit files
4. Use the designated `Agent:` for that task type
5. Complete ALL acceptance criteria before marking `DONE`
6. Write a 2-3 line completion summary in the `Notes` column
7. Move to next task

**Model rule:** Opus = read/plan/design. Sonnet = write/run/test. Never flip this.
**Library rule:** AG Grid Community (MIT) only — no Enterprise features.

---

## Task List

| # | Task | Status | Agent | Notes |
|---|------|--------|-------|-------|
| 00 | [Jira Test Data Seeding](./00-jira-test-data.md) | DONE | jira-integrator | 5 epics (SCRUM-5–9) + 18 stories (SCRUM-10–27) seeded. Active sprint: 9 stories. Future sprint: 5 stories. Overdue epics for slippage. LABEL_BASED strategy wired. |
| 01 | [Foundation Setup](./01-foundation-setup.md) | DONE | architect | Vite + React + TS strict, all tooling, ESLint 9 flat config, 15/15 tests pass, build produces dist/ |
| 02 | [Salt DS + AG Grid Setup](./02-saltds-agrid-setup.md) | DONE | ui-developer | ThemeProvider + context, CSS imports ordered in main.tsx, AG Grid quartz + Salt tokens, lint/type/test/build ✅ |
| 03 | [Jira MCP + Service Layer](./03-jira-service.md) | DONE | jira-integrator | All 10 methods implemented. POST /search/jql (GET deprecated). See notes below. |
| 04 | [Data Models & Types](./04-data-models.md) | DONE | architect | Domain model types defined: Initiative→Story hierarchy, sprint reports, slippage severity, HierarchyNode for AG Grid tree data |
| 05 | [App Shell & Navigation](./05-app-shell.md) | DONE | ui-developer | App shell, routing, sidebar navigation, settings page with Jira config + Test Connection |
| 06 | [Roadmap Hierarchy Grid](./06-roadmap-grid.md) | DONE | ui-developer | Roadmap hierarchy tree grid with slippage colors, filters, CSV export |
| 07 | [Sprint Tracking View](./07-sprint-tracking.md) | DONE | ui-developer | Sprint tracking: team cards, stories grid, carryover detection, auto-refresh |
| 08 | [Slippage Detection Engine](./08-slippage-engine.md) | DONE | jira-integrator | Slippage engine with severity grid, at-risk tab, summary banner |
| 09 | [Sprint Report Generator](./09-sprint-reports.md) | DONE | reporter | Sprint report generator with health score gauge, velocity trend badge, collapsible sections, markdown export + clipboard |
| 10 | [Executive Dashboard](./10-executive-dashboard.md) | DONE | ui-developer | 6 KPI cards, CSS conic-gradient status ring, team health AG Grid, top slipped list, upcoming deadlines, key metrics footer |
| 11 | [Tests & Coverage](./11-tests.md) | DONE | tester | 61 tests passing (7 files). Unit: slippage.utils, date.utils, hierarchy.utils, sprint.service. Integration: SettingsPage, SlippagePage, SprintTrackingPage. Services: 81% coverage (target 75% ✓). ResizeObserver polyfill added. MSW v2 POST handlers. |
| 12 | [CI/CD & Deployment Config](./12-cicd.md) | PENDING | architect | GitHub Actions, env config |

---

## Blocked Items Log
*(Claude writes here when a task is BLOCKED, explaining what human input is needed)*

| Task | Blocked Reason | Needs From Human |
|------|---------------|------------------|
| — | — | — |

---

## Completion Log
*(Claude writes a summary here when each task is marked DONE)*

| # | Task | Completed | Summary |
|---|------|-----------|---------|
| 01 | Foundation Setup | 2026-03-18 | Migrated to ESLint 9 flat config, fixed a11y lint error, all AC green: type-check ✅ lint ✅ 15 tests ✅ build ✅ |
| 02 | Salt DS + AG Grid Setup | 2026-03-18 | AppThemeProvider with context (ThemeContext.ts split for react-refresh), AG Grid quartz wired to Salt tokens, CSS import order fixed in main.tsx |
| 03 | Jira MCP + Service Layer | 2026-03-18 | **MCP validation findings:** Instance mkumar-personal.atlassian.net is standard Jira (not Premium) — only Epic/Story/Task/Subtask present, no Initiative/Feature. GET /search deprecated → switched paginateJiraSearch to POST /search/jql. Sprint field customfield_10020 ✅. Story points customfield_10016 present but null (not in use). VITE_HIERARCHY_STRATEGY should be LABEL_BASED for this instance. |
| 04 | Data Models & Types | 2026-03-18 | jira.types.ts (raw API shapes), roadmap.types.ts (domain model with Initiative→Story, SlippageSeverity, HierarchyNode), sprint.types.ts (SprintReport, ExecutiveSummary, TeamSummary). Type-check passes clean. |
| 05 | App Shell & Navigation | 2026-03-18 | App.tsx lazy-routes, AppShell grid layout, sidebar NavLink with active state, AppHeader with theme toggle + "Last synced: Never", SettingsPage with Salt DS FormField/Input/Dropdown, Test Connection button, Banner success/error. type-check ✅ lint ✅ 15 tests ✅ build ✅ |
| 06 | Roadmap Hierarchy Grid | 2026-03-18 | Custom hierarchy tree via expansion state (AG Grid v33 tree data is Enterprise-only). RoadmapGrid: per-level indent + chevron toggle, severity color badges, JiraLink key column, CSV export, text search, severity filter with ancestor inclusion. RoadmapPage: toolbar with search, severity checkboxes, expand/collapse all. type-check ✅ lint ✅ 15 tests ✅ build ✅ |
| 07 | Sprint Tracking View | 2026-03-18 | SprintTeamCard (Salt DS Card, LinearProgress time/points bars, health badge), SprintStoriesGrid (AG Grid sorted by status, carried-over rows highlighted red), SprintTrackingPage (board→sprint→issues data cascade, team filter dropdown, summary row on/at-risk/slipping, auto-refresh 5min). timesCarried computed from sprint history length. type-check ✅ lint ✅ 15 tests ✅ build ✅ |
| 08 | Slippage Detection Engine | 2026-03-18 | SlippageGrid + AtRiskGrid (AG Grid, pinned key/severity cols, CSV export), SlippageSummaryBanner (clickable severity chips toggle filter), SlippagePage (TabsNext slipped/at-risk, severity+type+text filters, last-checked timestamp, refresh), slippageStore (Zustand, atRiskDays, alertThreshold), SettingsPage alerting section. type-check ✅ lint ✅ 15 tests ✅ build ✅ |
| 10 | Executive Dashboard | 2026-03-18 | useExecutiveSummary hook (epics+slipped+atRisk+teamSummaries in parallel), KpiCard, StatusRing (conic-gradient donut), TeamHealthGrid (AG Grid, health bar cell renderer), TopSlippedList, UpcomingDeadlines. "Not configured" Banner state. type-check ✅ lint ✅ build ✅ |
| 09 | Sprint Report Generator | 2026-03-18 | sprint.service.ts (generateReport/All), ReportSection/HealthScoreGauge/VelocityTrendBadge components, report.utils.ts (md export/download/clipboard), SprintReportPage (tabs per team, health score badge, Generate + Export All). type-check ✅ lint ✅ build ✅ |
| 00 | Jira Test Data Seeding | 2026-03-18 | 5 epics + 18 stories in SCRUM project. LABEL_BASED strategy: buildLabelBasedNodes added to hierarchy.utils.ts, useRoadmapHierarchy updated. STORY_POINTS fixed to customfield_10016. Stories at-risk added to fetchAtRiskItems. .env updated to SCRUM + LABEL_BASED. type-check ✅ build ✅ |
| 11 | Tests & Coverage | 2026-03-19 | 61 tests passing, 0 failures. Fixtures (jira-issues, sprints, initiatives), MSW v2 server (POST /search/jql), renderWithProviders helper. Unit coverage: services 81% ✅. Fixed ResizeObserver polyfill, @testing-library/dom install, date timezone bugs. |
