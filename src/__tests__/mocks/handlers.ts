import { http, HttpResponse } from 'msw';
import { initiativesFixture } from '../fixtures/initiatives.fixture';
import { sprintsFixture } from '../fixtures/sprints.fixture';
import { allSprintIssuesFixture, prevSprintIssuesFixture } from '../fixtures/jira-issues.fixture';

const makeSearchResponse = (issues: typeof initiativesFixture) => ({
  issues,
  total: issues.length,
  startAt: 0,
  maxResults: 100,
});

export const handlers = [
  // POST /search/jql (Jira Cloud REST v3)
  http.post('*/api/jira/search/jql', async ({ request }) => {
    const body = (await request.json()) as { jql?: string };
    const jql = body?.jql ?? '';

    if (jql.includes('duedate < now()')) {
      const slipped = [...initiativesFixture, ...allSprintIssuesFixture].filter(
        (i) => i.fields.duedate && new Date(i.fields.duedate) < new Date()
      );
      return HttpResponse.json(makeSearchResponse(slipped));
    }

    if (jql.includes('duedate >= now()')) {
      const atRisk = [...initiativesFixture, ...allSprintIssuesFixture].filter(
        (i) =>
          i.fields.duedate &&
          new Date(i.fields.duedate) >= new Date() &&
          new Date(i.fields.duedate) <= new Date(Date.now() + 14 * 86400000)
      );
      return HttpResponse.json(makeSearchResponse(atRisk));
    }

    if (jql.includes('issuetype = "Epic"') || (jql.includes('issuetype in') && jql.includes('Epic'))) {
      return HttpResponse.json(makeSearchResponse([]));
    }

    if (jql.includes('parent =') || jql.includes('Epic Link')) {
      return HttpResponse.json(makeSearchResponse(allSprintIssuesFixture));
    }

    return HttpResponse.json(makeSearchResponse(initiativesFixture));
  }),

  // Jira Agile boards
  http.get('*/api/jira/agile/board', () =>
    HttpResponse.json({
      values: [
        { id: 1, name: 'Team Alpha Board', type: 'scrum', location: { projectKey: 'PROJ' } },
        { id: 2, name: 'Team Beta Board', type: 'scrum', location: { projectKey: 'PROJ' } },
      ],
      total: 2, startAt: 0, maxResults: 50, isLast: true,
    })
  ),

  // All sprints for a board
  http.get('*/api/jira/agile/board/:boardId/sprint', ({ params }) => {
    const boardId = Number(params['boardId']);
    const boardSprints = sprintsFixture.filter((s) => s.boardId === boardId);
    return HttpResponse.json({
      values: boardSprints,
      total: boardSprints.length,
      startAt: 0, maxResults: 50, isLast: true,
    });
  }),

  // Sprint issues
  http.get('*/api/jira/agile/sprint/:sprintId/issue', ({ params }) => {
    const sprintId = Number(params['sprintId']);
    const issues = sprintId === 100 ? prevSprintIssuesFixture : allSprintIssuesFixture;
    return HttpResponse.json({ issues, total: issues.length, startAt: 0, maxResults: 100 });
  }),

  // Jira myself
  http.get('*/api/jira/myself', () =>
    HttpResponse.json({ accountId: 'test-account-id', displayName: 'Test User', emailAddress: 'test@example.com' })
  ),
];
