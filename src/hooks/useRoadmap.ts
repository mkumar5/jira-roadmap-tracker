import { useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { buildHierarchyNodes, buildLabelBasedNodes } from '@/utils/hierarchy.utils';
import { useConfigStore } from '@/store/configStore';

export function useRoadmapHierarchy() {
  const { projectKeys, hierarchyStrategy } = useConfigStore();

  return useQuery({
    queryKey: ['roadmap', 'hierarchy', projectKeys, hierarchyStrategy],
    queryFn: async () => {
      if (hierarchyStrategy === 'LABEL_BASED' || hierarchyStrategy === 'COMPONENT_BASED') {
        // Standard Jira: Epics are the top level, Stories are their children.
        return buildLabelBasedNodes(projectKeys);
      }
      // JIRA_PREMIUM / PORTFOLIO: full Initiative → Deliverable → Epic → Story hierarchy
      const initiatives = await jiraService.fetchInitiatives(projectKeys);
      return buildHierarchyNodes(initiatives);
    },
    staleTime: 5 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}

export function useSlippageCount() {
  const { projectKeys } = useConfigStore();

  return useQuery({
    queryKey: ['slippage', 'count', projectKeys],
    queryFn: async () => {
      const items = await jiraService.fetchSlippedItems(projectKeys);
      return items.length;
    },
    staleTime: 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}
