import type { Initiative, HierarchyNode } from '@/types';
import { calculateSlippage, getDaysPastDue } from './slippage.utils';
import { jiraService } from '@/services/jira.service';

/**
 * Build a flat list of HierarchyNode objects for AG Grid tree data.
 * AG Grid uses the `path` array to reconstruct the tree structure.
 *
 * Path examples:
 *   Initiative:  ['PROJ-1']
 *   Deliverable: ['PROJ-1', 'PROJ-5']
 *   Epic:        ['PROJ-1', 'PROJ-5', 'PROJ-23']
 *   Story:       ['PROJ-1', 'PROJ-5', 'PROJ-23', 'PROJ-101']
 */
export function buildHierarchyNodes(initiatives: Initiative[]): HierarchyNode[] {
  const nodes: HierarchyNode[] = [];
  const today = new Date();

  for (const initiative of initiatives) {
    nodes.push(toNode(initiative, [initiative.key], 'initiative', today));

    for (const deliverable of initiative.deliverables) {
      const delivPath = [initiative.key, deliverable.key];
      nodes.push(toNode(deliverable, delivPath, 'deliverable', today));

      for (const epic of deliverable.epics) {
        const epicPath = [...delivPath, epic.key];
        nodes.push(toNode(epic, epicPath, 'epic', today));

        for (const story of epic.stories) {
          nodes.push(toNode(story, [...epicPath, story.key], 'story', today));
        }
      }
    }
  }

  return nodes;
}

function toNode(
  item: {
    id: string;
    key: string;
    summary: string;
    status: HierarchyNode['status'];
    dueDate: string | null;
    assignee: { displayName: string } | null;
    projectKey: string;
    jiraUrl: string;
    storyPoints?: number | null;
  },
  path: string[],
  type: HierarchyNode['type'],
  today: Date
): HierarchyNode {
  return {
    path,
    id: item.id,
    key: item.key,
    summary: item.summary,
    type,
    status: item.status,
    slippageSeverity: calculateSlippage(item.dueDate, today),
    dueDate: item.dueDate,
    daysPastDue: getDaysPastDue(item.dueDate, today),
    storyPoints: item.storyPoints ?? null,
    assignee: item.assignee?.displayName ?? null,
    teamName: null, // populated from sprint data if available
    projectKey: item.projectKey,
    jiraUrl: item.jiraUrl,
  };
}

/**
 * Filter hierarchy nodes by slippage severity.
 * When a parent is filtered out, show it anyway if it has slipped children.
 */
export function filterBySlippage(
  nodes: HierarchyNode[],
  severities: HierarchyNode['slippageSeverity'][]
): HierarchyNode[] {
  if (severities.length === 0) return nodes;

  const slippedPaths = new Set<string>();
  for (const node of nodes) {
    if (severities.includes(node.slippageSeverity)) {
      // Mark all ancestor paths as visible
      node.path.forEach((_, i) => {
        slippedPaths.add(node.path.slice(0, i + 1).join('/'));
      });
    }
  }

  return nodes.filter((n) => slippedPaths.has(n.path.join('/')));
}

/**
 * Build hierarchy for LABEL_BASED strategy (standard Jira without Premium).
 * Top level = Epic, second level = Story.
 * Fetches all epics, then fetches stories for each epic in parallel.
 */
export async function buildLabelBasedNodes(projectKeys: string[]): Promise<HierarchyNode[]> {
  if (projectKeys.length === 0) return [];
  const today = new Date();
  const epics = await jiraService.fetchEpics(undefined, projectKeys);
  const storyLists = await Promise.all(epics.map((e) => jiraService.fetchStories(e.key)));
  const nodes: HierarchyNode[] = [];
  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    nodes.push(toNode(epic, [epic.key], 'epic', today));
    for (const story of storyLists[i]) {
      nodes.push(toNode(story, [epic.key, story.key], 'story', today));
    }
  }
  return nodes;
}

/**
 * Sum story points across a list of nodes.
 */
export function sumStoryPoints(nodes: HierarchyNode[]): number {
  return nodes
    .filter((n) => n.type === 'story')
    .reduce((sum, n) => sum + (n.storyPoints ?? 0), 0);
}
