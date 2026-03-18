import { useState } from 'react';
import { Card, Text, Button, LinearProgress, StackLayout, Tag } from '@salt-ds/core';
import { SprintStoriesGrid } from './SprintStoriesGrid';
import { sprintDaysRemaining, sprintProgress, formatSprintPeriod } from '@/utils/date.utils';
import type { Sprint, Story } from '@/types';

interface SprintTeamCardProps {
  sprint: Sprint;
  stories: Story[];
  loading: boolean;
}

function computeStats(stories: Story[]) {
  const committed = stories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);
  const delivered = stories
    .filter((st) => st.status === 'DONE')
    .reduce((s, st) => s + (st.storyPoints ?? 0), 0);
  const inProgress = stories
    .filter((st) => st.status === 'IN_PROGRESS')
    .reduce((s, st) => s + (st.storyPoints ?? 0), 0);
  const carriedCount = stories.filter((st) => st.timesCarried >= 1).length;
  const carriedHeavy = stories.filter((st) => st.timesCarried >= 2).length;

  // Health: delivery ratio, penalised by heavy carry-overs
  const deliveryRatio = committed > 0 ? (delivered / committed) * 100 : 0;
  const healthScore = Math.round(Math.max(0, Math.min(100, deliveryRatio - carriedHeavy * 10)));

  return { committed, delivered, inProgress, carriedCount, healthScore };
}

function HealthTag({ score }: { score: number }) {
  if (score >= 80)
    return (
      <Tag variant="secondary" style={{ background: 'var(--salt-status-success-background)', color: 'var(--salt-status-success-foreground)', fontSize: 11 }}>
        {score} Healthy
      </Tag>
    );
  if (score >= 60)
    return (
      <Tag variant="secondary" style={{ background: 'var(--salt-status-warning-background)', color: 'var(--salt-status-warning-foreground)', fontSize: 11 }}>
        {score} At Risk
      </Tag>
    );
  return (
    <Tag variant="secondary" style={{ background: 'var(--salt-status-error-background)', color: 'var(--salt-status-error-foreground)', fontSize: 11 }}>
      {score} Slipping
    </Tag>
  );
}

export const SprintTeamCard = ({ sprint, stories, loading }: SprintTeamCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { committed, delivered, inProgress, carriedCount, healthScore } = computeStats(stories);
  const daysRemaining = sprintDaysRemaining(sprint.endDate);
  const timeProgress = sprintProgress(sprint.startDate, sprint.endDate);
  const pointsProgress = committed > 0 ? Math.round((delivered / committed) * 100) : 0;
  const period = sprint.startDate && sprint.endDate
    ? formatSprintPeriod(sprint.startDate, sprint.endDate)
    : '';

  return (
    <div>
      <Card style={{ padding: 'var(--salt-spacing-200)' }}>
        <StackLayout gap={1.5}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text styleAs="h3" style={{ fontWeight: 600 }}>
                {sprint.teamName || sprint.name}
              </Text>
              <Text styleAs="label" color="secondary">
                {sprint.name}
              </Text>
            </div>
            <HealthTag score={healthScore} />
          </div>

          {/* Dates */}
          {period && (
            <Text styleAs="label" color="secondary">
              {period} · {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Sprint ended'}
            </Text>
          )}

          {/* Sprint time progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text styleAs="label" color="secondary" style={{ fontSize: 11 }}>
                Sprint time elapsed
              </Text>
              <Text styleAs="label" color="secondary" style={{ fontSize: 11 }}>
                {timeProgress}%
              </Text>
            </div>
            <LinearProgress value={timeProgress} hideLabel aria-label="Sprint time elapsed" />
          </div>

          {/* Points progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text styleAs="label" color="secondary" style={{ fontSize: 11 }}>
                Points delivered
              </Text>
              <Text styleAs="label" color="secondary" style={{ fontSize: 11 }}>
                {delivered} / {committed} pts
              </Text>
            </div>
            <LinearProgress value={pointsProgress} hideLabel aria-label="Points delivered" />
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'var(--salt-spacing-200)', flexWrap: 'wrap' }}>
            <Text styleAs="label">
              <strong>{committed}</strong> pts committed
            </Text>
            <Text styleAs="label">
              <strong>{delivered}</strong> done
            </Text>
            <Text styleAs="label">
              <strong>{inProgress}</strong> in progress
            </Text>
            {carriedCount > 0 && (
              <Text styleAs="label" style={{ color: 'var(--salt-status-warning-foreground)' }}>
                <strong>{carriedCount}</strong> carried over
              </Text>
            )}
            {sprint.goal && (
              <Text styleAs="label" color="secondary" style={{ fontStyle: 'italic', width: '100%' }}>
                Goal: {sprint.goal}
              </Text>
            )}
          </div>

          {/* Expand button */}
          <Button
            variant="secondary"
            onClick={() => setExpanded((e) => !e)}
            disabled={loading}
            style={{ alignSelf: 'flex-start' }}
          >
            {expanded ? 'Hide Stories' : `Show ${stories.length} Stories`}
          </Button>
        </StackLayout>
      </Card>

      {/* Story grid (below card when expanded) */}
      {expanded && (
        <div style={{ marginTop: 4 }}>
          <SprintStoriesGrid stories={stories} loading={loading} />
        </div>
      )}
    </div>
  );
};
