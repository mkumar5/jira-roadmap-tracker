import { Text } from '@salt-ds/core';
import type { SlippedItem, SlippageSeverity } from '@/types';

interface SlippageSummaryBannerProps {
  items: SlippedItem[];
  atRiskCount: number;
  activeSeverities: SlippageSeverity[];
  onSeverityClick: (severity: SlippageSeverity) => void;
}

interface SeverityChipConfig {
  severity: SlippageSeverity;
  label: string;
  color: string;
  bg: string;
}

const SEVERITY_CHIPS: SeverityChipConfig[] = [
  { severity: 'CRITICAL', label: 'Critical', color: 'var(--salt-status-error-foreground)', bg: 'var(--salt-status-error-background)' },
  { severity: 'HIGH',     label: 'High',     color: 'var(--salt-color-orange-700)',        bg: '#fff3eb' },
  { severity: 'MEDIUM',   label: 'Medium',   color: 'var(--salt-status-warning-foreground)', bg: 'var(--salt-status-warning-background)' },
  { severity: 'LOW',      label: 'At Risk',  color: 'var(--salt-color-blue-600)',           bg: 'var(--salt-color-blue-10)' },
];

export const SlippageSummaryBanner = ({
  items,
  atRiskCount,
  activeSeverities,
  onSeverityClick,
}: SlippageSummaryBannerProps) => {
  const counts = Object.fromEntries(
    SEVERITY_CHIPS.map(({ severity }) => [
      severity,
      items.filter((i) => i.slippageSeverity === severity).length,
    ])
  ) as Record<SlippageSeverity, number>;

  const totalSlipped = items.length;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--salt-spacing-200)',
        padding: 'var(--salt-spacing-150) var(--salt-spacing-200)',
        background: 'var(--salt-color-background)',
        border: '1px solid var(--salt-separable-primary-borderColor)',
        borderRadius: 4,
        flexWrap: 'wrap',
      }}
      role="region"
      aria-label="Slippage summary"
    >
      <Text styleAs="label" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        {totalSlipped} slipped · {atRiskCount} at risk
      </Text>

      <div style={{ width: 1, height: 20, background: 'var(--salt-separable-primary-borderColor)' }} />

      {SEVERITY_CHIPS.map(({ severity, label, color, bg }) => {
        const count = counts[severity] ?? 0;
        const isActive = activeSeverities.includes(severity);
        return (
          <button
            key={severity}
            onClick={() => onSeverityClick(severity)}
            aria-pressed={isActive}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 12,
              border: `2px solid ${isActive ? color : 'transparent'}`,
              background: isActive ? bg : 'transparent',
              color,
              cursor: 'pointer',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              transition: 'all 0.15s',
            }}
            title={`Filter by ${label}`}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {count} {label}
          </button>
        );
      })}
    </div>
  );
};
