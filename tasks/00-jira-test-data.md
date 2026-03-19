# Task 00 — Jira Test Data Seeding

**Agent:** jira-integrator
**Status:** PENDING
**Depends on:** Jira connection configured (Tasks 03 done)

## Context
Seed the connected Jira instance (mkumar-personal.atlassian.net / SCRUM project)
with realistic test data so all app screens have live data to display:
- Roadmap hierarchy grid (Epics acting as initiatives via LABEL_BASED strategy)
- Sprint tracking view (stories in active/future sprints)
- Slippage alerts (overdue epics + stories with past due dates)
- Executive dashboard (health scores, KPI counts)

## Data Plan

### Epics (5) — simulate Initiatives/Deliverables in label-based hierarchy
| Epic | Due | Expected Severity |
|------|-----|-------------------|
| Data Platform Modernization | 2026-02-01 | CRITICAL (45+ d overdue) |
| Analytics Dashboard v2 | 2026-03-05 | HIGH (~13 d overdue) |
| Data Quality Framework | 2026-03-28 | LOW (at risk, ~10 d away) |
| Real-time Data Pipeline | 2026-04-30 | OK (future) |
| ML Feature Store | 2026-06-30 | OK (future) |

### Stories (18) — mix of statuses, points, assignees
- 6 Done (velocity data)
- 5 In Progress (current work)
- 7 To Do (backlog + at-risk)
- Due dates: past (slippage), present (at-risk), future (planned)

### Sprint data
- Active sprint (SCRUM Sprint 0): 8-10 stories assigned
- Future sprint (SCRUM Sprint 1): 4-5 stories assigned

## Acceptance Criteria
- [ ] 5 Epics created with correct due dates and labels
- [ ] 18+ Stories created and linked to epics
- [ ] Stories have story points, assignees, priorities, due dates
- [ ] Stories in active sprint show in Sprint Tracking
- [ ] Overdue items appear in Slippage Alerts
- [ ] At-risk items appear in At Risk tab

## Output
Update TASK_REGISTRY.md:
- Mark 00 `DONE`: "Jira test data: 5 epics, 18 stories, active/future sprint populated"
