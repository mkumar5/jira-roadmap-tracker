# Product Requirements Document
## Jira Roadmap Manager

**Version:** 1.0
**Author:** Manoj Kumar
**Status:** Approved
**Last updated:** 2026-03-19

---

## 1. Problem Statement

Engineering managers running 5–20 Scrum teams across a shared Jira Cloud instance have
no single view of program health. They must open multiple Jira boards, run manual JQL
queries, and compile sprint updates in spreadsheets every two weeks.

**Pain points:**
- No cross-team slippage visibility until a deadline is already missed
- Sprint report creation takes 2–3 hours per sprint per manager
- No executive-level rollup: portfolio leads cannot see Epic/Initiative status at a glance
- Carried-over stories are invisible across team boundaries

**Who this is for:**
- Engineering managers (5–20 teams)
- Portfolio / program leads who need initiative-level rollups
- Scrum masters generating end-of-sprint reports

---

## 2. Goals

| Goal | Metric |
|---|---|
| Surface slipped items before standup | Slippage visible without any JQL |
| Eliminate manual sprint report creation | One-click markdown export per team |
| Give portfolio leads a single dashboard | Executive dashboard loads in < 5 seconds |
| Work with standard Jira Cloud (no Premium) | Runs on free/team tier Jira |

---

## 3. Non-Goals (v1)

- No write-back to Jira (read-only)
- No user accounts or multi-tenant auth (single Jira org per deployment)
- No mobile layout (desktop only)
- No Jira Premium / Advanced Roadmaps initiative types (supported via config flag)
- No historical trend charts beyond velocity comparison to previous sprint

---

## 4. Jira Data Model

This app maps the following Jira hierarchy:

```
Initiative   →  Jira issue type: "Initiative" (Jira Premium) OR label-based grouping
  Deliverable  →  Jira issue type: "Feature" / "Deliverable" (Premium) OR component
    Epic       →  Jira issue type: "Epic" (standard — always present)
      Story    →  Jira issue type: "Story" / "Task" (standard)
        Subtask
```

**For standard Jira Cloud (no Premium):** Epics are the top level.
Strategy is configurable via `VITE_HIERARCHY_STRATEGY`:

| Value | Use case |
|---|---|
| `LABEL_BASED` | Epics are top level — default for standard Jira Cloud |
| `COMPONENT_BASED` | Components group Epics into Deliverables |
| `JIRA_PREMIUM` | Full Initiative → Feature → Epic → Story |
| `PORTFOLIO` | Advanced Roadmaps portfolio hierarchy |

---

## 5. Screens & User Flows

### 5.1 Executive Dashboard (`/dashboard`)

**User:** Portfolio lead, 8:00 AM standup prep
**Flow:** Open app → see program health at a glance → identify which teams are slipping

**Must show:**
- 6 KPI cards: Total Epics, On Track, At Risk, Slipped, Active Teams, Overall Health Score
- Status ring: donut chart of on-track / at-risk / slipped / done epics
- Team health grid: one row per active sprint team with health score bar
- Top 10 slipped items (CRITICAL + HIGH only)
- Upcoming deadlines — items due in the next 14 days
- Auto-refresh every 10 minutes

---

### 5.2 Roadmap Grid (`/roadmap`)

**User:** Engineering manager checking epic status
**Flow:** Open roadmap → expand epics → filter by severity → export to CSV for stakeholders

**Must show:**
- Collapsible hierarchy: Epic → Story (AG Grid, tree expand/collapse)
- Slippage severity colour badge per row
- Jira issue key as clickable link to Jira Cloud
- Filters: search text, severity checkboxes, status
- CSV export of current view
- TypeScript-safe column definitions

---

### 5.3 Sprint Tracking (`/sprints`)

**User:** Scrum master checking all active sprints
**Flow:** Open sprint tracking → see all active sprints → filter to my team → expand to see stories

**Must show:**
- One card per active sprint team
- Sprint time elapsed (linear progress bar)
- Points delivered vs committed (linear progress bar)
- Health badge: Healthy / At Risk / Slipping
- Carryover count, in-progress count
- Expandable story grid below each card
- Filter dropdown by team name
- Auto-refresh every 5 minutes

---

### 5.4 Slippage Alerts (`/slippage`)

**User:** Engineering manager, daily slippage review
**Flow:** Open slippage → see all slipped items tab → switch to at-risk tab → configure alert threshold in Settings

**Must show:**
- Tab 1: Slipped items — AG Grid with severity badge, days overdue, Jira link
- Tab 2: At-risk items — items due within configurable window (default 14 days)
- Summary banner: counts per severity level, clickable to filter
- Configurable in Settings: alert threshold (CRITICAL/HIGH/MEDIUM/LOW), at-risk lookahead (7/14/30 days)

---

### 5.5 Sprint Reports (`/reports`)

**User:** Scrum master, end of sprint
**Flow:** Open sprint reports → click Generate → review report → export markdown → paste into Confluence/Slack

**Must show (per team, per active sprint):**
1. Health score gauge (0–100)
2. Velocity trend badge (UP / DOWN / STABLE vs previous sprint)
3. Delivered stories — count + points
4. Carried over stories — count + points + times carried
5. Next sprint committed — stories already in the future sprint
6. Slipped epics — parent epics of this sprint's stories that are past due
7. Export to Markdown / Copy to clipboard

---

### 5.6 Settings (`/settings`)

**User:** Any user, first-time setup
**Flow:** Enter Jira credentials → Test Connection → set project keys → Save

**Must have:**
- Jira Host, Email, API Token fields
- Test Connection button with success/error banner
- Project keys (comma-separated)
- Hierarchy strategy dropdown
- Slippage alerting config (threshold + lookahead)
- Reset to `.env` defaults button
- Settings persist across sessions (localStorage via Zustand persist)

---

## 6. Technical Requirements

### 6.1 Stack (non-negotiable)

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript strict | Type safety, ecosystem |
| Build | Vite 5 | Fast HMR, proxy support for Jira CORS |
| UI | Salt DS (J.P. Morgan, Apache 2.0) | Accessible, enterprise-grade, data-dense |
| Grid | AG Grid Community (MIT) | Handles 10k+ rows, virtual scroll |
| Server state | TanStack Query v5 | Stale-while-revalidate, background refresh |
| UI state | Zustand | Minimal, TypeScript-native |
| Routing | React Router v6 | Industry standard |
| HTTP | Axios + Vite proxy | Proxy required to bypass Jira CORS + XSRF |
| Testing | Vitest + RTL + MSW v2 | Unit + integration, no real network calls |

### 6.2 Open-Source Licence Policy

All dependencies must be MIT / Apache 2.0 / BSD.
**Explicitly banned:** AG Grid Enterprise, Highcharts, any Atlassian-licenced component.

### 6.3 Jira API

- REST API v3: `POST /rest/api/3/search/jql` for all issue queries (GET /search is removed)
- Agile API v1: `/rest/agile/1.0/board`, `/board/{id}/sprint`, `/sprint/{id}/issue`
- Auth: Basic Auth (email:api-token) via `Authorization: Basic base64(...)` header
- Proxy: Vite dev server proxies `/api/jira` → Jira Cloud, replaces User-Agent to bypass XSRF

### 6.4 Performance

- Dashboard must load in < 5 seconds on first visit (parallel fetches)
- Roadmap grid must render 500+ epics without jank (AG Grid virtualisation)
- Stale time: 5 min for dashboards, 30 min for boards, 1 min for active sprints

### 6.5 No Backend

This is a pure browser app. All Jira calls go through the Vite dev proxy.
No Node.js server, no database, no auth service.

---

## 7. Slippage Detection Rules

An item is **slipped** when ALL of:
- `dueDate` is set AND `dueDate < today`
- `status` is NOT in `[Done, Closed, Released]`

An item is **at risk** when:
- `dueDate >= today` AND `dueDate <= today + atRiskDays`
- `status` is NOT done

Severity thresholds:

| Severity | Days past due | Sprint carries |
|---|---|---|
| CRITICAL | > 14 days | 2+ sprints |
| HIGH | 8–14 days | 1 sprint |
| MEDIUM | 1–7 days | — |
| LOW | At risk (not yet due) | — |

---

## 8. Sprint Report Rules

Report is generated per team for the **currently active sprint**:

1. **Delivered** = stories with `status = Done` in the active sprint
2. **Carried over** = stories in active sprint that were also in the previous sprint OR have `timesCarried > 0`
3. **Next sprint committed** = stories in the next `future` sprint for that board
4. **Slipped epics** = parent epics of active sprint stories where `dueDate < today`
5. **Velocity trend** = compare `deliveredPoints` this sprint vs previous sprint (UP > 10%, DOWN < -10%)
6. **Health score** = `100 - (slippedEpics * 10) - (carriedOver * 3) ± velocityBonus`

---

## 9. Acceptance Criteria (overall)

- [ ] All 5 screens load and display real Jira data
- [ ] No AG Grid Enterprise features used anywhere
- [ ] `npm run type-check` passes with zero errors (TypeScript strict)
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm test -- --run` passes with ≥ 75% service coverage
- [ ] `npm run build` produces a valid `dist/`
- [ ] Jira credentials never hardcoded — always from `.env` or Settings page
- [ ] Settings page persists config across page refreshes
- [ ] Sprint report markdown export is valid and pasteable

---

## 10. Out of Scope — Future Versions

- Write-back to Jira (update due dates, move stories)
- Multi-org / multi-tenant support
- Historical velocity charts (beyond 1-sprint comparison)
- Slack / email alert integration
- Mobile-responsive layout
- OAuth-based Jira auth (currently Basic Auth via proxy)
- Deployment to production host (currently dev-server only)
