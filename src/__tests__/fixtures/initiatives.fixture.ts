import type { JiraIssue } from '@/types';

const today = new Date();
const pastDate = (daysAgo: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0]; // "2026-03-01"
};
const futureDate = (daysAhead: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

export const initiativesFixture: JiraIssue[] = [
  {
    id: '10001',
    key: 'PROJ-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    fields: {
      summary: 'Platform Modernization Initiative',
      description: null,
      status: {
        id: '3',
        name: 'In Progress',
        self: '',
        statusCategory: { id: 4, key: 'indeterminate', colorName: 'yellow', name: 'In Progress' },
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
      priority: { id: '1', name: 'High', iconUrl: '' },
      issuetype: { id: '10', name: 'Initiative', iconUrl: '', description: '', subtask: false, hierarchyLevel: 3 },
      project: { id: '100', key: 'PROJ', name: 'Test Project', self: '' },
      duedate: pastDate(20), // CRITICAL — 20 days overdue
      created: '2026-01-01T00:00:00.000Z',
      updated: today.toISOString(),
      labels: ['platform', 'q1'],
      components: [],
      subtasks: [],
    },
  },
  {
    id: '10002',
    key: 'PROJ-2',
    self: 'https://test.atlassian.net/rest/api/3/issue/10002',
    fields: {
      summary: 'Mobile App Redesign',
      description: null,
      status: {
        id: '3',
        name: 'In Progress',
        self: '',
        statusCategory: { id: 4, key: 'indeterminate', colorName: 'yellow', name: 'In Progress' },
      },
      assignee: null,
      reporter: {
        accountId: 'user-0',
        displayName: 'Admin',
        emailAddress: 'admin@example.com',
        active: true,
        avatarUrls: { '48x48': '', '24x24': '', '16x16': '', '32x32': '' },
      },
      priority: { id: '2', name: 'Medium', iconUrl: '' },
      issuetype: { id: '10', name: 'Initiative', iconUrl: '', description: '', subtask: false, hierarchyLevel: 3 },
      project: { id: '100', key: 'PROJ', name: 'Test Project', self: '' },
      duedate: futureDate(30), // On track
      created: '2026-01-15T00:00:00.000Z',
      updated: today.toISOString(),
      labels: ['mobile'],
      components: [],
      subtasks: [],
    },
  },
  {
    id: '10003',
    key: 'PROJ-3',
    self: 'https://test.atlassian.net/rest/api/3/issue/10003',
    fields: {
      summary: 'Data Analytics Pipeline',
      description: null,
      status: {
        id: '3',
        name: 'In Progress',
        self: '',
        statusCategory: { id: 4, key: 'indeterminate', colorName: 'yellow', name: 'In Progress' },
      },
      assignee: null,
      reporter: {
        accountId: 'user-0',
        displayName: 'Admin',
        emailAddress: 'admin@example.com',
        active: true,
        avatarUrls: { '48x48': '', '24x24': '', '16x16': '', '32x32': '' },
      },
      priority: { id: '2', name: 'Medium', iconUrl: '' },
      issuetype: { id: '10', name: 'Initiative', iconUrl: '', description: '', subtask: false, hierarchyLevel: 3 },
      project: { id: '100', key: 'PROJ', name: 'Test Project', self: '' },
      duedate: pastDate(5), // MEDIUM — 5 days overdue
      created: '2026-02-01T00:00:00.000Z',
      updated: today.toISOString(),
      labels: ['data', 'analytics'],
      components: [],
      subtasks: [],
    },
  },
];
