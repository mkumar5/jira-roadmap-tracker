import { Text } from '@salt-ds/core';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import type { SlippedItem } from '@/types';

interface TopSlippedListProps {
  items: SlippedItem[];
}

export const TopSlippedList = ({ items }: TopSlippedListProps) => {
  if (items.length === 0) {
    return (
      <div style={{ padding: 'var(--salt-spacing-300)', textAlign: 'center' }}>
        <Text color="secondary">No slipped items — all on track!</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.slice(0, 10).map((item, idx) => (
        <div
          key={item.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--salt-spacing-150)',
            padding: 'var(--salt-spacing-100) var(--salt-spacing-150)',
            borderBottom: '1px solid var(--salt-separable-primary-borderColor)',
            background: idx % 2 === 0 ? 'transparent' : 'var(--salt-color-gray-20)',
          }}
        >
          {/* Rank */}
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--salt-separable-primary-borderColor)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              color: 'var(--salt-color-foreground-secondary)',
            }}
          >
            {idx + 1}
          </span>

          {/* Key */}
          <a
            href={item.jiraUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: 'var(--salt-color-blue-600)',
              fontWeight: 600,
              fontSize: 13,
              minWidth: 80,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {item.key}
          </a>

          {/* Summary */}
          <Text
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 13,
            }}
          >
            {item.summary}
          </Text>

          {/* Assignee */}
          {item.assignee && (
            <Text styleAs="label" color="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
              {item.assignee.displayName}
            </Text>
          )}

          {/* Days overdue */}
          <span
            style={{
              color: 'var(--salt-status-error-foreground)',
              fontWeight: 700,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {item.daysPastDue}d overdue
          </span>

          {/* Severity badge */}
          <SeverityBadge severity={item.slippageSeverity} />
        </div>
      ))}
    </div>
  );
};
