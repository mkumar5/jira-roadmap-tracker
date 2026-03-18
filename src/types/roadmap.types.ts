// App domain model — the single source of truth for UI types.
// All Jira API responses must be transformed into these types before use.

export type StatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export type SlippageSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';

export type HierarchyStrategy =
  | 'JIRA_PREMIUM' // Native Initiative/Feature issue types (Jira Premium)
  | 'PORTFOLIO' // Jira Portfolio / Advanced Roadmaps
  | 'LABEL_BASED' // Labels like "initiative:Q1-Platform"
  | 'COMPONENT_BASED'; // Components represent Deliverables

export type HealthScore = number; // 0–100, see CLAUDE.md for algorithm

export interface TeamMember {
  accountId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

// Base fields shared by all roadmap items
export interface BaseRoadmapItem {
  id: string;
  key: string;
  summary: string;
  status: StatusCategory;
  assignee: TeamMember | null;
  dueDate: string | null; // ISO date "2026-03-18"
  startDate: string | null;
  createdAt: string; // ISO timestamp
  updatedAt: string;
  labels: string[];
  projectKey: string;
  jiraUrl: string; // direct link to Jira issue
}

export interface Initiative extends BaseRoadmapItem {
  type: 'initiative';
  deliverables: Deliverable[];
  healthScore: HealthScore;
  slippageSeverity: SlippageSeverity;
  totalEpics: number;
  completedEpics: number;
}

export interface Deliverable extends BaseRoadmapItem {
  type: 'deliverable';
  initiativeKey: string;
  epics: Epic[];
  progress: number; // 0–100 percentage of child epics done
}

export interface Epic extends BaseRoadmapItem {
  type: 'epic';
  deliverableKey: string | null;
  initiativeKey: string | null;
  stories: Story[];
  storyPointsTotal: number;
  storyPointsDone: number;
  slippageSeverity: SlippageSeverity;
  daysPastDue: number; // negative = future, positive = past
}

export interface Story extends BaseRoadmapItem {
  type: 'story';
  epicKey: string | null;
  storyPoints: number | null;
  sprint: Sprint | null;
  timesCarried: number; // how many times moved from previous sprint
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

// Flat node for AG Grid tree data (Initiative → Deliverable → Epic → Story)
export interface HierarchyNode {
  path: string[]; // ['PROJ-1'] | ['PROJ-1', 'PROJ-5'] | ['PROJ-1', 'PROJ-5', 'PROJ-23']
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
  projectKey: string;
  jiraUrl: string;
}

// Filter state for UI
export interface RoadmapFilters {
  projectKeys: string[];
  teams: string[];
  severities: SlippageSeverity[];
  statuses: StatusCategory[];
  issueTypes: Array<'initiative' | 'deliverable' | 'epic' | 'story'>;
  dueDateRange: { from: string | null; to: string | null };
  searchText: string;
}
