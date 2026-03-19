// Raw Jira Cloud API response shapes.
// Do NOT use these directly in UI components — transform to domain types first.

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraIssueFields {
  summary: string;
  description: JiraDocument | null;
  status: JiraStatus;
  assignee: JiraUser | null;
  reporter: JiraUser;
  priority: JiraPriority;
  issuetype: JiraIssueType;
  project: JiraProject;
  duedate: string | null; // "2026-03-18"
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
  labels: string[];
  components: JiraComponent[];
  subtasks: JiraSubtask[];
  parent?: JiraParentRef;
  // Custom fields (IDs vary by org — configure in jira.constants.ts)
  customfield_10014?: string; // Epic Link (legacy)
  customfield_10016?: number; // Story Points
  customfield_10020?: JiraSprint[]; // Sprint
  customfield_10051?: string; // Initiative Link (varies by org)
  [key: string]: unknown; // other custom fields
}

export interface JiraStatus {
  id: string;
  name: string;
  self: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraStatusCategory {
  id: number;
  key: 'new' | 'indeterminate' | 'done';
  colorName: string;
  name: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
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
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl: string;
  description: string;
  subtask: boolean;
  hierarchyLevel: number;
}

export interface JiraPriority {
  id: string;
  name: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  iconUrl: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  self: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraComponent {
  id: string;
  name: string;
  self: string;
}

export interface JiraParentRef {
  id: string;
  key: string;
  self: string;
  fields?: {
    summary: string;
    status: JiraStatus;
    issuetype: JiraIssueType;
  };
}

export interface JiraSubtask {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraStatus;
    issuetype: JiraIssueType;
  };
}

// Jira Atlassian Document Format
export interface JiraDocument {
  version: number;
  type: 'doc';
  content: unknown[];
}

// Jira Search API response
export interface JiraSearchResponse {
  issues: JiraIssue[];
  total?: number | null;
  startAt?: number;
  maxResults?: number;
  nextPageToken?: string;
  isLast?: boolean;
  expand?: string;
}

// Jira Agile API types
export interface JiraBoardListResponse {
  values: JiraBoard[];
  total: number;
  startAt: number;
  maxResults: number;
  isLast: boolean;
}

export interface JiraSprintListResponse {
  values: JiraSprint[];
  total: number;
  startAt: number;
  maxResults: number;
  isLast: boolean;
}

export interface JiraSprintIssuesResponse {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}
