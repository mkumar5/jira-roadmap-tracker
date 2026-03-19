import { useState, useEffect } from 'react';
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
  SplitLayout,
  FlowLayout,
  Divider,
} from '@salt-ds/core';
import { useQueryClient } from '@tanstack/react-query';
import { useConfigStore, ENV } from '@/store/configStore';
import { useSlippageStore } from '@/store/slippageStore';
import { jiraService } from '@/services/jira.service';
import type { HierarchyStrategy, SlippageSeverity } from '@/types';

const HIERARCHY_OPTIONS: { value: HierarchyStrategy; label: string; description: string }[] = [
  { value: 'LABEL_BASED', label: 'Standard Jira (Epic → Story)', description: 'Epics are the top level — use for standard Jira Cloud without Premium. Recommended.' },
  { value: 'COMPONENT_BASED', label: 'Component Based', description: 'Components map to Deliverables within each Epic.' },
  { value: 'JIRA_PREMIUM', label: 'Jira Premium (Initiative → Epic)', description: 'Requires Initiative and Feature issue types (Jira Advanced Roadmaps).' },
  { value: 'PORTFOLIO', label: 'Portfolio / Advanced Roadmaps', description: 'Uses Jira Advanced Roadmaps portfolio hierarchy.' },
];

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: 'var(--salt-spacing-50) var(--salt-spacing-100)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)', background: 'var(--salt-color-background-secondary)' }}>
      <Text styleAs="label" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11, color: 'var(--salt-color-foreground-secondary)' }}>
        {title}
      </Text>
    </div>
  );
}

export const SettingsPage = () => {
  const store = useConfigStore();
  const queryClient = useQueryClient();
  const { atRiskDays, alertThreshold, setAtRiskDays, setAlertThreshold } = useSlippageStore();

  // Always initialize from the live store (which queueMicrotask already corrected)
  const [host, setHost] = useState(store.jiraHost || ENV.host);
  const [email, setEmail] = useState(store.jiraEmail || ENV.email);
  const [token, setToken] = useState(store.jiraApiToken || ENV.token);
  const [projectKeysStr, setProjectKeysStr] = useState(
    (store.projectKeys.length > 0 ? store.projectKeys : ENV.projectKeys).join(', ')
  );
  const [strategy, setStrategy] = useState<HierarchyStrategy>(store.hierarchyStrategy || ENV.strategy);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [saved, setSaved] = useState(false);

  // Sync form if store corrects itself after mount (queueMicrotask delay)
  useEffect(() => {
    if (store.hierarchyStrategy && store.hierarchyStrategy !== strategy) {
      setStrategy(store.hierarchyStrategy);
    }
    if (store.projectKeys.length > 0 && store.projectKeys.join(',') !== projectKeysStr.replace(/\s/g, '')) {
      setProjectKeysStr(store.projectKeys.join(', '));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.hierarchyStrategy, store.projectKeys]);

  const applyConfig = (overrideStrategy?: HierarchyStrategy) => {
    const effectiveStrategy = overrideStrategy ?? strategy;
    store.setJiraConfig({
      jiraHost: host.trim(),
      jiraEmail: email.trim(),
      jiraApiToken: token.trim(),
      projectKeys: projectKeysStr.split(',').map((k) => k.trim()).filter(Boolean),
      hierarchyStrategy: effectiveStrategy,
    });
    // Clear all cached query data so pages refetch with new settings
    void queryClient.invalidateQueries();
    void queryClient.resetQueries();
  };

  const handleSave = () => {
    applyConfig();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    applyConfig();
    setConnectionStatus('testing');
    setConnectionMessage('');
    try {
      const user = await jiraService.testConnection();
      setConnectionStatus('success');
      setConnectionMessage(`Connected as ${user.displayName} (${user.emailAddress})`);
    } catch (err) {
      setConnectionStatus('error');
      setConnectionMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleResetToEnv = () => {
    setHost(ENV.host);
    setEmail(ENV.email);
    setToken(ENV.token);
    setProjectKeysStr(ENV.projectKeys.join(', '));
    setStrategy(ENV.strategy);
  };

  const selectedOption = HIERARCHY_OPTIONS.find((o) => o.value === strategy) ?? HIERARCHY_OPTIONS[0];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <StackLayout gap={2} direction="column">
        <SplitLayout
          align="center"
          startItem={<Text styleAs="h4" style={{ fontWeight: 700 }}>Settings</Text>}
          endItem={
            <Button variant="secondary" onClick={handleResetToEnv}>
              Reset to .env defaults
            </Button>
          }
        />

        {/* Current effective config summary */}
        <Banner status={store.projectKeys.length > 0 ? 'info' : 'warning'}>
          <BannerContent>
            <Text styleAs="label">
              <strong>Active config:</strong> {store.projectKeys.length > 0 ? store.projectKeys.join(', ') : 'No projects'} · {HIERARCHY_OPTIONS.find(o => o.value === store.hierarchyStrategy)?.label ?? store.hierarchyStrategy} · {store.jiraHost || 'no host'}
            </Text>
          </BannerContent>
        </Banner>

        {/* Jira Connection */}
        <Card variant="primary" style={{ padding: 0 }}>
          <SectionHeader title="Jira Connection" />
          <div style={{ padding: 'var(--salt-spacing-150)' }}>
            <StackLayout gap={2}>
              <FormField>
                <FormFieldLabel>Jira Host</FormFieldLabel>
                <Input
                  value={host}
                  placeholder="yourorg.atlassian.net"
                  inputProps={{ onChange: (e) => setHost(e.target.value) }}
                />
                <FormFieldHelperText>Atlassian Cloud domain — no https://</FormFieldHelperText>
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
                <FormFieldHelperText>id.atlassian.com → Security → API tokens</FormFieldHelperText>
              </FormField>

              <FlowLayout gap={1}>
                <Button variant="secondary" onClick={() => void handleTestConnection()} disabled={connectionStatus === 'testing'}>
                  {connectionStatus === 'testing' ? 'Testing…' : 'Test Connection'}
                </Button>
              </FlowLayout>

              {connectionStatus === 'success' && (
                <Banner status="success"><BannerContent>{connectionMessage}</BannerContent></Banner>
              )}
              {connectionStatus === 'error' && (
                <Banner status="error"><BannerContent>{connectionMessage}</BannerContent></Banner>
              )}
            </StackLayout>
          </div>
        </Card>

        {/* Project Configuration */}
        <Card variant="primary" style={{ padding: 0 }}>
          <SectionHeader title="Project Configuration" />
          <div style={{ padding: 'var(--salt-spacing-150)' }}>
            <StackLayout gap={2}>
              <FormField>
                <FormFieldLabel>Project Keys</FormFieldLabel>
                <Input
                  value={projectKeysStr}
                  placeholder="SCRUM, PLATFORM, MOBILE"
                  inputProps={{ onChange: (e) => setProjectKeysStr(e.target.value) }}
                />
                <FormFieldHelperText>
                  Comma-separated Jira project keys tracked across all views
                </FormFieldHelperText>
              </FormField>

              <FormField>
                <FormFieldLabel>Hierarchy Strategy</FormFieldLabel>
                <Dropdown
                  selected={[selectedOption.label]}
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
                <FormFieldHelperText>{selectedOption.description}</FormFieldHelperText>
              </FormField>

              {strategy === 'JIRA_PREMIUM' && (
                <Banner status="warning">
                  <BannerContent>
                    <Text styleAs="label">
                      Jira Premium requires Initiative and Feature issue types. For standard Jira Cloud use <strong>Standard Jira (Epic → Story)</strong>.
                    </Text>
                  </BannerContent>
                </Banner>
              )}
            </StackLayout>
          </div>
        </Card>

        {/* Alerting */}
        <Card variant="primary" style={{ padding: 0 }}>
          <SectionHeader title="Slippage Alerting" />
          <div style={{ padding: 'var(--salt-spacing-150)' }}>
            <StackLayout gap={2}>
              <FormField>
                <FormFieldLabel>At-Risk Lookahead</FormFieldLabel>
                <Dropdown
                  selected={[String(atRiskDays)]}
                  onSelectionChange={(_e, selected) => setAtRiskDays(Number(selected[0]))}
                >
                  {['7', '14', '30'].map((d) => (
                    <Option key={d} value={d}>{d} days</Option>
                  ))}
                </Dropdown>
                <FormFieldHelperText>Items due within this window appear in the At Risk tab</FormFieldHelperText>
              </FormField>

              <FormField>
                <FormFieldLabel>Alert Threshold</FormFieldLabel>
                <Dropdown
                  selected={[alertThreshold]}
                  onSelectionChange={(_e, selected) => setAlertThreshold(selected[0] as SlippageSeverity)}
                >
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SlippageSeverity[]).map((s) => (
                    <Option key={s} value={s}>{s}</Option>
                  ))}
                </Dropdown>
                <FormFieldHelperText>Minimum severity shown in sidebar badge</FormFieldHelperText>
              </FormField>
            </StackLayout>
          </div>
        </Card>

        <div style={{ paddingBottom: 'var(--salt-spacing-200)' }}>
          <Divider style={{ marginBottom: 'var(--salt-spacing-100)' }} />
          <FlowLayout gap={2} align="center">
            <Button variant="cta" onClick={handleSave}>
              Save Settings
            </Button>
            {saved && <Text styleAs="label" color="secondary">Settings saved</Text>}
          </FlowLayout>
        </div>
      </StackLayout>
    </div>
  );
};
