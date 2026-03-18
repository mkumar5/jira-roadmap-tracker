import { useQuery } from '@tanstack/react-query';
import { jiraService } from '@/services/jira.service';
import { useConfigStore } from '@/store/configStore';
import { useSlippageStore } from '@/store/slippageStore';

export function useSlippage() {
  const { projectKeys } = useConfigStore();
  return useQuery({
    queryKey: ['slippage', projectKeys],
    queryFn: () => jiraService.fetchSlippedItems(projectKeys),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}

export function useAtRisk() {
  const { projectKeys } = useConfigStore();
  const { atRiskDays } = useSlippageStore();
  return useQuery({
    queryKey: ['at-risk', projectKeys, atRiskDays],
    queryFn: () => jiraService.fetchAtRiskItems(projectKeys, atRiskDays),
    staleTime: 5 * 60 * 1000,
    enabled: projectKeys.length > 0,
  });
}
