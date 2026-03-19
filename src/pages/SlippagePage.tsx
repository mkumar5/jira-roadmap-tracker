import { useState, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import { Text, Input, Checkbox, CheckboxGroup, Button, SplitLayout, FlowLayout } from '@salt-ds/core';
import { TabsNext, TabNext, TabListNext, TabNextTrigger, TabNextPanel } from '@salt-ds/lab';
import type { GridApi } from 'ag-grid-community';
import { SlippageGrid, AtRiskGrid } from '@/components/roadmap/SlippageGrid';
import { SlippageSummaryBanner } from '@/components/roadmap/SlippageSummaryBanner';
import { useSlippage, useAtRisk } from '@/hooks/useSlippage';
import { useSlippageStore } from '@/store/slippageStore';
import { useConfigStore } from '@/store/configStore';
import { formatRelativeTime } from '@/utils/date.utils';
import type { SlippedItem, AtRiskItem, SlippageSeverity } from '@/types';

const ISSUE_TYPE_OPTIONS = ['initiative', 'deliverable', 'epic', 'story'] as const;

export const SlippagePage = () => {
  const { projectKeys } = useConfigStore();
  const { filters, atRiskDays, setFilters, setSeverityFilter, resetFilters } = useSlippageStore();

  const [activeTab, setActiveTab] = useState('slipped');
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDeferredValue(searchInput);

  const slippedGridApiRef = useRef<GridApi<SlippedItem> | null>(null);
  const atRiskGridApiRef = useRef<GridApi<AtRiskItem> | null>(null);

  const {
    data: slippedItems = [],
    isLoading: slippedLoading,
    dataUpdatedAt: slippedUpdatedAt,
    refetch: refetchSlipped,
  } = useSlippage();

  const { data: atRiskItems = [], isLoading: atRiskLoading } = useAtRisk();

  // Apply client-side filters to slipped items
  const filteredSlipped = useMemo(() => {
    let items = slippedItems;
    if (filters.severity.length > 0) {
      items = items.filter((i) => filters.severity.includes(i.slippageSeverity));
    }
    if (filters.issueTypes.length > 0) {
      items = items.filter((i) => filters.issueTypes.includes(i.issueType));
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.summary.toLowerCase().includes(q) ||
          i.key.toLowerCase().includes(q) ||
          (i.assignee?.displayName ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [slippedItems, filters.severity, filters.issueTypes, searchText]);

  // Apply client-side filters to at-risk items
  const filteredAtRisk = useMemo(() => {
    let items = atRiskItems;
    if (filters.issueTypes.length > 0) {
      items = items.filter((i) => filters.issueTypes.includes(i.issueType));
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.summary.toLowerCase().includes(q) ||
          i.key.toLowerCase().includes(q)
      );
    }
    return items;
  }, [atRiskItems, filters.issueTypes, searchText]);

  const handleSeverityClick = useCallback(
    (severity: SlippageSeverity) => {
      setSeverityFilter(
        filters.severity.includes(severity)
          ? filters.severity.filter((s) => s !== severity)
          : [...filters.severity, severity]
      );
      setActiveTab('slipped');
    },
    [filters.severity, setSeverityFilter]
  );

  const handleIssueTypeChange = useCallback(
    (type: string, checked: boolean) => {
      setFilters({
        issueTypes: checked
          ? [...filters.issueTypes, type]
          : filters.issueTypes.filter((t) => t !== type),
      });
    },
    [filters.issueTypes, setFilters]
  );

  const handleExportCsv = useCallback(() => {
    if (activeTab === 'slipped') {
      slippedGridApiRef.current?.exportDataAsCsv({ fileName: 'slippage-report.csv' });
    } else {
      atRiskGridApiRef.current?.exportDataAsCsv({ fileName: 'at-risk-report.csv' });
    }
  }, [activeTab]);

  const hasActiveFilters =
    searchInput || filters.severity.length > 0 || filters.issueTypes.length > 0;

  const lastChecked = slippedUpdatedAt
    ? formatRelativeTime(new Date(slippedUpdatedAt).toISOString())
    : null;

  if (projectKeys.length === 0) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 120px)' }}>
        <Text styleAs="h3" color="secondary">No project keys configured</Text>
        <Text color="secondary">Go to Settings to add your Jira project keys.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--salt-spacing-150)' }}>
      {/* Page header */}
      <SplitLayout
        align="center"
        startItem={<Text styleAs="h4" style={{ fontWeight: 700 }}>Slippage Alerts</Text>}
        endItem={
          <FlowLayout gap={1} align="center">
            {lastChecked && (
              <Text styleAs="label" color="secondary">Last checked {lastChecked}</Text>
            )}
            <Button variant="secondary" onClick={() => void refetchSlipped()} disabled={slippedLoading}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={handleExportCsv}>
              Export CSV
            </Button>
          </FlowLayout>
        }
      />

      {/* Summary banner */}
      <SlippageSummaryBanner
        items={slippedItems}
        atRiskCount={atRiskItems.length}
        activeSeverities={filters.severity}
        onSeverityClick={handleSeverityClick}
      />

      {/* Filter toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--salt-spacing-100)', flexWrap: 'wrap', paddingBottom: 'var(--salt-spacing-75)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)' }}>
        <Input
          value={searchInput}
          placeholder="Search key, summary, assignee…"
          style={{ width: 240 }}
          inputProps={{ onChange: (e) => setSearchInput(e.target.value) }}
        />

        <CheckboxGroup direction="horizontal" aria-label="Filter by type">
          {ISSUE_TYPE_OPTIONS.map((type) => (
            <Checkbox
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              value={type}
              checked={filters.issueTypes.includes(type)}
              onChange={(e) =>
                handleIssueTypeChange(type, (e.target as HTMLInputElement).checked)
              }
            />
          ))}
        </CheckboxGroup>

        <div style={{ flex: 1 }} />

        {hasActiveFilters && (
          <Button
            variant="secondary"
            onClick={() => {
              resetFilters();
              setSearchInput('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Tabs */}
      <TabsNext value={activeTab} onChange={(_e, val) => setActiveTab(val)}>
        <TabListNext>
          <TabNext value="slipped">
            <TabNextTrigger>
              Slipped Items
              {filteredSlipped.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: 'var(--salt-status-error-background)',
                    color: 'var(--salt-status-error-foreground)',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {filteredSlipped.length}
                </span>
              )}
            </TabNextTrigger>
          </TabNext>
          <TabNext value="at-risk">
            <TabNextTrigger>
              At Risk — due in {atRiskDays}d
              {filteredAtRisk.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: 'var(--salt-status-warning-background)',
                    color: 'var(--salt-status-warning-foreground)',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {filteredAtRisk.length}
                </span>
              )}
            </TabNextTrigger>
          </TabNext>
        </TabListNext>

        <TabNextPanel value="slipped" style={{ padding: 'var(--salt-spacing-150) 0 0' }}>
          <SlippageGrid
            items={filteredSlipped}
            loading={slippedLoading}
            onGridReady={(api) => { slippedGridApiRef.current = api; }}
          />
        </TabNextPanel>

        <TabNextPanel value="at-risk" style={{ padding: 'var(--salt-spacing-150) 0 0' }}>
          <AtRiskGrid
            items={filteredAtRisk}
            loading={atRiskLoading}
            onGridReady={(api) => { atRiskGridApiRef.current = api; }}
          />
        </TabNextPanel>
      </TabsNext>
    </div>
  );
};
