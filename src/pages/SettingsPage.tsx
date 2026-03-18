import { useState } from 'react';
import {
  Button,
  FormField,
  FormFieldLabel,
  FormFieldHelperText,
  Input,
  Dropdown,
  Option,
  Banner,
  BannerContent,
  Text,
  StackLayout,
  Card,
} from '@salt-ds/core';
import { useConfigStore } from '@/store/configStore';
import { jiraService } from '@/services/jira.service';
import type { HierarchyStrategy } from '@/types';

const HIERARCHY_OPTIONS: { value: HierarchyStrategy; label: string }[] = [
  { value: 'LABEL_BASED', label: 'Label Based (standard Jira)' },
  { value: 'JIRA_PREMIUM', label: 'Jira Premium (Initiative/Feature types)' },
  { value: 'PORTFOLIO', label: 'Portfolio / Advanced Roadmaps' },
  { value: 'COMPONENT_BASED', label: 'Component Based' },
];

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export const SettingsPage = () => {
  const store = useConfigStore();

  const [host, setHost] = useState(store.jiraHost);
  const [email, setEmail] = useState(store.jiraEmail);
  const [token, setToken] = useState(store.jiraApiToken);
  const [projectKeysStr, setProjectKeysStr] = useState(store.projectKeys.join(','));
  const [strategy, setStrategy] = useState<HierarchyStrategy>(store.hierarchyStrategy);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    store.setJiraConfig({
      jiraHost: host.trim(),
      jiraEmail: email.trim(),
      jiraApiToken: token.trim(),
      projectKeys: projectKeysStr.split(',').map((k) => k.trim()).filter(Boolean),
      hierarchyStrategy: strategy,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    // Save current values so the service picks them up
    store.setJiraConfig({
      jiraHost: host.trim(),
      jiraEmail: email.trim(),
      jiraApiToken: token.trim(),
      projectKeys: projectKeysStr.split(',').map((k) => k.trim()).filter(Boolean),
      hierarchyStrategy: strategy,
    });

    setConnectionStatus('testing');
    setConnectionMessage('');
    try {
      const user = await jiraService.testConnection();
      setConnectionStatus('success');
      setConnectionMessage(`Connected as ${user.displayName} (${user.emailAddress})`);
    } catch (err) {
      setConnectionStatus('error');
      const message = err instanceof Error ? err.message : 'Connection failed';
      setConnectionMessage(message);
    }
  };

  const selectedStrategyLabel =
    HIERARCHY_OPTIONS.find((o) => o.value === strategy)?.label ?? strategy;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header">
        <Text styleAs="h1">Settings</Text>
      </div>

      <StackLayout gap={3}>
        {/* Jira Connection */}
        <Card>
          <StackLayout gap={2}>
            <Text styleAs="h2">Jira Connection</Text>

            <FormField>
              <FormFieldLabel>Jira Host</FormFieldLabel>
              <Input
                value={host}
                placeholder="yourorg.atlassian.net"
                inputProps={{ onChange: (e) => setHost(e.target.value) }}
              />
              <FormFieldHelperText>Your Atlassian Cloud domain without https://</FormFieldHelperText>
            </FormField>

            <FormField>
              <FormFieldLabel>Email</FormFieldLabel>
              <Input
                value={email}
                placeholder="you@example.com"
                inputProps={{ type: 'email', onChange: (e) => setEmail(e.target.value) }}
              />
            </FormField>

            <FormField>
              <FormFieldLabel>API Token</FormFieldLabel>
              <Input
                value={token}
                placeholder="Your Jira API token"
                inputProps={{ type: 'password', autoComplete: 'off', onChange: (e) => setToken(e.target.value) }}
              />
              <FormFieldHelperText>
                Generate at id.atlassian.com → Security → API tokens. Stored in localStorage only.
              </FormFieldHelperText>
            </FormField>

            <Button
              variant="secondary"
              onClick={() => void handleTestConnection()}
              disabled={connectionStatus === 'testing'}
            >
              {connectionStatus === 'testing' ? 'Testing…' : 'Test Connection'}
            </Button>

            {connectionStatus === 'success' && (
              <Banner status="success">
                <BannerContent>{connectionMessage}</BannerContent>
              </Banner>
            )}
            {connectionStatus === 'error' && (
              <Banner status="error">
                <BannerContent>{connectionMessage}</BannerContent>
              </Banner>
            )}
          </StackLayout>
        </Card>

        {/* Project Configuration */}
        <Card>
          <StackLayout gap={2}>
            <Text styleAs="h2">Project Configuration</Text>

            <FormField>
              <FormFieldLabel>Project Keys</FormFieldLabel>
              <Input
                value={projectKeysStr}
                placeholder="CORE,PLATFORM,MOBILE"
                inputProps={{ onChange: (e) => setProjectKeysStr(e.target.value) }}
              />
              <FormFieldHelperText>
                Comma-separated Jira project keys to track across all views.
              </FormFieldHelperText>
            </FormField>

            <FormField>
              <FormFieldLabel>Hierarchy Strategy</FormFieldLabel>
              <Dropdown
                selected={[selectedStrategyLabel]}
                onSelectionChange={(_e, selected) => {
                  const found = HIERARCHY_OPTIONS.find((o) => o.label === selected[0]);
                  if (found) setStrategy(found.value);
                }}
              >
                {HIERARCHY_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.label}>
                    {opt.label}
                  </Option>
                ))}
              </Dropdown>
              <FormFieldHelperText>
                How Initiatives and Deliverables are represented in your Jira instance.
              </FormFieldHelperText>
            </FormField>
          </StackLayout>
        </Card>

        {/* Save */}
        <div style={{ display: 'flex', gap: 'var(--salt-spacing-100)', alignItems: 'center' }}>
          <Button variant="cta" onClick={handleSave}>
            Save Settings
          </Button>
          {saved && (
            <Text color="secondary" styleAs="label">
              Saved to localStorage ✓
            </Text>
          )}
        </div>
      </StackLayout>
    </div>
  );
};
