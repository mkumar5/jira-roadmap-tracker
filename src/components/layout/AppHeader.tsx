import { SplitLayout, FlowLayout, Text, Button, Tooltip } from '@salt-ds/core';
import { useTheme } from '@/providers/ThemeContext';
import { useConfigStore } from '@/store/configStore';

export const AppHeader = () => {
  const { mode, toggleMode } = useTheme();
  const { projectKeys } = useConfigStore();

  return (
    <SplitLayout
      style={{ width: '100%', padding: '0 var(--salt-spacing-100)' }}
      align="center"
      startItem={
        <FlowLayout align="center" gap={1}>
          {/* Brand mark */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              background: 'var(--salt-color-blue-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 11,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              JR
            </Text>
          </div>
          <Text styleAs="label" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {(import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Roadmap Manager'}
          </Text>
          {projectKeys.length > 0 && (
            <>
              <div
                style={{
                  width: 1,
                  height: 16,
                  background: 'var(--salt-separable-primary-borderColor)',
                }}
              />
              <FlowLayout gap={0.5} align="center">
                {projectKeys.map((key) => (
                  <span
                    key={key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'var(--salt-color-blue-30)',
                      color: 'var(--salt-color-blue-600)',
                      border: '1px solid var(--salt-color-blue-100)',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '1px 6px',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {key}
                  </span>
                ))}
              </FlowLayout>
            </>
          )}
        </FlowLayout>
      }
      endItem={
        <FlowLayout align="center" gap={1}>
          <Text styleAs="label" color="secondary" style={{ whiteSpace: 'nowrap' }}>
            Last synced: Never
          </Text>
          <Tooltip content={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <Button
              variant="secondary"
              aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
              onClick={toggleMode}
            >
              {mode === 'light' ? 'Dark' : 'Light'}
            </Button>
          </Tooltip>
        </FlowLayout>
      }
    />
  );
};
