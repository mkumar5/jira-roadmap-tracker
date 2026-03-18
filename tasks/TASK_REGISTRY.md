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
| 01 | [Foundation Setup](./01-foundation-setup.md) | DONE | architect | Vite + React + TS strict, all tooling, ESLint 9 flat config, 15/15 tests pass, build produces dist/ |
| 02 | [Salt DS + AG Grid Setup](./02-saltds-agrid-setup.md) | DONE | ui-developer | ThemeProvider + context, CSS imports ordered in main.tsx, AG Grid quartz + Salt tokens, lint/type/test/build ✅ |
| 03 | [Jira MCP + Service Layer](./03-jira-service.md) | DONE | jira-integrator | All 10 methods implemented. POST /search/jql (GET deprecated). See notes below. |
| 04 | [Data Models & Types](./04-data-models.md) | DONE | architect | Domain model types defined: Initiative→Story hierarchy, sprint reports, slippage severity, HierarchyNode for AG Grid tree data |
| 05 | [App Shell & Navigation](./05-app-shell.md) | DONE | ui-developer | App shell, routing, sidebar navigation, settings page with Jira config + Test Connection |
| 06 | [Roadmap Hierarchy Grid](./06-roadmap-grid.md) | DONE | ui-developer | Roadmap hierarchy tree grid with slippage colors, filters, CSV export |
| 07 | [Sprint Tracking View](./07-sprint-tracking.md) | PENDING | ui-developer | Per-team sprint board + grid |
| 08 | [Slippage Detection Engine](./08-slippage-engine.md) | PENDING | jira-integrator | Algorithm + slippage dashboard |
| 09 | [Sprint Report Generator](./09-sprint-reports.md) | PENDING | reporter | End-of-sprint report UI + export |
| 10 | [Executive Dashboard](./10-executive-dashboard.md) | PENDING | ui-developer | KPI cards + charts + summary |
| 11 | [Tests & Coverage](./11-tests.md) | PENDING | tester | Vitest + RTL + MSW setup |
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
