# Task 03 — Jira MCP + Service Layer

**Agent:** jira-integrator
**Status:** PENDING
**Depends on:** Task 01 complete

## Context
Build the Jira API service layer that powers all data in the app.
Validate all JQL patterns using MCP `jira` before hardcoding them.

## BLOCKED check
Before starting: verify `VITE_JIRA_HOST`, `VITE_JIRA_EMAIL`, `VITE_JIRA_API_TOKEN` are set in `.env`.
If not set, mark this task BLOCKED and add to Blocked Items Log in TASK_REGISTRY.md.

## Steps

### 1. Create Jira constants (`src/services/jira.constants.ts`)
```typescript
// Issue type names — verify against your Jira instance using MCP
export const ISSUE_TYPES = {
  INITIATIVE: 'Initiative',   // May be 'Theme' in some orgs
  DELIVERABLE: 'Feature',     // May be 'Deliverable' — check with MCP
  EPIC: 'Epic',
  STORY: 'Story',
  TASK: 'Task',
  BUG: 'Bug',
} as const;

// Status categories (Jira standard)
export const STATUS_CATEGORIES = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
} as const;

// Custom field IDs — MUST verify against your Jira instance
// Use MCP: search_issues(jql: "ORDER BY created LIMIT 1") and inspect fields
export const CUSTOM_FIELDS = {
  STORY_POINTS: 'story_points',  // or 'customfield_10016' — verify!
  EPIC_LINK: 'customfield_10014',
  SPRINT: 'customfield_10020',
  INITIATIVE_LINK: 'customfield_10051', // varies by org
  DUE_DATE: 'duedate',
  START_DATE: 'customfield_10015',
} as const;

export const PAGINATION = {
  MAX_RESULTS: 100,
  SEARCH_MAX: 100,
} as const;
```

### 2. Create Jira HTTP client (`src/services/jira.client.ts`)
```typescript
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

const JIRA_HOST = import.meta.env.VITE_JIRA_HOST as string;
const JIRA_EMAIL = import.meta.env.VITE_JIRA_EMAIL as string;
const JIRA_API_TOKEN = import.meta.env.VITE_JIRA_API_TOKEN as string;

if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('[Jira] Missing required env vars: VITE_JIRA_HOST, VITE_JIRA_EMAIL, VITE_JIRA_API_TOKEN');
}

const credentials = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`);

export const jiraClient: AxiosInstance = axios.create({
  baseURL: `/api/jira`,  // proxied via vite.config.ts
  headers: {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — log JQL for debugging
jiraClient.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    const jql = (config.params as { jql?: string })?.jql;
    if (jql) console.warn('[Jira JQL]', jql);
  }
  return config;
});

// Response interceptor — normalize errors
jiraClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) throw new Error('JIRA_AUTH_ERROR: Invalid credentials');
      if (status === 403) throw new Error('JIRA_PERMISSION_ERROR: Access denied');
      if (status === 429) throw new Error('JIRA_RATE_LIMIT: Too many requests');
      if (status === 404) throw new Error('JIRA_NOT_FOUND: Resource not found');
    }
    throw error;
  }
);

// Helper: paginate through all Jira search results
export async function paginateJiraSearch<T>(
  jql: string,
  fields: string[],
  transform: (issue: JiraApiIssue) => T
): Promise<T[]> {
  const allItems: T[] = [];
  let startAt = 0;
  let total = Infinity;

  while (startAt < total) {
    const { data } = await jiraClient.get<JiraSearchResponse>('/search', {
      params: { jql, fields: fields.join(','), startAt, maxResults: 100 },
    });
    total = data.total;
    allItems.push(...data.issues.map(transform));
    startAt += data.issues.length;
    if (data.issues.length === 0) break;
  }

  return allItems;
}

// Raw Jira API types (not app domain types)
export interface JiraApiIssue {
  id: string;
  key: string;
  fields: Record<string, unknown>;
}

export interface JiraSearchResponse {
  issues: JiraApiIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}
```

### 3. Create main Jira service (`src/services/jira.service.ts`)

This file implements all data fetching. Each method:
- Takes project keys as parameters (never hardcoded)
- Returns app domain types (not raw Jira types)
- Uses `paginateJiraSearch` for lists
- Has JSDoc with the JQL used

See full implementation details in `.claude/agents/jira-integrator.md`.

Implement these methods:
- `fetchInitiatives(projectKeys: string[]): Promise<Initiative[]>`
- `fetchDeliverables(initiativeKey: string): Promise<Deliverable[]>`
- `fetchEpics(deliverableKey?: string, projectKeys?: string[]): Promise<Epic[]>`
- `fetchStories(epicKey: string): Promise<Story[]>`
- `fetchBoards(projectKey: string): Promise<Board[]>`
- `fetchSprints(boardId: number): Promise<Sprint[]>`
- `fetchActiveSprints(boardIds: number[]): Promise<Sprint[]>`
- `fetchSprintIssues(sprintId: number): Promise<Story[]>`
- `fetchSlippedItems(projectKeys: string[]): Promise<SlippedItem[]>`
- `fetchAtRiskItems(projectKeys: string[], days?: number): Promise<AtRiskItem[]>`

### 4. Validate with MCP before finalizing
Use MCP `jira` to run these validation queries:
1. `search_issues(jql: "issuetype = Initiative LIMIT 5")` — verify issue type name
2. `search_issues(jql: "issuetype = Epic LIMIT 1")` — inspect field IDs for story points, links
3. `get_issue(issueKey: "{any sprint issue key}")` — find sprint custom field ID

If issue type names differ from constants, update `jira.constants.ts` and note in TASK_REGISTRY.md.

## Acceptance Criteria
- [ ] `jiraClient` is created with correct auth headers
- [ ] All 10 service methods are implemented
- [ ] `paginateJiraSearch` handles >100 results correctly
- [ ] 401/403/429/404 errors produce meaningful error messages
- [ ] MCP validation confirms JQL queries return expected data shapes
- [ ] TypeScript: no `any` types in service files

## Output
Update TASK_REGISTRY.md:
- Mark 03 `DONE`: "Jira service layer with pagination, error handling, and MCP-validated JQL"
- OR mark `BLOCKED` if env vars not set or issue type names differ unexpectedly
