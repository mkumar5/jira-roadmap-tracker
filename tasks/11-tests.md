# Task 11 — Tests & Coverage

**Agent:** tester
**Status:** PENDING
**Depends on:** Tasks 03, 04, 06, 07, 08 complete

## Context
Set up the full test suite. Focus on business logic correctness (slippage, sprint reports)
and critical UI paths. Use MSW to mock Jira API.

## Steps

### 1. Create MSW mocks (`src/__tests__/mocks/`)

`handlers.ts` — intercept all Jira API calls
`server.ts` — MSW node server (for Vitest)
`browser.ts` — MSW browser worker (for dev, optional)

### 2. Create test fixtures (`src/__tests__/fixtures/`)

`jira-issues.fixture.ts` — realistic Jira issue responses for all issue types
`sprints.fixture.ts` — sprint data with active/closed/future states
`initiatives.fixture.ts` — full hierarchy: 3 initiatives × 2 deliverables × 3 epics × 5 stories

Fixture requirements:
- Include at least 2 slipped items (different severities)
- Include 1 carried-over story (2+ times)
- Include items from 3 different "teams" (different boards)

### 3. Unit tests

`src/__tests__/unit/slippage.utils.test.ts`:
- `calculateSlippage` — test all 5 severity levels
- `getDaysPastDue` — positive, negative, zero, null due date
- `formatSlipDate` — "5 days overdue", "Due today", "Due in 3d"

`src/__tests__/unit/hierarchy.utils.test.ts`:
- `buildHierarchyNodes` — correct path arrays for 4-level hierarchy
- Empty initiatives → empty array
- Initiative with no deliverables → single node

`src/__tests__/unit/date.utils.test.ts`:
- `sprintDaysRemaining` — future/past/today
- `sprintProgress` — 0%, 50%, 100%, beyond 100%
- `formatSprintPeriod` — correct date formatting

`src/__tests__/unit/sprint.service.test.ts`:
- Health score: 100 - (slippedEpics * 10) - (carried * 3) clamped 0-100
- Carried-over detection works (issue in both current and previous sprint)

### 4. Integration tests

`src/__tests__/integration/SlippagePage.test.tsx`:
- Renders summary banner with correct severity counts
- Grid shows slipped items
- Filter by severity filters grid rows
- Empty state when no slippage

`src/__tests__/integration/SprintTrackingPage.test.tsx`:
- Renders team cards for all active sprints
- Expand card shows stories grid
- Carried-over stories highlighted

`src/__tests__/integration/SettingsPage.test.tsx`:
- Form inputs update config store
- "Test Connection" button calls Jira API
- Shows success/error banner

### 5. Coverage targets
Run `npm run test:coverage` and ensure:
- `src/utils/` → 90%+
- `src/services/` → 75%+
- `src/components/shared/` → 70%+
- Overall → 60%+

## Acceptance Criteria
- [ ] `npm run test` passes all tests (zero failures)
- [ ] MSW intercepts all Jira API calls in tests (no real network calls)
- [ ] Slippage utility has 100% branch coverage
- [ ] Coverage report shows overall > 60%
- [ ] Integration tests use `renderWithProviders` helper (Salt DS + QueryClient)

## Output
Update TASK_REGISTRY.md:
- Mark 11 `DONE`: "Vitest + RTL + MSW test suite, coverage X%"
