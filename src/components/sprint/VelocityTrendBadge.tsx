interface VelocityTrendBadgeProps {
  trend: 'UP' | 'DOWN' | 'STABLE';
  thisPoints: number;
  lastPoints: number;
}

const TREND_CONFIG = {
  UP: {
    arrow: '↑',
    label: 'Up',
    color: 'var(--salt-status-success-foreground)',
    bg: 'var(--salt-status-success-background)',
  },
  DOWN: {
    arrow: '↓',
    label: 'Down',
    color: 'var(--salt-status-error-foreground)',
    bg: 'var(--salt-status-error-background)',
  },
  STABLE: {
    arrow: '→',
    label: 'Stable',
    color: 'var(--salt-status-info-foreground)',
    bg: 'var(--salt-color-background)',
  },
} as const;

export const VelocityTrendBadge = ({ trend, thisPoints, lastPoints }: VelocityTrendBadgeProps) => {
  const cfg = TREND_CONFIG[trend];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 12,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${cfg.color}`,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{cfg.arrow}</span>
      <span>
        Velocity {cfg.label} — {thisPoints}pts{lastPoints > 0 ? ` (last: ${lastPoints}pts)` : ''}
      </span>
    </div>
  );
};
