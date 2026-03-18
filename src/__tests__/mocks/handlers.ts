import { http, HttpResponse } from 'msw';
import { initiativesFixture } from '../fixtures/initiatives.fixture';
import { sprintsFixture } from '../fixtures/sprints.fixture';

export const handlers = [
  // Jira search API
  http.get('*/api/jira/search', ({ request }) => {
    const url = new URL(request.url);
    const jql = url.searchParams.get('jql') ?? '';

    if (jql.includes('Initiative')) {
      return HttpResponse.json({
        issues: initiativesFixture,
        total: initiativesFixture.length,
        startAt: 0,
        maxResults: 100,
      });
    }

    if (jql.includes('duedate < now()')) {
      // Slippage query — return overdue items from fixtures
      const slipped = initiativesFixture.filter(
        (i) => i.fields.duedate && new Date(i.fields.duedate) < new Date()
      );
      return HttpResponse.json({ issues: slipped, total: slipped.length, startAt: 0, maxResults: 100 });
    }

    return HttpResponse.json({ issues: [], total: 0, startAt: 0, maxResults: 100 });
  }),

  // Jira Agile boards
  http.get('*/api/jira/agile/board', () =>
    HttpResponse.json({
      values: [
        { id: 1, name: 'Team Alpha Board', type: 'scrum', location: { projectKey: 'PROJ' } },
        { id: 2, name: 'Team Beta Board', type: 'scrum', location: { projectKey: 'PROJ' } },
      ],
      total: 2,
      startAt: 0,
      maxResults: 50,
      isLast: true,
    })
  ),

  // Jira Agile sprints for a board
  http.get('*/api/jira/agile/board/:boardId/sprint', ({ params }) => {
    const boardId = Number(params['boardId']);
    const sprint = sprintsFixture.find((s) => s.boardId === boardId);
    return HttpResponse.json({
      values: sprint ? [sprint] : [],
      total: sprint ? 1 : 0,
      startAt: 0,
      maxResults: 50,
      isLast: true,
    });
  }),

  // Jira myself (connection test)
  http.get('*/api/jira/myself', () =>
    HttpResponse.json({
      accountId: 'test-account-id',
      displayName: 'Test User',
      emailAddress: 'test@example.com',
    })
  ),
];
