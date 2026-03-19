/**
 * Realistic JiraIssue fixtures for sprint and slippage tests.
 * Includes: Done stories, In Progress stories, carried-over story.
 */
import type { JiraIssue, JiraSprint } from '@/types';

const today = new Date();
const past = (d: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0] as string;
};
const future = (d: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split('T')[0] as string;
};

const activeSprint: JiraSprint = {
  id: 101,
  state: 'active',
  name: 'Team Alpha Sprint 24',
  startDate: new Date(today.getTime() - 7 * 86400000).toISOString(),
  endDate: new Date(today.getTime() + 7 * 86400000).toISOString(),
  boardId: 1,
  goal: 'Deliver auth migration',
};

const closedSprint: JiraSprint = {
  id: 100,
  state: 'closed',
  name: 'Team Alpha Sprint 23',
  startDate: new Date(today.getTime() - 21 * 86400000).toISOString(),
  endDate: new Date(today.getTime() - 7 * 86400000).toISOString(),
  boardId: 1,
  goal: 'Prior sprint',
};

function makeStory(
  id: string,
  key: string,
  summary: string,
  statusKey: 'new' | 'indeterminate' | 'done',
  duedate: string | null,
  points: number,
  sprints: JiraSprint[]
): JiraIssue {
  return {
    id,
    key,
    self: `https://test.atlassian.net/rest/api/3/issue/${id}`,
    fields: {
      summary,
      description: null,
      status: {
        id: statusKey === 'done' ? '10002' : statusKey === 'indeterminate' ? '10001' : '10000',
        name: statusKey === 'done' ? 'Done' : statusKey === 'indeterminate' ? 'In Progress' : 'To Do',
        self: '',
        statusCategory: {
          id: statusKey === 'done' ? 3 : statusKey === 'indeterminate' ? 4 : 2,
          key: statusKey,
          colorName: statusKey === 'done' ? 'green' : 'yellow',
          name: statusKey,
        },
      },
      assignee: {
        accountId: 'user-1',
        displayName: 'Alice Johnson',
        emailAddress: 'alice@example.com',
        active: true,
        avatarUrls: { '48x48': '', '24x24': '', '16x16': '', '32x32': '' },
      },
      reporter: {
        accountId: 'user-0',
        displayName: 'Admin',
        emailAddress: 'admin@example.com',
        active: true,
        avatarUrls: { '48x48': '', '24x24': '', '16x16': '', '32x32': '' },
      },
      priority: { id: '2', name: 'Medium', iconUrl: '' },
      issuetype: { id: '10001', name: 'Story', iconUrl: '', description: '', subtask: false, hierarchyLevel: 0 },
      project: { id: '100', key: 'PROJ', name: 'Test Project', self: '' },
      duedate,
      created: '2026-01-01T00:00:00.000Z',
      updated: today.toISOString(),
      labels: [],
      components: [],
      subtasks: [],
      customfield_10016: points,
      customfield_10020: sprints,
      parent: { id: '20001', key: 'PROJ-EPIC-1', self: '', fields: { summary: 'Auth Epic', issuetype: { id: '10000', name: 'Epic', description: '', iconUrl: '', subtask: false, hierarchyLevel: 1 }, status: { id: '3', name: 'In Progress', self: '', statusCategory: { id: 4, key: 'indeterminate', colorName: 'yellow', name: 'In Progress' } } } },
    },
  };
}

// Story that was Done this sprint (velocity data)
export const doneStory1 = makeStory('20001', 'PROJ-101', 'Implement JWT auth flow', 'done', past(3), 8, [activeSprint]);
export const doneStory2 = makeStory('20002', 'PROJ-102', 'Add refresh token support', 'done', past(5), 5, [activeSprint]);

// Story In Progress this sprint
export const inProgressStory = makeStory('20003', 'PROJ-103', 'OAuth integration with Google', 'indeterminate', future(3), 8, [activeSprint]);

// Carried-over story — was in previous sprint AND current sprint (timesCarried = 1)
export const carriedStory = makeStory('20004', 'PROJ-104', 'Migrate legacy session tokens', 'indeterminate', past(2), 13, [closedSprint, activeSprint]);

// Overdue story for slippage tests
export const overdueStory = makeStory('20005', 'PROJ-105', 'Remove deprecated auth endpoint', 'indeterminate', past(10), 3, [activeSprint]);

// To-do story (not started)
export const todoStory = makeStory('20006', 'PROJ-106', 'Document new auth API', 'new', future(5), 3, [activeSprint]);

export const allSprintIssuesFixture: JiraIssue[] = [
  doneStory1,
  doneStory2,
  inProgressStory,
  carriedStory,
  overdueStory,
  todoStory,
];

export const prevSprintIssuesFixture: JiraIssue[] = [
  // carriedStory was in prev sprint too — it's the carried-over one
  makeStory('20004', 'PROJ-104', 'Migrate legacy session tokens', 'indeterminate', past(16), 13, [closedSprint]),
  makeStory('20007', 'PROJ-107', 'Setup rate limiting', 'done', past(10), 5, [closedSprint]),
];
