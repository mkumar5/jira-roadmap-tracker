import type { Story, Epic, Sprint, SlippedItem, AtRiskItem } from './roadmap.types';

export interface SprintReport {
  sprint: Sprint;
  teamName: string;
  generatedAt: string; // ISO timestamp

  delivered: {
    count: number;
    storyPoints: number;
    items: Story[];
  };

  carriedOver: {
    count: number;
    storyPoints: number;
    items: Array<Story & { timesCarried: number }>;
  };

  nextSprintCommitted: {
    count: number;
    storyPoints: number;
    items: Story[];
  };

  slippedEpics: Array<Epic & { daysPastDue: number }>;

  atRisk: {
    count: number;
    items: AtRiskItem[];
  };

  velocityTrend: {
    thisSprintPoints: number;
    lastSprintPoints: number;
    averageLast4Sprints: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };

  healthScore: number; // 0–100, see reporter agent for algorithm
}

export interface TeamSummary {
  teamName: string;
  healthScore: number;
  activeSprintName: string | null;
  deliveredPoints: number;
  carriedCount: number;
  boardId: number;
}

export interface ExecutiveSummary {
  asOf: string; // ISO timestamp
  overallHealthScore: number; // 0–100

  initiativeSummary: {
    total: number;
    onTrack: number;
    atRisk: number;
    slipped: number;
    done: number;
  };

  teamSummaries: TeamSummary[];

  topSlippedItems: SlippedItem[]; // top 10 most critical
  upcomingDeadlines: AtRiskItem[]; // due in next 14 days

  keyMetrics: {
    totalPointsDeliveredThisSprint: number;
    totalSlippedItems: number;
    averageCarryoverRate: number; // % stories carried per sprint
    percentInitiativesOnTrack: number;
  };
}
