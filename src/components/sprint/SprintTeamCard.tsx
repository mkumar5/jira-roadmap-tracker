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
  const daysRemaining = sprint.endDate ? sprintDaysRemaining(sprint.endDate) : 0;
  const timeProgress = sprint.startDate && sprint.endDate ? sprintProgress(sprint.startDate, sprint.endDate) : 0;
  const pointsProgress = committed > 0 ? Math.round((delivered / committed) * 100) : 0;
  const period = sprint.startDate && sprint.endDate
    ? formatSprintPeriod(sprint.startDate, sprint.endDate)
    : '';

  return (
    <div>
      <Card className="card-elevated" style={{ padding: 'var(--salt-spacing-200)' }}>
        <StackLayout gap={2}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>
                {sprint.teamName || sprint.name}
              </Text>
              <Text style={{ fontSize: 13, color: 'var(--salt-color-foreground-secondary)', marginTop: 2 }}>
                {sprint.name}
              </Text>
            </div>
            <HealthTag score={healthScore} />
          </div>

          {/* Dates */}
          {period && (
            <Text style={{ fontSize: 13, color: 'var(--salt-color-foreground-secondary)' }}>
              {period} · {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Sprint ended'}
            </Text>
          )}

          {/* Sprint time progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', fontWeight: 500 }}>
                Sprint time elapsed
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', fontWeight: 600 }}>
                {timeProgress}%
              </Text>
            </div>
            <LinearProgress value={timeProgress} hideLabel aria-label="Sprint time elapsed" />
          </div>

          {/* Points progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', fontWeight: 500 }}>
                Points delivered
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', fontWeight: 600 }}>
                {delivered} / {committed} pts
              </Text>
            </div>
            <LinearProgress value={pointsProgress} hideLabel aria-label="Points delivered" />
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 'var(--salt-spacing-200)', flexWrap: 'wrap', padding: 'var(--salt-spacing-100) 0', borderTop: '1px solid var(--salt-separable-primary-borderColor)' }}>
            <span style={{ fontSize: 13 }}>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{committed}</strong>
              <span style={{ color: 'var(--salt-color-foreground-secondary)', marginLeft: 4 }}>committed</span>
            </span>
            <span style={{ fontSize: 13 }}>
              <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--salt-status-success-foreground)' }}>{delivered}</strong>
              <span style={{ color: 'var(--salt-color-foreground-secondary)', marginLeft: 4 }}>done</span>
            </span>
            <span style={{ fontSize: 13 }}>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{inProgress}</strong>
              <span style={{ color: 'var(--salt-color-foreground-secondary)', marginLeft: 4 }}>in progress</span>
            </span>
            {carriedCount > 0 && (
              <span style={{ fontSize: 13, color: 'var(--salt-status-warning-foreground)' }}>
                <strong>{carriedCount}</strong>
                <span style={{ marginLeft: 4 }}>carried over</span>
              </span>
            )}
            {sprint.goal && (
              <span style={{ fontSize: 13, color: 'var(--salt-color-foreground-secondary)', fontStyle: 'italic', width: '100%' }}>
                Goal: {sprint.goal}
              </span>
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
