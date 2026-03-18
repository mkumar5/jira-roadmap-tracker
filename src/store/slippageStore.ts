import { create } from 'zustand';
import type { SlippageSeverity } from '@/types';

interface SlippageFilters {
  severity: SlippageSeverity[];
  issueTypes: string[];
  teams: string[];
  projectKeys: string[];
  searchText: string;
}

interface SlippageState {
  filters: SlippageFilters;
  atRiskDays: number;
  alertThreshold: SlippageSeverity;
  setFilters: (f: Partial<SlippageFilters>) => void;
  setSeverityFilter: (severities: SlippageSeverity[]) => void;
  setAtRiskDays: (days: number) => void;
  setAlertThreshold: (threshold: SlippageSeverity) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: SlippageFilters = {
  severity: [],
  issueTypes: [],
  teams: [],
  projectKeys: [],
  searchText: '',
};

export const useSlippageStore = create<SlippageState>()((set) => ({
  filters: DEFAULT_FILTERS,
  atRiskDays: 14,
  alertThreshold: 'MEDIUM',

  setFilters: (f) =>
    set((state) => ({ filters: { ...state.filters, ...f } })),

  setSeverityFilter: (severities) =>
    set((state) => ({ filters: { ...state.filters, severity: severities } })),

  setAtRiskDays: (days) => set({ atRiskDays: days }),

  setAlertThreshold: (threshold) => set({ alertThreshold: threshold }),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
