/**
 * Jira Service — single source of truth for all Jira API calls.
 * All methods return app domain types, never raw Jira API shapes.
 * Pagination, error handling, and auth are managed by jira.client.ts.
 */
import { jiraClient, jiraAgileClient, paginateJiraSearch } from './jira.client';
import { ISSUE_TYPES, FIELD_SETS, STATUS_CATEGORIES, jiraIssueUrl, PAGINATION } from './jira.constants';
import { calculateSlippage, getDaysPastDue } from '@/utils/slippage.utils';
import type {
  Initiative,
  Deliverable,
  Epic,
  Story,
  Sprint,
  Board,
  SlippedItem,
  AtRiskItem,
  StatusCategory,
  TeamMember,
} from '@/types';
import type {
  JiraIssue,
  JiraUser,
  JiraSprint,
  JiraBoard,
  JiraBoardListResponse,
  JiraSprintListResponse,
  JiraSprintIssuesResponse,
} from '@/types';

const JIRA_HOST = (import.meta.env.VITE_JIRA_HOST as string | undefined) ?? '';

// ─── Transformer helpers ──────────────────────────────────────────────────────

function mapStatus(key: string): StatusCategory {
  if (key === STATUS_CATEGORIES.DONE) return 'DONE';
  if (key === STATUS_CATEGORIES.IN_PROGRESS) return 'IN_PROGRESS';
  return 'TODO';
}

function mapTeamMember(user: JiraUser): TeamMember {
  return {
    accountId: user.accountId,
    displayName: user.displayName,
    email: user.emailAddress,
    avatarUrl: user.avatarUrls['48x48'],
  };
}

type DomainPriority = Story['priority'];
const PRIORITY_MAP: Record<string, DomainPriority> = {
  Highest: 'HIGHEST',
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
  Lowest: 'LOWEST',
};
function mapPriority(name: string): DomainPriority {
  return PRIORITY_MAP[name] ?? 'MEDIUM';
}

function mapIssueType(name: string): SlippedItem['issueType'] {
  const lower = name.toLowerCase();
  if (lower === 'initiative' || lower === 'theme' || lower === 'goal') return 'initiative';
  if (lower === 'feature' || lower === 'deliverable' || lower === 'capability') return 'deliverable';
  if (lower === 'epic') return 'epic';
  return 'story';
}

/** Common base fields shared by all domain types */
function mapBase(issue: JiraIssue) {
  const f = issue.fields;
  return {
    id: issue.id,
    key: issue.key,
    summary: f.summary,
    status: mapStatus(f.status.statusCategory.key),
    assignee: f.assignee ? mapTeamMember(f.assignee) : null,
    dueDate: f.duedate,
    startDate: (f['customfield_10015'] as string | undefined) ?? null,
    createdAt: f.created,
    updatedAt: f.updated,
    labels: f.labels,
    projectKey: f.project.key,
    jiraUrl: jiraIssueUrl(JIRA_HOST, issue.key),
  };
}

function mapSprintField(s: JiraSprint): Sprint {
  return {
    id: s.id,
    name: s.name,
    state: s.state,
    startDate: s.startDate ?? '',
    endDate: s.endDate ?? '',
    completedDate: s.completeDate ?? null,
    boardId: s.boardId,
    teamName: '', // populated by fetchActiveSprints via board lookup
    goal: s.goal ?? null,
  };
}

function mapBoard(board: JiraBoard): Board {
  return {
    id: board.id,
    name: board.name,
    type: board.type,
    projectKey: board.location?.projectKey ?? '',
    // Derive team name by stripping common board suffixes
    teamName: board.name.replace(/\s*(Board|Scrum|Kanban)\s*$/i, '').trim() || board.name,
  };
}

function mapInitiative(issue: JiraIssue): Initiative {
  const today = new Date();
  const dueDate = issue.fields.duedate;
  return {
    ...mapBase(issue),
    type: 'initiative',
    deliverables: [],
    healthScore: 100,
    slippageSeverity: calculateSlippage(dueDate, today),
    totalEpics: 0,
    completedEpics: 0,
  };
}

function mapDeliverable(issue: JiraIssue): Deliverable {
  const f = issue.fields;
  return {
    ...mapBase(issue),
    type: 'deliverable',
    initiativeKey: f.parent?.key ?? '',
    epics: [],
    progress: 0,
  };
}

function mapEpic(issue: JiraIssue): Epic {
  const f = issue.fields;
  const today = new Date();
  const dueDate = f.duedate;
  return {
    ...mapBase(issue),
    type: 'epic',
    deliverableKey: f.parent?.key ?? null,
    initiativeKey: (f['customfield_10051'] as string | undefined) ?? null,
    stories: [],
    storyPointsTotal: 0,
    storyPointsDone: 0,
    slippageSeverity: calculateSlippage(dueDate, today),
    daysPastDue: getDaysPastDue(dueDate, today),
  };
}

function mapStory(issue: JiraIssue): Story {
  const f = issue.fields;
  const sprints = f.customfield_10020;
  const activeSprint = sprints?.find((s) => s.state === 'active') ?? sprints?.[0] ?? null;
  return {
    ...mapBase(issue),
    type: 'story',
    epicKey: f.parent?.key ?? f.customfield_10014 ?? null,
    storyPoints: f.customfield_10016 ?? null,
    sprint: activeSprint ? mapSprintField(activeSprint) : null,
    timesCarried: Math.max(0, (sprints?.length ?? 1) - 1),
    priority: mapPriority(f.priority.name),
  };
}

function mapSlippedItem(issue: JiraIssue): SlippedItem {
  const f = issue.fields;
  const today = new Date();
  const dueDate = f.duedate;
  const sprints = f.customfield_10020;
  const activeSprint = sprints?.find((s) => s.state === 'active') ?? sprints?.[0] ?? null;
  return {
    ...mapBase(issue),
    issueType: mapIssueType(f.issuetype.name),
    slippageSeverity: calculateSlippage(dueDate, today),
    daysPastDue: getDaysPastDue(dueDate, today),
    teamName: null,
    sprintName: activeSprint?.name ?? null,
  };
}

function mapAtRiskItem(issue: JiraIssue): AtRiskItem {
  const f = issue.fields;
  const today = new Date();
  const dueDate = f.duedate;
  return {
    ...mapBase(issue),
    issueType: mapIssueType(f.issuetype.name),
    daysUntilDue: -getDaysPastDue(dueDate, today), // positive = days remaining
    percentComplete: 0,
    teamName: null,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const jiraService = {
  /**
   * Fetch all active initiatives across given project keys.
   * JQL: issuetype = Initiative AND statusCategory != Done ORDER BY duedate ASC
   */
  async fetchInitiatives(projectKeys: string[]): Promise<Initiative[]> {
    if (projectKeys.length === 0) return [];
    const projectList = projectKeys.map((k) => `"${k}"`).join(',');
    const jql = `project in (${projectList}) AND issuetype = "${ISSUE_TYPES.INITIATIVE}" AND statusCategory != Done ORDER BY duedate ASC`;
    return paginateJiraSearch(jql, FIELD_SETS.ROADMAP, mapInitiative);
  },

  /**
   * Fetch deliverables (Features) linked to an initiative.
   * JQL: "Epic Link" = INIT-1 OR parent = INIT-1 AND issuetype = Feature
   */
  async fetchDeliverables(initiativeKey: string): Promise<Deliverable[]> {
    const jql = `parent = "${initiativeKey}" AND issuetype = "${ISSUE_TYPES.DELIVERABLE}" ORDER BY duedate ASC`;
    return paginateJiraSearch(jql, FIELD_SETS.ROADMAP, mapDeliverable);
  },

  /**
   * Fetch epics, optionally under a deliverable or across projects.
   * JQL: issuetype = Epic AND (parent = DELIV-1 OR project in (...))
   */
  async fetchEpics(deliverableKey?: string, projectKeys?: string[]): Promise<Epic[]> {
    let jql: string;
    if (deliverableKey) {
      jql = `parent = "${deliverableKey}" AND issuetype = "${ISSUE_TYPES.EPIC}" ORDER BY duedate ASC`;
    } else if (projectKeys && projectKeys.length > 0) {
      const projectList = projectKeys.map((k) => `"${k}"`).join(',');
      jql = `project in (${projectList}) AND issuetype = "${ISSUE_TYPES.EPIC}" AND statusCategory != Done ORDER BY duedate ASC`;
    } else {
      return [];
    }
    return paginateJiraSearch(jql, FIELD_SETS.ROADMAP, mapEpic);
  },

  /**
   * Fetch all stories under an epic.
   * JQL: "Epic Link" = EPIC-1 OR parent = EPIC-1 AND issuetype = Story
   */
  async fetchStories(epicKey: string): Promise<Story[]> {
    const jql = `(parent = "${epicKey}" OR "Epic Link" = "${epicKey}") AND issuetype in ("${ISSUE_TYPES.STORY}", "${ISSUE_TYPES.TASK}") ORDER BY status ASC`;
    return paginateJiraSearch(jql, FIELD_SETS.SPRINT, mapStory);
  },

  /**
   * Fetch all Scrum boards for a project via the Agile API.
   */
  async fetchBoards(projectKey: string): Promise<Board[]> {
    const { data } = await jiraAgileClient.get<JiraBoardListResponse>('/board', {
      params: { projectKeyOrId: projectKey, maxResults: PAGINATION.BOARD_MAX, type: 'scrum' },
    });
    return data.values.map(mapBoard);
  },

  /**
   * Fetch all sprints for a board (all states: active, closed, future).
   */
  async fetchSprints(boardId: number): Promise<Sprint[]> {
    const { data } = await jiraAgileClient.get<JiraSprintListResponse>(
      `/board/${boardId}/sprint`,
      { params: { maxResults: 50 } }
    );
    return data.values.map((s) => mapSprintField(s));
  },

  /**
   * Fetch active sprints for multiple boards in parallel, enriched with team names.
   */
  async fetchActiveSprints(boardIds: number[]): Promise<Sprint[]> {
    if (boardIds.length === 0) return [];

    const results = await Promise.allSettled(
      boardIds.map((id) =>
        jiraAgileClient
          .get<JiraSprintListResponse>(`/board/${id}/sprint`, {
            params: { state: 'active', maxResults: 10 },
          })
          .then((res) => ({ boardId: id, sprints: res.data.values }))
      )
    );

    const sprints: Sprint[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const s of result.value.sprints) {
          sprints.push(mapSprintField(s));
        }
      }
    }
    return sprints;
  },

  /**
   * Fetch all issues in a sprint via the Agile sprint issues endpoint.
   */
  async fetchSprintIssues(sprintId: number): Promise<Story[]> {
    const allStories: Story[] = [];
    let startAt = 0;

    while (true) {
      const { data } = await jiraAgileClient.get<JiraSprintIssuesResponse>(
        `/sprint/${sprintId}/issue`,
        {
          params: {
            fields: FIELD_SETS.SPRINT.join(','),
            startAt,
            maxResults: PAGINATION.MAX_RESULTS,
          },
        }
      );
      allStories.push(...data.issues.map(mapStory));
      startAt += data.issues.length;
      if (startAt >= (data.total ?? 0) || data.issues.length === 0) break;
    }

    return allStories;
  },

  /**
   * Fetch all items that are past their due date and not done.
   * JQL: duedate < now() AND statusCategory not in (Done) AND issuetype in (...)
   */
  async fetchSlippedItems(projectKeys: string[]): Promise<SlippedItem[]> {
    if (projectKeys.length === 0) return [];
    const projectList = projectKeys.map((k) => `"${k}"`).join(',');
    const types = [ISSUE_TYPES.INITIATIVE, ISSUE_TYPES.DELIVERABLE, ISSUE_TYPES.EPIC, ISSUE_TYPES.STORY]
      .map((t) => `"${t}"`)
      .join(',');
    const jql = `project in (${projectList}) AND duedate < now() AND statusCategory not in (Done) AND issuetype in (${types}) ORDER BY duedate ASC`;
    return paginateJiraSearch(jql, FIELD_SETS.SLIPPAGE, mapSlippedItem);
  },

  /**
   * Fetch items at risk — due within N days and not done.
   * JQL: duedate >= now() AND duedate <= Nd AND statusCategory not in (Done)
   */
  async fetchAtRiskItems(projectKeys: string[], days = 14): Promise<AtRiskItem[]> {
    if (projectKeys.length === 0) return [];
    const projectList = projectKeys.map((k) => `"${k}"`).join(',');
    const types = [ISSUE_TYPES.INITIATIVE, ISSUE_TYPES.DELIVERABLE, ISSUE_TYPES.EPIC]
      .map((t) => `"${t}"`)
      .join(',');
    const jql = `project in (${projectList}) AND duedate >= now() AND duedate <= "${days}d" AND statusCategory not in (Done) AND issuetype in (${types}) ORDER BY duedate ASC`;
    return paginateJiraSearch(jql, FIELD_SETS.SLIPPAGE, mapAtRiskItem);
  },

  /**
   * Test the Jira connection — returns the authenticated user's account info.
   */
  async testConnection(): Promise<{ accountId: string; displayName: string; emailAddress: string }> {
    const { data } = await jiraClient.get<{
      accountId: string;
      displayName: string;
      emailAddress: string;
    }>('/myself');
    return data;
  },
};
