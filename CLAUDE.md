# CLAUDE.md — Jira Roadmap Manager

## Project Overview

A React web application for management-level tracking of Jira project roadmaps.
Tracks 100s of Initiatives, Deliverables, Epics, and Stories across 5-20 sprint teams.
Identifies slipped items, delayed deliverables, and generates end-of-sprint status reports.

**Hierarchy:** Initiative → Deliverable → Epic → Story
**Sprint cadence:** 2-week sprints per team (5-20 teams, Jira Cloud)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| UI System | Salt DS (J.P. Morgan design system) |
| Data Grid | AG Grid Community (ag-grid-react) |
| State | TanStack Query v5 (server state) + Zustand (UI state) |
| Routing | React Router v6 |
| HTTP | Axios with interceptors |
| Testing | Vitest + React Testing Library |
| Linting | ESLint + Prettier |

## Model Assignment Policy

| Role | Model | When |
|---|---|---|
| **Planning / Architecture** | `claude-opus-4-6` | Design decisions, task files, agent definitions, system design |
| **Execution / Coding** | `claude-sonnet-4-6` | Writing code, running commands, editing files, tests |

**In Claude Code CLI:**
- Start planning sessions with: `/model opus` before reading task files
- Switch to execution with: `/model sonnet` before writing code
- The sub-agents in `.claude/agents/` inherit the calling model unless overridden

**In VS Code Copilot Agent mode:**
- Set model to `claude-opus-4-6` for: "design task", "plan feature", "architect"
- Set model to `claude-sonnet-4-6` for: "implement", "write code", "execute task"

## Open-Source Libraries Only

**All dependencies must be free and open-source (MIT/Apache 2.0/BSD):**
- Salt DS: Apache 2.0 ✅
- AG Grid **Community Edition**: MIT ✅ (do NOT use AG Grid Enterprise)
- TanStack Query: MIT ✅
- Zustand: MIT ✅
- Vite: MIT ✅
- React: MIT ✅
- Vitest: MIT ✅
- MSW: MIT ✅

**Explicitly banned (require paid license):**
- AG Grid Enterprise (rowGrouping via enterprise feature) — use Community tree data instead
- Highcharts — use CSS-only charts or Chart.js (MIT)
- Any Atlassian licensed component

## How Claude Should Work on This Project

### Execution Mode
This project uses **step-by-step task execution** designed for:
- Claude Code CLI (`claude` command)
- VS Code GitHub Copilot agent mode with model `claude-opus-4-6`
- Persistent loop execution via `/loop` or external orchestration

### Task System
All implementation work is broken into numbered task files in `tasks/`.
Each task is **self-contained** — it declares inputs, outputs, acceptance criteria, and which sub-agent to use.

**Before starting ANY work:**
1. Read `tasks/TASK_REGISTRY.md` to find the current task
2. Read the specific task file fully before writing any code
3. Use the designated sub-agent for that task type
4. Mark the task complete in TASK_REGISTRY.md when done
5. Report: what was done, what is next, any blockers

**Loop behavior:** When running in a loop (`/loop`), Claude should:
- Check TASK_REGISTRY.md for the next PENDING task
- Execute it fully using the correct sub-agent
- Update status to DONE with a summary
- Stop the loop if status is BLOCKED (needs human input)

### Sub-Agents (in `.claude/agents/`)

| Agent | File | Use When |
|---|---|---|
| Architect | `architect.md` | System design, file structure decisions, API contracts |
| UI Developer | `ui-developer.md` | React components, Salt DS, AG Grid |
| Jira Integrator | `jira-integrator.md` | Jira API, MCP Jira calls, data transformation |
| Tester | `tester.md` | Vitest tests, RTL tests, test data fixtures |
| Reporter | `reporter.md` | Sprint report generation, slippage analysis |

### Custom Slash Commands (in `.claude/commands/`)

| Command | Purpose |
|---|---|
| `/sprint-report` | Generate end-of-sprint status for all teams |
| `/sync-jira` | Force-refresh all Jira data via MCP |
| `/slippage-check` | Run slippage detection across all active initiatives |
| `/build-all` | Full build + test + lint validation |

## MCP Servers

This project uses two MCP servers configured in `.claude/settings.json`:
- **`jira`** — Atlassian Jira Cloud MCP for reading issues, sprints, boards
- **`github`** — GitHub MCP for PR creation, branch management

**When to use MCP vs REST API:**
- Use MCP `jira` for exploratory queries, quick lookups, and ad-hoc sprint data
- Use the app's `src/services/jira.service.ts` (REST) for all production data fetching in the UI

## Code Conventions

### TypeScript
- `strict: true` — no `any`, no `as unknown as X` hacks
- Prefer `interface` for object shapes, `type` for unions/utilities
- All async functions return explicit `Promise<T>`
- Use discriminated unions for API response states

### React
- Function components only, no class components
- Custom hooks in `src/hooks/` prefixed with `use`
- One component per file, named export matches filename
- Props interfaces named `{ComponentName}Props`

### Salt DS
- Use Salt DS tokens for all colors/spacing (`--salt-color-*`, `--salt-spacing-*`)
- Never hardcode hex colors — always use Salt tokens
- Use `SaltProvider` at root with `theme="salt"` and `mode="light"` (toggle support)
- Prefer Salt components over custom HTML: `Text`, `Button`, `Card`, `Panel`, `Badge`

### AG Grid
- Use `AgGridReact` with `columnDefs` as typed `ColDef<T>[]`
- Enable `rowSelection`, `sortable`, `filter`, `resizable` by default
- Custom cell renderers in `src/components/shared/grid-cells/`
- Theme: `ag-theme-quartz` — do NOT use deprecated `ag-theme-alpine`

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`
- Services/utils: `camelCase.service.ts`, `camelCase.utils.ts`
- Types: `camelCase.types.ts`

## Git Conventions

- Branch: `feat/<task-number>-<short-description>`
- Commits: `feat(scope): description` (conventional commits)
- Never commit `.env` or `.env.local`
- PR: one per task, squash merge

### GitHub Push Authentication

The GitHub PAT is stored in `.env` as `GITHUB_TOKEN`. Always push using:

```bash
source .env && git remote set-url origin "https://mkumar5:${GITHUB_TOKEN}@github.com/mkumar5/jira-roadmap-tracker.git"
git push origin main
```

**If push fails with 401:** The token is expired. Generate a new one at:
`https://github.com/settings/tokens` → Fine-grained or Classic PAT → scopes: `repo` (full)

Then update `.env`:
```
GITHUB_TOKEN="ghp_your_new_token_here"
```

And reset the remote URL with the new token (same command above).

### Commit message footer (always use this format)
Every commit must end with:
```
Built with Claude Code — https://claude.ai/claude-code
```

Full example:
```
feat(task-03): Jira service layer with all 10 methods

Implement jira.service.ts with full transformer layer ...

Built with Claude Code — https://claude.ai/claude-code
```

**Rules:**
- Author is always **Manoj Kumar** (`git config user.name "Manoj Kumar"`)
- No `Co-Authored-By` lines — Claude Code is a tool, not a co-author
- The footer line attributes the AI tooling used, not a person

## Environment Variables

All env vars must be prefixed with `VITE_` to be exposed to the browser.
See `.env.example` for required variables. Never hardcode credentials.

### Jira Authentication

Jira credentials flow: `.env` → `VITE_JIRA_EMAIL` / `VITE_JIRA_API_TOKEN`
→ `jira.client.ts` `getCredentials()` → `Authorization: Basic base64(email:token)`
→ Vite proxy forwards to `https://VITE_JIRA_HOST/rest/api/3` and `/rest/agile/1.0`

**Critical proxy rules (vite.config.ts):**
- Browser User-Agent is replaced with `jira-roadmap-manager/1.0 node-proxy` — Jira Cloud
  enforces strict XSRF on POST /search/jql when it detects a browser UA (Safari/Chrome)
- `X-Atlassian-Token: no-check` is set on every proxied request
- Browser security headers (`sec-fetch-*`, `origin`, `referer`, `cookie`) are stripped
- Both `/api/jira` (REST API v3) and `/api/jira/agile` (Agile API v1) rules apply these

**If you see 403 XSRF errors:** The proxy User-Agent replacement is likely missing.
Check `vite.config.ts` `configure` handlers are present on both proxy rules.

**If you see 401 errors:** Token is wrong or empty. Check Settings page or `.env` values.
`getCredentials()` uses `||` (not `??`) so empty strings fall back to env vars.

**Jira API token:** Generate at `https://id.atlassian.com/manage-profile/security/api-tokens`

## Architecture Decisions

### Why Salt DS?
J.P. Morgan's open-source design system — production-grade, accessible (WCAG 2.1 AA),
designed for data-dense financial/enterprise UIs. Pairs well with AG Grid for dashboards.

### Why AG Grid?
Handles 10,000+ rows with virtualization. Supports grouping, pivoting, tree data —
essential for Initiative → Epic → Story hierarchical display.

### Why TanStack Query?
Automatic background refetch, stale-while-revalidate, optimistic updates.
Jira data is eventually consistent — TQ's caching strategy fits perfectly.

### Jira Hierarchy Mapping
```
Portfolio Level (Jira Premium / Advanced Roadmaps):
  Initiative   → Jira issue type: "Initiative" (or "Theme")
  Deliverable  → Jira issue type: "Feature" or custom "Deliverable"
  Epic         → Jira issue type: "Epic" (standard)
  Story        → Jira issue type: "Story" (standard)
```
If your org uses labels/components for Initiatives, see `src/services/jira.service.ts`
for the `HIERARCHY_STRATEGY` config.

## Slippage Detection Logic

An item is **slipped** when:
- `dueDate` is set AND `dueDate < today` AND `status` is NOT in `['Done', 'Closed', 'Released']`
- OR: item was in a sprint that ended and was NOT completed (moved to next sprint 2+ times)

Slippage severity:
- `CRITICAL`: slipped > 14 days or 2+ sprints
- `HIGH`: slipped 8-14 days or 1 sprint
- `MEDIUM`: slipped 1-7 days
- `LOW`: at risk (due within 3 days, not done)

## Sprint Report Format

Generated at end of each 2-week sprint, per team:
1. **Delivered** — stories moved to Done this sprint
2. **Carried Over** — stories moved to next sprint (with count of times carried)
3. **Next Sprint Committed** — stories planned for upcoming sprint
4. **Slipped Epics** — epics with past-due dates
5. **At Risk** — items due in next 2 weeks with < 50% sub-items done
