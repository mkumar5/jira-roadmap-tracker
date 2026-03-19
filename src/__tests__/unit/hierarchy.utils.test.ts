import { describe, it, expect } from 'vitest';
import { buildHierarchyNodes, filterBySlippage, sumStoryPoints } from '@/utils/hierarchy.utils';
import type { Initiative } from '@/types';

function makeInitiative(key: string, dueDate: string | null = null): Initiative {
  return {
    id: key,
    key,
    summary: `Initiative ${key}`,
    status: 'IN_PROGRESS',
    assignee: null,
    dueDate,
    startDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    labels: [],
    projectKey: 'PROJ',
    jiraUrl: `https://test.atlassian.net/browse/${key}`,
    type: 'initiative',
    deliverables: [],
    healthScore: 100,
    slippageSeverity: 'OK',
    totalEpics: 0,
    completedEpics: 0,
  };
}

describe('buildHierarchyNodes', () => {
  it('returns empty array for empty initiatives', () => {
    expect(buildHierarchyNodes([])).toEqual([]);
  });

  it('returns single node for initiative with no deliverables', () => {
    const init = makeInitiative('PROJ-1');
    const nodes = buildHierarchyNodes([init]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.key).toBe('PROJ-1');
    expect(nodes[0]?.type).toBe('initiative');
    expect(nodes[0]?.path).toEqual(['PROJ-1']);
  });

  it('builds correct paths for 4-level hierarchy', () => {
    const init: Initiative = {
      ...makeInitiative('PROJ-1'),
      deliverables: [
        {
          id: 'PROJ-2',
          key: 'PROJ-2',
          summary: 'Deliverable',
          status: 'IN_PROGRESS',
          assignee: null,
          dueDate: null,
          startDate: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          labels: [],
          projectKey: 'PROJ',
          jiraUrl: 'https://test.atlassian.net/browse/PROJ-2',
          type: 'deliverable',
          initiativeKey: 'PROJ-1',
          progress: 0,
          epics: [
            {
              id: 'PROJ-3',
              key: 'PROJ-3',
              summary: 'Epic',
              status: 'IN_PROGRESS',
              assignee: null,
              dueDate: null,
              startDate: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              labels: [],
              projectKey: 'PROJ',
              jiraUrl: 'https://test.atlassian.net/browse/PROJ-3',
              type: 'epic',
              deliverableKey: 'PROJ-2',
              initiativeKey: 'PROJ-1',
              stories: [
                {
                  id: 'PROJ-4',
                  key: 'PROJ-4',
                  summary: 'Story',
                  status: 'TODO',
                  assignee: null,
                  dueDate: null,
                  startDate: null,
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                  labels: [],
                  projectKey: 'PROJ',
                  jiraUrl: 'https://test.atlassian.net/browse/PROJ-4',
                  type: 'story',
                  epicKey: 'PROJ-3',
                  storyPoints: 5,
                  sprint: null,
                  timesCarried: 0,
                  priority: 'MEDIUM',
                },
              ],
              storyPointsTotal: 5,
              storyPointsDone: 0,
              slippageSeverity: 'OK',
              daysPastDue: -30,
            },
          ],
        },
      ],
    };

    const nodes = buildHierarchyNodes([init]);
    expect(nodes).toHaveLength(4);

    const initiative = nodes.find((n) => n.type === 'initiative');
    const deliverable = nodes.find((n) => n.type === 'deliverable');
    const epic = nodes.find((n) => n.type === 'epic');
    const story = nodes.find((n) => n.type === 'story');

    expect(initiative?.path).toEqual(['PROJ-1']);
    expect(deliverable?.path).toEqual(['PROJ-1', 'PROJ-2']);
    expect(epic?.path).toEqual(['PROJ-1', 'PROJ-2', 'PROJ-3']);
    expect(story?.path).toEqual(['PROJ-1', 'PROJ-2', 'PROJ-3', 'PROJ-4']);
  });
});

describe('filterBySlippage', () => {
  it('returns all nodes when no severities specified', () => {
    const nodes = buildHierarchyNodes([makeInitiative('PROJ-1')]);
    expect(filterBySlippage(nodes, [])).toEqual(nodes);
  });
});

describe('sumStoryPoints', () => {
  it('sums only story nodes', () => {
    const nodes = buildHierarchyNodes([makeInitiative('PROJ-1')]);
    expect(sumStoryPoints(nodes)).toBe(0);
  });
});
