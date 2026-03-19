interface HealthScoreGaugeProps {
  score: number; // 0–100
  label?: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--salt-status-success-foreground)';
  if (score >= 60) return 'var(--salt-status-warning-foreground)';
  return 'var(--salt-status-error-foreground)';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'var(--salt-status-success-background)';
  if (score >= 60) return 'var(--salt-status-warning-background)';
  return 'var(--salt-status-error-background)';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'At Risk';
  return 'Critical';
}

export const HealthScoreGauge = ({ score, label }: HealthScoreGaugeProps) => {
  const color = scoreColor(score);
  const bg = scoreBg(score);
  const displayLabel = label ?? scoreLabel(score);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--salt-spacing-200)',
        padding: 'var(--salt-spacing-150) var(--salt-spacing-200)',
        background: bg,
        borderRadius: 6,
        border: `1px solid ${color}`,
      }}
    >
      {/* Circular score badge */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontWeight: 700,
          fontSize: 18,
          color,
          background: 'var(--salt-color-background)',
        }}
      >
        {score}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color, fontWeight: 600, marginBottom: 4 }}>
          {displayLabel}
        </div>
        {/* Progress bar */}
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: 'var(--salt-separable-primary-borderColor)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              background: color,
              borderRadius: 4,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color, marginTop: 2 }}>{score}/100</div>
      </div>
    </div>
  );
};
