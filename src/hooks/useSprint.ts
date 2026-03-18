import { useQueries, useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { useConfigStore } from '@/store/configStore';

export function useAllBoards() {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['boards', projectKeys],
    queryFn: () =>
      Promise.all(projectKeys.map((key) => jiraService.fetchBoards(key))).then((r) => r.flat()),
    staleTime: 30 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}

export function useActiveSprints(boardIds: number[]) {
  return useQuery({
    queryKey: ['sprints', 'active', boardIds],
    queryFn: () => jiraService.fetchActiveSprints(boardIds),
    staleTime: 60 * 1000,
    enabled: boardIds.length > 0,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useSprintIssues(sprintIds: number[]) {
  return useQueries({
    queries: sprintIds.map((id) => ({
      queryKey: ['sprint', 'issues', id],
      queryFn: () => jiraService.fetchSprintIssues(id),
      staleTime: 60 * 1000,
    })),
  });
}
