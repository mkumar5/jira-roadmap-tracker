import { Text, Button, Tooltip } from '@salt-ds/core';
import { useTheme } from '@/providers/ThemeContext';
import { useConfigStore } from '@/store/configStore';

export const AppHeader = () => {
  const { mode, toggleMode } = useTheme();
  const { projectKeys } = useConfigStore();

  return (
    <>
      <Text styleAs="h4" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
        {(import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Jira Roadmap Manager'}
      </Text>

      {projectKeys.length > 0 && (
        <Text styleAs="label" color="secondary">
          {projectKeys.join(', ')}
        </Text>
      )}

      <div style={{ flex: 1 }} />

      <Tooltip content={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
        <Button
          variant="secondary"
          aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          onClick={toggleMode}
        >
          {mode === 'light' ? '🌙' : '☀️'}
        </Button>
      </Tooltip>
    </>
  );
};
