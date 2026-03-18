import { useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { buildHierarchyNodes } from '@/utils/hierarchy.utils';
import { useConfigStore } from '@/store/configStore';

export function useRoadmapHierarchy() {
  const { projectKeys } = useConfigStore();

  return useQuery({
    queryKey: ['roadmap', 'hierarchy', projectKeys],
    queryFn: async () => {
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
