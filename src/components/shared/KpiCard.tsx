import { InteractableCard, Text, StackLayout } from '@salt-ds/core';

interface KpiCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  color?: 'positive' | 'negative' | 'warning' | 'neutral';
  onClick?: () => void;
}

const VALUE_COLOR = {
  positive: 'var(--salt-status-success-foreground)',
  negative: 'var(--salt-status-error-foreground)',
  warning: 'var(--salt-status-warning-foreground)',
  neutral: 'var(--salt-color-foreground)',
} as const;

const TREND_ARROW = { up: '↑', down: '↓', stable: '→' };
const TREND_COLOR = {
  up: 'var(--salt-status-success-foreground)',
  down: 'var(--salt-status-error-foreground)',
  stable: 'var(--salt-color-foreground-secondary)',
};

export const KpiCard = ({
  title,
  value,
  unit,
  trend,
  trendLabel,
  color = 'neutral',
  onClick,
}: KpiCardProps) => {
  return (
    <InteractableCard
      accent="top"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', padding: 'var(--salt-spacing-100)' }}
    >
      <StackLayout gap={0.5} direction="column">
        <Text styleAs="label" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10, fontWeight: 700 }}>
          {title}
        </Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--salt-spacing-25)' }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1,
              color: VALUE_COLOR[color],
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </span>
          {unit && (
            <Text styleAs="label" color="secondary">
              {unit}
            </Text>
          )}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--salt-spacing-25)' }}>
            <span style={{ color: TREND_COLOR[trend], fontWeight: 700, fontSize: 12 }}>
              {TREND_ARROW[trend]}
            </span>
            {trendLabel && (
              <Text styleAs="label" color="secondary" style={{ fontSize: 11 }}>
                {trendLabel}
              </Text>
            )}
          </div>
        )}
      </StackLayout>
    </InteractableCard>
  );
};
