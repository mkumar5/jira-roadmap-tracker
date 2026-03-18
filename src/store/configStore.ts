import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HierarchyStrategy, RoadmapFilters } from '@/types';

interface ConfigState {
  // Jira connection
  jiraHost: string;
  jiraEmail: string;
  jiraApiToken: string;
  projectKeys: string[];
  hierarchyStrategy: HierarchyStrategy;

  // UI filters (persisted so they survive refresh)
  filters: RoadmapFilters;

  // Actions
  setJiraConfig: (config: {
    jiraHost: string;
    jiraEmail: string;
    jiraApiToken: string;
    projectKeys: string[];
    hierarchyStrategy: HierarchyStrategy;
  }) => void;
  setFilters: (filters: Partial<RoadmapFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: RoadmapFilters = {
  projectKeys: [],
  teams: [],
  severities: [],
  statuses: [],
  issueTypes: [],
  dueDateRange: { from: null, to: null },
  searchText: '',
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      jiraHost: (import.meta.env.VITE_JIRA_HOST as string | undefined) ?? '',
      jiraEmail: (import.meta.env.VITE_JIRA_EMAIL as string | undefined) ?? '',
      jiraApiToken: (import.meta.env.VITE_JIRA_API_TOKEN as string | undefined) ?? '',
      projectKeys: ((import.meta.env.VITE_JIRA_PROJECT_KEYS as string | undefined) ?? '')
        .split(',')
        .filter(Boolean),
      hierarchyStrategy: ((import.meta.env.VITE_HIERARCHY_STRATEGY as string | undefined) ??
        'JIRA_PREMIUM') as HierarchyStrategy,
      filters: DEFAULT_FILTERS,

      setJiraConfig: (config) => set((state) => ({ ...state, ...config })),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set((state) => ({ ...state, filters: DEFAULT_FILTERS })),
    }),
    { name: 'jira-roadmap-config' }
  )
);
