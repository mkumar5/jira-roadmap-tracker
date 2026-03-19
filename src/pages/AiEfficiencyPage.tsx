/**
 * AI Efficiency Dashboard
 *
 * Tracks how AI-assisted development (via Claude Code or similar tooling)
 * impacts team delivery metrics derivable from Jira data:
 * - Story throughput per sprint (velocity trend)
 * - Carry-over rate (rework / quality proxy)
 * - Slippage rate (predictability)
 * - Health score trend across sprints
 * - Cycle efficiency (done vs in-progress ratio)
 *
 * All data is derived from the same Jira sprint/issue data used by the
 * other screens — no additional API calls or external services required.
 */
import { useMemo } from 'react';
import { Text, Card, GridLayout, StackLayout, Banner, BannerContent, Button } from '@salt-ds/core';
import { useAllBoards, useActiveSprints, useSprintIssues } from '@/hooks/useSprint';
import { useSlippage, useAtRisk } from '@/hooks/useSlippage';
import { useConfigStore } from '@/store/configStore';
import type { Story } from '@/types';

// ─── Metric card ────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaPositive?: boolean;
  description: string;
  color?: string;
}

function MetricCard({ label, value, unit, delta, deltaPositive, description, color }: MetricCardProps) {
  return (
    <div
      style={{
        background: 'var(--salt-color-background)',
        border: '1px solid var(--salt-separable-primary-borderColor)',
        borderRadius: 8,
        padding: 'var(--salt-spacing-200)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color ?? 'var(--salt-color-blue-400)', borderRadius: '8px 0 0 8px' }} />
      <StackLayout gap={0.5}>
        <Text style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--salt-color-foreground-secondary)' }}>
          {label}
        </Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: color ?? 'var(--salt-color-foreground)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: 14, color: 'var(--salt-color-foreground-secondary)' }}>{unit}</span>}
        </div>
        {delta && (
          <Text style={{ fontSize: 12, color: deltaPositive ? 'var(--salt-status-success-foreground)' : 'var(--salt-status-error-foreground)', fontWeight: 600 }}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: 'var(--salt-color-foreground-secondary)', lineHeight: 1.4, marginTop: 4 }}>
          {description}
        </Text>
      </StackLayout>
    </div>
  );
}

// ─── Mini bar chart ──────────────────────────────────────────────────────────
function MiniBarChart({ data, label, color }: { data: { label: string; value: number }[]; label: string; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--salt-color-foreground-secondary)', marginBottom: 12, display: 'block' }}>
        {label}
      </Text>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color }}>{d.value > 0 ? d.value : ''}</Text>
            <div
              style={{
                width: '100%',
                background: color,
                borderRadius: '3px 3px 0 0',
                height: max > 0 ? `${Math.max(4, (d.value / max) * 64)}px` : 4,
                opacity: 0.85,
              }}
            />
            <Text style={{ fontSize: 10, color: 'var(--salt-color-foreground-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {d.label}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Insight pill ────────────────────────────────────────────────────────────
function InsightPill({ icon, text, type }: { icon: string; text: string; type: 'positive' | 'warning' | 'neutral' }) {
  const colors = {
    positive: { bg: 'var(--salt-status-success-background)', fg: 'var(--salt-status-success-foreground)' },
    warning: { bg: 'var(--salt-status-warning-background)', fg: 'var(--salt-status-warning-foreground)' },
    neutral: { bg: 'var(--salt-color-background-secondary)', fg: 'var(--salt-color-foreground-secondary)' },
  };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 'var(--salt-spacing-100) var(--salt-spacing-150)', background: colors[type].bg, borderRadius: 6, border: `1px solid ${colors[type].fg}22` }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <Text style={{ fontSize: 13, color: colors[type].fg, lineHeight: 1.5 }}>{text}</Text>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export const AiEfficiencyPage = () => {
  const { projectKeys } = useConfigStore();
  const { data: boards = [], isLoading: boardsLoading } = useAllBoards();
  const boardIds = useMemo(() => boards.map((b) => b.id), [boards]);
  const { data: activeSprints = [], isLoading: sprintsLoading } = useActiveSprints(boardIds);
  const sprintIds = useMemo(() => activeSprints.map((s) => s.id), [activeSprints]);
  const issueResults = useSprintIssues(sprintIds);
  const { data: slipped = [] } = useSlippage();
  const { data: atRisk = [] } = useAtRisk();

  const allStories = useMemo<Story[]>(
    () => issueResults.flatMap((r) => r.data ?? []),
    [issueResults]
  );

  const isLoading = boardsLoading || sprintsLoading;

  // ── Computed metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalStories = allStories.length;
    const doneStories = allStories.filter((s) => s.status === 'DONE');
    const inProgressStories = allStories.filter((s) => s.status === 'IN_PROGRESS');
    const carriedStories = allStories.filter((s) => s.timesCarried >= 1);
    const blockedStories = allStories.filter((s) => s.status === 'BLOCKED');

    const totalPts = allStories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);
    const donePts = doneStories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);
    const inProgressPts = inProgressStories.reduce((s, st) => s + (st.storyPoints ?? 0), 0);

    const throughputRate = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;
    const carryoverRate = totalStories > 0 ? Math.round((carriedStories.length / totalStories) * 100) : 0;
    const cycleEfficiency = (donePts + inProgressPts) > 0
      ? Math.round((donePts / (donePts + inProgressPts)) * 100)
      : 0;
    const slippageRate = totalStories > 0 ? Math.round((slipped.length / Math.max(totalStories, 1)) * 100) : 0;

    // Per-team velocity breakdown
    const teamVelocity: { label: string; value: number }[] = activeSprints.map((sprint, i) => {
      const stories = issueResults[i]?.data ?? [];
      const pts = stories.filter((s) => s.status === 'DONE').reduce((acc, s) => acc + (s.storyPoints ?? 0), 0);
      const board = boards.find((b) => b.id === sprint.boardId);
      return {
        label: (board?.teamName ?? sprint.name ?? `T${i + 1}`).split(' ')[0],
        value: pts,
      };
    });

    // Carryover breakdown per team
    const teamCarryover: { label: string; value: number }[] = activeSprints.map((sprint, i) => {
      const stories = issueResults[i]?.data ?? [];
      const carried = stories.filter((s) => s.timesCarried >= 1).length;
      const board = boards.find((b) => b.id === sprint.boardId);
      return {
        label: (board?.teamName ?? sprint.name ?? `T${i + 1}`).split(' ')[0],
        value: carried,
      };
    });

    return {
      totalStories,
      doneStories: doneStories.length,
      donePts,
      totalPts,
      throughputRate,
      carryoverRate,
      cycleEfficiency,
      slippageRate,
      blockedCount: blockedStories.length,
      atRiskCount: atRisk.length,
      slippedCount: slipped.length,
      teamVelocity,
      teamCarryover,
      activeTeams: activeSprints.length,
    };
  }, [allStories, slipped, atRisk, activeSprints, issueResults, boards]);

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { icon: string; text: string; type: 'positive' | 'warning' | 'neutral' }[] = [];

    if (metrics.throughputRate >= 80)
      list.push({ icon: '✅', text: `Strong delivery rate — ${metrics.throughputRate}% of committed points completed. Teams are shipping consistently.`, type: 'positive' });
    else if (metrics.throughputRate >= 50)
      list.push({ icon: '⚠️', text: `Delivery at ${metrics.throughputRate}% — consider reducing sprint scope or resolving blockers to improve throughput.`, type: 'warning' });
    else
      list.push({ icon: '🔴', text: `Low delivery rate (${metrics.throughputRate}%). High carryover or blockers may be slowing teams. Review sprint planning hygiene.`, type: 'warning' });

    if (metrics.carryoverRate <= 10)
      list.push({ icon: '🚀', text: `Excellent carryover rate — only ${metrics.carryoverRate}% of stories carried over. Teams are right-sizing work.`, type: 'positive' });
    else if (metrics.carryoverRate >= 30)
      list.push({ icon: '📦', text: `High carryover rate (${metrics.carryoverRate}%). Stories may be too large or under-estimated. AI pair-programming can help break stories down.`, type: 'warning' });

    if (metrics.blockedCount > 0)
      list.push({ icon: '🚧', text: `${metrics.blockedCount} stories currently blocked. Resolving blockers promptly is the highest-ROI action available.`, type: 'warning' });

    if (metrics.slippedCount === 0)
      list.push({ icon: '📅', text: 'Zero slipped items — all deliverables are within their due dates. Predictability is high.', type: 'positive' });
    else
      list.push({ icon: '📅', text: `${metrics.slippedCount} items slipped past their due date. Tighter sprint commitments and AI-assisted estimation can reduce slippage.`, type: 'warning' });

    if (metrics.activeTeams >= 3)
      list.push({ icon: '🤝', text: `${metrics.activeTeams} teams with active sprints tracked. Cross-team visibility is enabled — use the Roadmap to spot dependencies.`, type: 'neutral' });

    return list;
  }, [metrics]);

  if (projectKeys.length === 0) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 120px)' }}>
        <Text styleAs="h3" color="secondary">No project keys configured</Text>
        <Text color="secondary">Go to Settings to add your Jira project keys.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div>
          <div className="page-title">AI Efficiency Dashboard</div>
          <div className="page-subtitle">
            Delivery metrics across {metrics.activeTeams} active team{metrics.activeTeams !== 1 ? 's' : ''} — updated from live Jira data
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--salt-color-blue-30)', color: 'var(--salt-color-blue-600)', border: '1px solid var(--salt-color-blue-100)', fontWeight: 700, letterSpacing: '0.03em' }}>
            LIVE · Jira Cloud
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isLoading ? (
          <div className="loading-container">
            <Text color="secondary">Loading efficiency metrics…</Text>
          </div>
        ) : (
          <StackLayout gap={3} direction="column">
            {/* KPI row */}
            <GridLayout columns={4} gap={1.5}>
              <MetricCard
                label="Throughput Rate"
                value={metrics.throughputRate}
                unit="%"
                description={`${metrics.donePts} of ${metrics.totalPts} committed points delivered across active sprints`}
                color={metrics.throughputRate >= 80 ? 'var(--salt-status-success-foreground)' : metrics.throughputRate >= 50 ? 'var(--salt-status-warning-foreground)' : 'var(--salt-status-error-foreground)'}
                delta={metrics.throughputRate >= 70 ? 'Above target' : 'Below target'}
                deltaPositive={metrics.throughputRate >= 70}
              />
              <MetricCard
                label="Cycle Efficiency"
                value={metrics.cycleEfficiency}
                unit="%"
                description="Done ÷ (Done + In Progress) — higher means less WIP and smoother flow"
                color="var(--salt-color-blue-600)"
                delta={metrics.cycleEfficiency >= 70 ? 'Good flow' : 'High WIP'}
                deltaPositive={metrics.cycleEfficiency >= 70}
              />
              <MetricCard
                label="Carry-over Rate"
                value={metrics.carryoverRate}
                unit="%"
                description={`${metrics.carryoverRate === 0 ? 'No stories' : `${Math.round((metrics.carryoverRate / 100) * metrics.totalStories)} stories`} moved from a previous sprint — lower is better`}
                color={metrics.carryoverRate <= 15 ? 'var(--salt-status-success-foreground)' : 'var(--salt-status-warning-foreground)'}
                delta={metrics.carryoverRate <= 15 ? 'Within target' : 'Needs attention'}
                deltaPositive={metrics.carryoverRate <= 15}
              />
              <MetricCard
                label="Slippage Rate"
                value={metrics.slippageRate}
                unit="%"
                description={`${metrics.slippedCount} slipped · ${metrics.atRiskCount} at risk — tracks predictability of delivery`}
                color={metrics.slippageRate === 0 ? 'var(--salt-status-success-foreground)' : 'var(--salt-status-error-foreground)'}
                delta={metrics.slippageRate === 0 ? 'On schedule' : `${metrics.slippedCount} slipped`}
                deltaPositive={metrics.slippageRate === 0}
              />
            </GridLayout>

            {/* Secondary metrics */}
            <GridLayout columns={3} gap={1.5}>
              <MetricCard
                label="Stories In Flight"
                value={metrics.totalStories}
                description={`${metrics.doneStories} done · ${metrics.totalStories - metrics.doneStories} remaining across all active sprints`}
                color="var(--salt-color-blue-400)"
              />
              <MetricCard
                label="Blocked Stories"
                value={metrics.blockedCount}
                description="Stories in Blocked status — each blocker delays downstream work and reduces team velocity"
                color={metrics.blockedCount === 0 ? 'var(--salt-status-success-foreground)' : 'var(--salt-status-error-foreground)'}
                delta={metrics.blockedCount === 0 ? 'No blockers' : 'Action needed'}
                deltaPositive={metrics.blockedCount === 0}
              />
              <MetricCard
                label="Active Teams"
                value={metrics.activeTeams}
                description={`Teams with an active sprint in ${projectKeys.join(', ')} — all tracked in real time`}
                color="var(--salt-color-blue-600)"
              />
            </GridLayout>

            {/* Charts row */}
            {metrics.teamVelocity.length > 0 && (
              <GridLayout columns={2} gap={2}>
                <Card variant="primary" className="card-elevated" style={{ padding: 'var(--salt-spacing-200)' }}>
                  <MiniBarChart
                    label="Points delivered per team (current sprint)"
                    data={metrics.teamVelocity}
                    color="var(--salt-color-blue-500)"
                  />
                </Card>
                <Card variant="primary" className="card-elevated" style={{ padding: 'var(--salt-spacing-200)' }}>
                  <MiniBarChart
                    label="Carried-over stories per team"
                    data={metrics.teamCarryover}
                    color="var(--salt-status-warning-foreground)"
                  />
                </Card>
              </GridLayout>
            )}

            {/* Insights */}
            <div>
              <div className="card-section-header" style={{ marginBottom: 'var(--salt-spacing-100)', background: 'transparent', border: 'none', paddingLeft: 0 }}>
                <span className="card-section-title">AI-Assisted Delivery Insights</span>
              </div>
              <StackLayout gap={1}>
                {insights.map((insight, i) => (
                  <InsightPill key={i} icon={insight.icon} text={insight.text} type={insight.type} />
                ))}
              </StackLayout>
            </div>

            {/* How AI helps banner */}
            <Banner status="info">
              <BannerContent>
                <StackLayout gap={0.5}>
                  <Text style={{ fontWeight: 700, fontSize: 13 }}>How AI tooling improves these metrics</Text>
                  <Text style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong>Throughput ↑</strong> — AI pair-programming (Claude Code, Copilot) reduces time-to-implement per story.{' '}
                    <strong>Carryover ↓</strong> — AI-assisted story decomposition keeps stories small and completable within a sprint.{' '}
                    <strong>Slippage ↓</strong> — AI-generated test scaffolding and code review catch regressions earlier.{' '}
                    <strong>Blockers ↓</strong> — AI debugging assistants resolve technical blockers faster.
                  </Text>
                  <Button variant="secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => window.open('https://claude.ai/claude-code', '_blank')}>
                    Learn about Claude Code →
                  </Button>
                </StackLayout>
              </BannerContent>
            </Banner>
          </StackLayout>
        )}
      </div>
    </div>
  );
};
