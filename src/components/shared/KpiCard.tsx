import { Text, StackLayout } from '@salt-ds/core';

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

const ACCENT_COLOR = {
  positive: 'var(--salt-status-success-foreground)',
  negative: 'var(--salt-status-error-foreground)',
  warning: 'var(--salt-status-warning-foreground)',
  neutral: 'var(--salt-color-blue-400)',
} as const;

const ACCENT_BG = {
  positive: 'rgba(0, 150, 80, 0.06)',
  negative: 'rgba(200, 30, 30, 0.06)',
  warning: 'rgba(200, 130, 0, 0.06)',
  neutral: 'transparent',
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
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--salt-color-background)',
        border: '1px solid var(--salt-separable-primary-borderColor)',
        borderRadius: 8,
        padding: `var(--salt-spacing-150) var(--salt-spacing-150) var(--salt-spacing-150) calc(var(--salt-spacing-150) + 3px)`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: onClick ? 'box-shadow 0.15s ease, transform 0.1s ease' : undefined,
        backgroundColor: ACCENT_BG[color],
      }}
      onMouseEnter={onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      } : undefined}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: ACCENT_COLOR[color],
          borderRadius: '8px 0 0 8px',
        }}
      />

      <StackLayout gap={0.5} direction="column">
        <Text
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--salt-color-foreground-secondary)',
          }}
        >
          {title}
        </Text>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1,
              color: VALUE_COLOR[color],
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </span>
          {unit && (
            <Text style={{ fontSize: 13, color: 'var(--salt-color-foreground-secondary)' }}>
              {unit}
            </Text>
          )}
        </div>

        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: TREND_COLOR[trend], fontWeight: 700, fontSize: 12 }}>
              {TREND_ARROW[trend]}
            </span>
            {trendLabel && (
              <Text style={{ fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>
                {trendLabel}
              </Text>
            )}
          </div>
        )}
      </StackLayout>
    </div>
  );
};
