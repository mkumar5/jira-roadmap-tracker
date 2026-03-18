import type { FC } from 'react';
import type { SlippageSeverity } from '@/types';
import { getSeverityLabel, getSeverityClassName } from '@/utils/slippage.utils';

interface SeverityBadgeProps {
  severity: SlippageSeverity;
  showDot?: boolean;
}

export const SeverityBadge: FC<SeverityBadgeProps> = ({ severity, showDot = false }) => (
  <span className={getSeverityClassName(severity)} aria-label={`Severity: ${getSeverityLabel(severity)}`}>
    {showDot && (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'currentColor',
          marginRight: 6,
        }}
      />
    )}
    {getSeverityLabel(severity)}
  </span>
);
