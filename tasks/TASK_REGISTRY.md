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
| 03 | [Jira MCP + Service Layer](./03-jira-service.md) | IN_PROGRESS | jira-integrator | Jira REST client + MCP validation |
| 04 | [Data Models & Types](./04-data-models.md) | PENDING | architect | All TypeScript interfaces |
| 05 | [App Shell & Navigation](./05-app-shell.md) | PENDING | ui-developer | Layout, sidebar, routing |
| 06 | [Roadmap Hierarchy Grid](./06-roadmap-grid.md) | PENDING | ui-developer | Initiative→Epic→Story tree grid |
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
