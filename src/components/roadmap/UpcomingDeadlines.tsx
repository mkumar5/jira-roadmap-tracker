import { Text } from '@salt-ds/core';
import type { AtRiskItem } from '@/types';

interface UpcomingDeadlinesProps {
  items: AtRiskItem[];
}

const TYPE_COLOR: Record<AtRiskItem['issueType'], string> = {
  initiative: 'var(--salt-color-purple-500)',
  deliverable: 'var(--salt-color-blue-500)',
  epic: 'var(--salt-color-teal-500)',
  story: 'var(--salt-color-green-500)',
};

const TYPE_LABEL: Record<AtRiskItem['issueType'], string> = {
  initiative: 'Init',
  deliverable: 'Deliv',
  epic: 'Epic',
  story: 'Story',
};

function urgencyColor(daysUntilDue: number): string {
  if (daysUntilDue <= 3) return 'var(--salt-status-error-foreground)';
  if (daysUntilDue <= 7) return 'var(--salt-status-warning-foreground)';
  return 'var(--salt-color-foreground-secondary)';
}

export const UpcomingDeadlines = ({ items }: UpcomingDeadlinesProps) => {
  if (items.length === 0) {
    return (
      <div style={{ padding: 'var(--salt-spacing-300)', textAlign: 'center' }}>
        <Text color="secondary">No upcoming deadlines in the next 14 days.</Text>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sorted.slice(0, 10).map((item) => {
        const typeColor = TYPE_COLOR[item.issueType];
        const dueColor = urgencyColor(item.daysUntilDue);

        return (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--salt-spacing-150)',
              padding: 'var(--salt-spacing-100) var(--salt-spacing-150)',
              borderLeft: `3px solid ${typeColor}`,
              borderBottom: '1px solid var(--salt-separable-primary-borderColor)',
              background: 'var(--salt-color-background)',
            }}
          >
            {/* Type chip */}
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 4,
                background: typeColor,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {TYPE_LABEL[item.issueType]}
            </span>

            {/* Key + summary */}
            <a
              href={item.jiraUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--salt-color-blue-600)', fontWeight: 600, fontSize: 13, flexShrink: 0, textDecoration: 'none' }}
            >
              {item.key}
            </a>
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

            {/* Due date */}
            {item.dueDate && (
              <Text styleAs="label" color="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                {item.dueDate}
              </Text>
            )}

            {/* Days until due */}
            <span style={{ color: dueColor, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
              {item.daysUntilDue <= 0 ? 'Today' : `${item.daysUntilDue}d`}
            </span>
          </div>
        );
      })}
    </div>
  );
};
