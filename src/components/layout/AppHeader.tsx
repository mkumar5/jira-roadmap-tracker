import { Text, Button, Tooltip } from '@salt-ds/core';
import { useTheme } from '@/providers/ThemeContext';

export const AppHeader = () => {
  const { mode, toggleMode } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: '100%',
        gap: 'var(--salt-spacing-150)',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: 'var(--salt-color-foreground-secondary)',
        }}
      >
        Jira Cloud · Read-only view
      </Text>

      <div style={{ width: 1, height: 16, background: 'var(--salt-separable-primary-borderColor)' }} />

      <Tooltip content={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
        <Button
          variant="secondary"
          aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          onClick={toggleMode}
          style={{ fontSize: 12 }}
        >
          {mode === 'light' ? '🌙 Dark' : '☀️ Light'}
        </Button>
      </Tooltip>
    </div>
  );
};
