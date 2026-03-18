import type { JiraSprint } from '@/types';

const today = new Date();
const fmt = (d: Date) => d.toISOString();

const sprintStart = new Date(today);
sprintStart.setDate(sprintStart.getDate() - 7); // started 7 days ago

const sprintEnd = new Date(today);
sprintEnd.setDate(sprintEnd.getDate() + 7); // ends in 7 days

export const sprintsFixture: JiraSprint[] = [
  {
    id: 101,
    state: 'active',
    name: 'Team Alpha Sprint 24',
    startDate: fmt(sprintStart),
    endDate: fmt(sprintEnd),
    boardId: 1,
    goal: 'Complete platform auth migration',
  },
  {
    id: 102,
    state: 'active',
    name: 'Team Beta Sprint 24',
    startDate: fmt(sprintStart),
    endDate: fmt(sprintEnd),
    boardId: 2,
    goal: 'Ship mobile redesign v1',
  },
];
