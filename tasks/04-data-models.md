# Task 04 — Data Models & TypeScript Types

**Agent:** architect
**Status:** PENDING
**Depends on:** Task 01 complete (can run parallel with 03)

## Context
Define all TypeScript interfaces for the app's domain model.
These types flow through every layer: service → hook → component → grid.

## Files to create

### `src/types/jira.types.ts` — Raw Jira API shapes
```typescript
// Do NOT use these in UI components — transform to domain types first

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: unknown;
    status: JiraStatus;
    assignee: JiraUser | null;
    reporter: JiraUser;
    priority: JiraPriority;
    issuetype: JiraIssueType;
    project: JiraProject;
    duedate: string | null;        // "2026-03-18"
    created: string;               // ISO timestamp
    updated: string;               // ISO timestamp
    labels: string[];
    components: JiraComponent[];
    subtasks: JiraIssue[];
    parent?: { key: string; id: string };
    customfield_10014?: string;    // Epic Link
    customfield_10016?: number;    // Story Points
    customfield_10020?: JiraSprint[];
  };
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: 'new' | 'indeterminate' | 'done';
    colorName: string;
    name: string;
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  avatarUrls: Record<string, string>;
}

export interface JiraSprint {
  id: number;
  state: 'active' | 'closed' | 'future';
  name: string;
  startDate: string;
  endDate: string;
  completeDate?: string;
  boardId: number;
  goal?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban';
  self: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl: string;
  subtask: boolean;
}

export interface JiraPriority {
  id: string;
  name: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraComponent {
  id: string;
  name: string;
}
```

### `src/types/roadmap.types.ts` — Domain model
```typescript
export type StatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type SlippageSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
export type HierarchyStrategy = 'JIRA_PREMIUM' | 'PORTFOLIO' | 'LABEL_BASED' | 'COMPONENT_BASED';
export type HealthScore = number; // 0–100

export interface BaseRoadmapItem {
  id: string;
  key: string;
  summary: string;
  status: StatusCategory;
  assignee: TeamMember | null;
  dueDate: string | null;           // ISO date string
  startDate: string | null;
  createdAt: string;                // ISO timestamp
  updatedAt: string;
  labels: string[];
  projectKey: string;
  jiraUrl: string;                  // direct link to Jira issue
}

export interface Initiative extends BaseRoadmapItem {
  type: 'initiative';
  deliverables: Deliverable[];
  healthScore: HealthScore;
  slippageSeverity: SlippageSeverity;
}

export interface Deliverable extends BaseRoadmapItem {
  type: 'deliverable';
  initiativeKey: string;
  epics: Epic[];
  progress: number;                 // 0–100 percentage
}

export interface Epic extends BaseRoadmapItem {
  type: 'epic';
  deliverableKey: string | null;
  stories: Story[];
  storyPointsTotal: number;
  storyPointsDone: number;
  slippageSeverity: SlippageSeverity;
  daysPastDue: number;              // negative = future, positive = past
}

export interface Story extends BaseRoadmapItem {
  type: 'story';
  epicKey: string | null;
  storyPoints: number | null;
  sprint: Sprint | null;
  timesCarried: number;             // how many sprints this was moved to next sprint
  priority: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
}

export interface Sprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate: string;
  endDate: string;
  completedDate: string | null;
  boardId: number;
  teamName: string;
  goal: string | null;
}

export interface Board {
  id: number;
  name: string;
  type: 'scrum' | 'kanban';
  projectKey: string;
  teamName: string;
}

export interface TeamMember {
  accountId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

// Slippage-specific types
export interface SlippedItem extends BaseRoadmapItem {
  issueType: 'initiative' | 'deliverable' | 'epic' | 'story';
  slippageSeverity: SlippageSeverity;
  daysPastDue: number;
  teamName: string | null;
  sprintName: string | null;
  timesCarried?: number;
}

export interface AtRiskItem extends BaseRoadmapItem {
  issueType: 'initiative' | 'deliverable' | 'epic' | 'story';
  daysUntilDue: number;
  percentComplete: number;
  teamName: string | null;
}

// Hierarchical grid data (for AG Grid tree data)
export interface HierarchyNode {
  path: string[];               // ['PROJ-1', 'PROJ-5', 'PROJ-23'] = Initiative > Epic > Story
  id: string;
  key: string;
  summary: string;
  type: 'initiative' | 'deliverable' | 'epic' | 'story';
  status: StatusCategory;
  slippageSeverity: SlippageSeverity;
  dueDate: string | null;
  daysPastDue: number;
  storyPoints: number | null;
  assignee: string | null;
  teamName: string | null;
  jiraUrl: string;
}
```

### `src/types/sprint.types.ts` — Sprint reporting types
```typescript
import type { Story, Epic, Sprint, SlippedItem, AtRiskItem } from './roadmap.types';

export interface SprintReport {
  sprint: Sprint;
  teamName: string;
  generatedAt: string;              // ISO timestamp

  delivered: {
    count: number;
    storyPoints: number;
    items: Story[];
  };

  carriedOver: {
    count: number;
    storyPoints: number;
    items: Array<Story & { timesCarried: number }>;
  };

  nextSprintCommitted: {
    count: number;
    storyPoints: number;
    items: Story[];
  };

  slippedEpics: Array<Epic & { daysPastDue: number }>;

  atRisk: {
    count: number;
    items: AtRiskItem[];
  };

  velocityTrend: {
    thisSprintPoints: number;
    lastSprintPoints: number;
    averageLast4Sprints: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };

  healthScore: number;              // 0–100
}

export interface ExecutiveSummary {
  asOf: string;
  overallHealthScore: number;

  initiativeSummary: {
    total: number;
    onTrack: number;
    atRisk: number;
    slipped: number;
    done: number;
  };

  teamSummaries: Array<{
    teamName: string;
    healthScore: number;
    activeSprintName: string | null;
    deliveredPoints: number;
    carriedCount: number;
  }>;

  topSlippedItems: SlippedItem[];
  upcomingDeadlines: AtRiskItem[];

  keyMetrics: {
    totalPointsDeliveredThisSprint: number;
    totalSlippedItems: number;
    averageCarryoverRate: number;     // % of stories carried per sprint
    percentInitiativesOnTrack: number;
  };
}

// Filter/sort state for UI
export interface RoadmapFilters {
  projectKeys: string[];
  teams: string[];
  severities: string[];
  statuses: string[];
  dueDateRange: { from: string | null; to: string | null };
  searchText: string;
}
```

### `src/types/index.ts` — barrel export
```typescript
export * from './jira.types';
export * from './roadmap.types';
export * from './sprint.types';
```

## Acceptance Criteria
- [ ] All 3 type files created with no TypeScript errors
- [ ] `src/types/index.ts` barrel export works
- [ ] `HierarchyNode.path` supports AG Grid tree data format
- [ ] No circular imports between type files
- [ ] `SlippageSeverity` is used consistently (5 values: CRITICAL, HIGH, MEDIUM, LOW, OK)

## Output
Update TASK_REGISTRY.md:
- Mark 04 `DONE`: "Domain model types defined: Initiative→Story hierarchy, sprint reports, slippage"
