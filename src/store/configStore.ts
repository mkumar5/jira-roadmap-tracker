import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HierarchyStrategy, RoadmapFilters } from '@/types';

interface ConfigState {
  jiraHost: string;
  jiraEmail: string;
  jiraApiToken: string;
  projectKeys: string[];
  hierarchyStrategy: HierarchyStrategy;
  filters: RoadmapFilters;

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

export const ENV = {
  host: (import.meta.env.VITE_JIRA_HOST as string | undefined) ?? '',
  email: (import.meta.env.VITE_JIRA_EMAIL as string | undefined) ?? '',
  token: (import.meta.env.VITE_JIRA_API_TOKEN as string | undefined) ?? '',
  projectKeys: ((import.meta.env.VITE_JIRA_PROJECT_KEYS as string | undefined) ?? '')
    .split(',').map((k) => k.trim()).filter(Boolean),
  strategy: ((import.meta.env.VITE_HIERARCHY_STRATEGY as string | undefined) ?? 'LABEL_BASED') as HierarchyStrategy,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      jiraHost: ENV.host,
      jiraEmail: ENV.email,
      jiraApiToken: ENV.token,
      projectKeys: ENV.projectKeys,
      hierarchyStrategy: ENV.strategy,
      filters: DEFAULT_FILTERS,

      setJiraConfig: (config) => set((state) => ({ ...state, ...config })),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set((state) => ({ ...state, filters: DEFAULT_FILTERS })),
    }),
    {
      name: 'jira-roadmap-config',
      version: 4,
      // Only persist credentials + project keys. Strategy always defaults to env var
      // so a bad localStorage value can never break the app.
      partialize: (state) => ({
        jiraHost: state.jiraHost,
        jiraEmail: state.jiraEmail,
        jiraApiToken: state.jiraApiToken,
        projectKeys: state.projectKeys,
        hierarchyStrategy: state.hierarchyStrategy,
        filters: state.filters,
      }),
      migrate: (_persisted, _version) => ({
        jiraHost: ENV.host,
        jiraEmail: ENV.email,
        jiraApiToken: ENV.token,
        projectKeys: ENV.projectKeys,
        hierarchyStrategy: ENV.strategy,
        filters: DEFAULT_FILTERS,
      } as ConfigState),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Correct stale values that env vars would override
        if (!state.jiraHost) state.jiraHost = ENV.host;
        if (!state.jiraEmail) state.jiraEmail = ENV.email;
        if (!state.jiraApiToken) state.jiraApiToken = ENV.token;
        if (!state.projectKeys?.length) state.projectKeys = ENV.projectKeys;
        // Strategy: if stored value is JIRA_PREMIUM but env says LABEL_BASED, fix it
        if (state.hierarchyStrategy === 'JIRA_PREMIUM' && ENV.strategy !== 'JIRA_PREMIUM') {
          state.hierarchyStrategy = ENV.strategy;
        }
      },
    }
  )
);

// Runtime guard: fix bad in-memory state immediately after module loads.
// This catches the case where onRehydrateStorage mutation didn't stick.
queueMicrotask(() => {
  const s = useConfigStore.getState();
  const fixes: Partial<ConfigState> = {};
  if (!s.jiraHost) fixes.jiraHost = ENV.host;
  if (!s.jiraEmail) fixes.jiraEmail = ENV.email;
  if (!s.jiraApiToken) fixes.jiraApiToken = ENV.token;
  if (!s.projectKeys?.length) fixes.projectKeys = ENV.projectKeys;
  if (s.hierarchyStrategy === 'JIRA_PREMIUM' && ENV.strategy !== 'JIRA_PREMIUM') {
    fixes.hierarchyStrategy = ENV.strategy;
  }
  if (Object.keys(fixes).length > 0) {
    useConfigStore.setState(fixes);
  }
});
