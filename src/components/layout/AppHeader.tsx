import { Text, Button, Tooltip } from '@salt-ds/core';
import { useConfigStore } from '@/store/configStore';

interface AppHeaderProps {
  mode: 'light' | 'dark';
  onModeChange: (mode: 'light' | 'dark') => void;
}

export const AppHeader = ({ mode, onModeChange }: AppHeaderProps) => {
  const { projectKeys } = useConfigStore();

  return (
    <>
      {/* Logo / app name */}
      <Text styleAs="h4" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
        {(import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Jira Roadmap Manager'}
      </Text>

      {/* Project keys indicator */}
      {projectKeys.length > 0 && (
        <Text styleAs="label" color="secondary">
          {projectKeys.join(', ')}
        </Text>
      )}

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <Tooltip content={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
        <Button
          variant="secondary"
          aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          onClick={() => onModeChange(mode === 'light' ? 'dark' : 'light')}
        >
          {mode === 'light' ? '🌙' : '☀️'}
        </Button>
      </Tooltip>
    </>
  );
};
