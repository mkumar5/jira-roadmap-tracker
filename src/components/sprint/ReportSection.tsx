import { useState } from 'react';
import { Text } from '@salt-ds/core';

interface ReportSectionProps {
  title: string;
  count: number;
  points?: number;
  defaultExpanded?: boolean;
  accent?: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

const ACCENT_COLOR: Record<NonNullable<ReportSectionProps['accent']>, string> = {
  success: 'var(--salt-status-success-foreground)',
  warning: 'var(--salt-status-warning-foreground)',
  error: 'var(--salt-status-error-foreground)',
  info: 'var(--salt-color-blue-600)',
};

export const ReportSection = ({
  title,
  count,
  points,
  defaultExpanded = true,
  accent = 'info',
  children,
}: ReportSectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const color = ACCENT_COLOR[accent];

  return (
    <div
      style={{
        border: '1px solid var(--salt-separable-primary-borderColor)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--salt-spacing-150)',
          padding: 'var(--salt-spacing-150) var(--salt-spacing-200)',
          background: 'var(--salt-color-background)',
          border: 'none',
          borderBottom: expanded
            ? '1px solid var(--salt-separable-primary-borderColor)'
            : 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 16,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
            display: 'inline-block',
            color: 'var(--salt-color-foreground-secondary)',
          }}
        >
          ›
        </span>
        <Text styleAs="h4" style={{ flex: 1, margin: 0 }}>
          {title}
        </Text>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 10,
            background: color,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
        {points !== undefined && (
          <Text styleAs="label" color="secondary">
            {points} pts
          </Text>
        )}
      </button>

      {expanded && (
        <div style={{ padding: 'var(--salt-spacing-150) var(--salt-spacing-200)' }}>
          {count === 0 ? (
            <Text color="secondary" styleAs="label">
              None
            </Text>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
};
