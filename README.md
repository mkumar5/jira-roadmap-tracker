# Jira Roadmap Manager

A management-level tracking dashboard for Jira Cloud — built entirely with Claude Code.
Tracks Initiatives, Epics, and Stories across 5–20 sprint teams, identifies slippage,
and generates end-of-sprint reports.

> **See [`CLAUDE_WORKFLOW.md`](./CLAUDE_WORKFLOW.md)** for a full guide on replicating
> this Claude Code workflow (PRD → plan → agents → loop → orchestration) in any project.

---

## Screens

| Screen | What it shows |
|---|---|
| **Executive Dashboard** | KPI cards, program status ring, team health grid, top slipped items, upcoming deadlines |
| **Roadmap Grid** | Epic → Story hierarchy with slippage colour coding, filters, CSV export |
| **Sprint Tracking** | Per-team sprint cards with velocity, carryover detection, story grid |
| **Slippage Alerts** | Slipped items (CRITICAL / HIGH / MEDIUM / LOW) + at-risk tab |
| **Sprint Reports** | Per-team end-of-sprint report with health score, velocity trend, markdown export |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| UI System | Salt DS — J.P. Morgan design system (Apache 2.0) |
| Data Grid | AG Grid Community — MIT licence only |
| State | TanStack Query v5 (server state) + Zustand (UI state) |
| Routing | React Router v6 |
| HTTP | Axios with interceptors + Vite dev proxy |
| Testing | Vitest + React Testing Library + MSW v2 |

All dependencies are free and open-source. AG Grid Enterprise is explicitly banned.

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Jira Cloud account with at least one Scrum project
- A Jira API token — generate at [id.atlassian.com → Security → API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### 1. Clone and install

```bash
git clone https://github.com/mkumar5/jira-roadmap-tracker.git
cd jira-roadmap-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_JIRA_HOST=yourorg.atlassian.net        # no https://
VITE_JIRA_EMAIL=you@example.com
VITE_JIRA_API_TOKEN=your-api-token
VITE_JIRA_PROJECT_KEYS=SCRUM,PLATFORM       # comma-separated
VITE_HIERARCHY_STRATEGY=LABEL_BASED         # see Hierarchy Strategies below
GITHUB_TOKEN=ghp_your_token                 # for git push only
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and go to **Settings** to verify your connection.

---

## Hierarchy Strategies

Set `VITE_HIERARCHY_STRATEGY` to match how your Jira org is structured:

| Value | Use when |
|---|---|
| `LABEL_BASED` | Standard Jira Cloud — Epics are the top level (recommended) |
| `COMPONENT_BASED` | Components map to deliverables within each Epic |
| `JIRA_PREMIUM` | Jira Advanced Roadmaps with Initiative + Feature issue types |
| `PORTFOLIO` | Jira Portfolio / Advanced Roadmaps full hierarchy |

Most personal/team Jira Cloud instances should use `LABEL_BASED`.

---

## Jira Authentication

The app authenticates via **Basic Auth** (email + API token) forwarded through the
Vite dev server proxy. The proxy is critical — it replaces the browser User-Agent
with a non-browser identifier to bypass Jira Cloud's XSRF protection on
POST `/rest/api/3/search/jql`.

```
Browser → Vite proxy → Jira Cloud
           ↑
    Replaces User-Agent
    Adds X-Atlassian-Token: no-check
    Strips browser security headers
```

If you see **403 XSRF check failed**: the proxy is not running — make sure
`npm run dev` is active (not a production build).

If you see **401 Invalid credentials**: check Settings page or your `.env` values.

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppShell, AppHeader, AppSidebar
│   ├── roadmap/         # RoadmapGrid, SlippageGrid, TopSlippedList
│   ├── shared/          # KpiCard, StatusRing, TeamHealthGrid, BaseGrid
│   └── sprint/          # SprintTeamCard, SprintStoriesGrid, HealthScoreGauge
├── hooks/               # useExecutiveSummary, useRoadmap, useSlippage, useSprint
├── pages/               # One file per screen
├── services/
│   ├── jira.client.ts   # Axios instances + auth interceptor + paginator
│   ├── jira.service.ts  # All Jira API calls → domain types
│   ├── jira.constants.ts
│   └── sprint.service.ts
├── store/               # Zustand: configStore, slippageStore
├── types/               # jira.types.ts, roadmap.types.ts, sprint.types.ts
└── utils/               # date.utils, slippage.utils, hierarchy.utils, report.utils
tasks/                   # Numbered task files + TASK_REGISTRY.md
.claude/
├── agents/              # Specialist Claude agents
└── commands/            # Slash commands (/build-all, /sprint-report, etc.)
```

---

## Slippage Detection

An item is **slipped** when `dueDate < today` and status is not Done/Closed/Released.

| Severity | Condition |
|---|---|
| `CRITICAL` | Slipped > 14 days or carried 2+ sprints |
| `HIGH` | Slipped 8–14 days or carried 1 sprint |
| `MEDIUM` | Slipped 1–7 days |
| `LOW` | At risk — due within 3 days, not done |

Configure the alert threshold and lookahead window in **Settings → Slippage Alerting**.

---

## Sprint Reports

Generated per team for the active sprint:

1. **Delivered** — stories moved to Done, with story points
2. **Carried Over** — stories not completed, flagged by times carried
3. **Next Sprint Committed** — stories planned for the upcoming sprint
4. **Slipped Epics** — parent epics past due date
5. **Health Score** — composite score based on delivery ratio and carryover

Export to **Markdown** or copy to clipboard from the Sprint Reports screen.

---

## Available Scripts

```bash
npm run dev          # Start dev server with Jira proxy (port 3000)
npm run build        # Production build
npm run type-check   # TypeScript strict mode check
npm run lint         # ESLint
npm test             # Vitest (watch mode)
npm test -- --run    # Vitest (single run, for CI)
npm run coverage     # Test coverage report
```

---

## Git & GitHub Push

The GitHub PAT is stored in `.env` as `GITHUB_TOKEN`. Push with:

```bash
source .env && git remote set-url origin \
  "https://mkumar5:${GITHUB_TOKEN}@github.com/mkumar5/jira-roadmap-tracker.git"
git push origin main
```

If you get a 401, generate a new token at [github.com/settings/tokens](https://github.com/settings/tokens)
with `repo` scope and update `.env`.

---

## Built With Claude Code

This app was designed, planned, and implemented end-to-end using
[Claude Code](https://claude.ai/claude-code) — Anthropic's agentic coding CLI.

The workflow used:
- **CLAUDE.md** — project constitution (tech stack, conventions, auth, domain rules)
- **`tasks/`** — 12 numbered self-contained task files with acceptance criteria
- **`.claude/agents/`** — specialist agents (architect, ui-developer, jira-integrator, tester, reporter)
- **`.claude/commands/`** — slash commands for recurring operations
- **Loop mode** — autonomous task execution from registry to commit

See [`CLAUDE_WORKFLOW.md`](./CLAUDE_WORKFLOW.md) for the full playbook.

---

*Built with Claude Code — https://claude.ai/claude-code*
