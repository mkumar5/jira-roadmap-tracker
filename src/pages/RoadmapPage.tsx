import { useState, useRef, useCallback, useDeferredValue } from 'react';
import { Button, Text, Input, Checkbox, CheckboxGroup, SplitLayout, FlowLayout } from '@salt-ds/core';
import type { GridApi } from 'ag-grid-community';
import { RoadmapGrid } from '@/components/roadmap/RoadmapGrid';
import { useRoadmapHierarchy } from '@/hooks/useRoadmap';
import { useConfigStore } from '@/store/configStore';
import type { HierarchyNode, SlippageSeverity } from '@/types';

const SEVERITY_OPTIONS: { value: SlippageSeverity; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'At Risk' },
];

export const RoadmapPage = () => {
  const { projectKeys } = useConfigStore();
  const { data: allNodes = [], isLoading, error } = useRoadmapHierarchy();

  const [searchInput, setSearchInput] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SlippageSeverity[]>([]);
  const gridApiRef = useRef<GridApi<HierarchyNode> | null>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);

  // Defer search so typing stays responsive with large datasets
  const searchText = useDeferredValue(searchInput);

  const handleSeverityChange = useCallback((value: SlippageSeverity, checked: boolean) => {
    setSeverityFilter((prev) =>
      checked ? [...prev, value] : prev.filter((s) => s !== value)
    );
  }, []);

  const handleExpandAll = useCallback(() => {
    gridWrapperRef.current?.dispatchEvent(new Event('roadmap:expand-all'));
  }, []);

  const handleCollapseAll = useCallback(() => {
    gridWrapperRef.current?.dispatchEvent(new Event('roadmap:collapse-all'));
  }, []);

  const handleExportCsv = useCallback(() => {
    gridApiRef.current?.exportDataAsCsv({ fileName: 'roadmap-export.csv' });
  }, []);

  const handleGridReady = useCallback((api: GridApi<HierarchyNode>) => {
    gridApiRef.current = api;
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setSeverityFilter([]);
  }, []);

  if (projectKeys.length === 0) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 120px)' }}>
        <Text styleAs="h3" color="secondary">
          No project keys configured
        </Text>
        <Text color="secondary">Go to Settings to add your Jira project keys.</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ height: 'calc(100vh - 120px)' }}>
        <Text styleAs="h3" color="secondary">
          Failed to load roadmap
        </Text>
        <Text color="secondary">
          {error instanceof Error ? error.message : 'Check your Jira connection in Settings.'}
        </Text>
      </div>
    );
  }

  const hasActiveFilters = searchInput || severityFilter.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page header */}
      <SplitLayout
        align="center"
        style={{ marginBottom: 'var(--salt-spacing-75)' }}
        startItem={<Text styleAs="h4" style={{ fontWeight: 700 }}>Roadmap</Text>}
        endItem={
          <FlowLayout gap={1} align="center">
            {allNodes.length > 0 && (
              <Text styleAs="label" color="secondary">
                {allNodes.length.toLocaleString()} items · {projectKeys.join(', ')}
              </Text>
            )}
            <Button variant="secondary" onClick={handleExportCsv} disabled={isLoading}>
              Export CSV
            </Button>
          </FlowLayout>
        }
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--salt-spacing-100)', flexWrap: 'wrap', paddingBottom: 'var(--salt-spacing-75)', borderBottom: '1px solid var(--salt-separable-primary-borderColor)' }}>
        <Input
          value={searchInput}
          placeholder="Search epics, stories…"
          style={{ width: 240 }}
          inputProps={{ onChange: (e) => setSearchInput(e.target.value) }}
        />
        <CheckboxGroup direction="horizontal" aria-label="Filter by slippage severity">
          {SEVERITY_OPTIONS.map(({ value, label }) => (
            <Checkbox
              key={value}
              label={label}
              value={value}
              checked={severityFilter.includes(value)}
              onChange={(e) => handleSeverityChange(value, (e.target as HTMLInputElement).checked)}
            />
          ))}
        </CheckboxGroup>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={handleExpandAll} disabled={isLoading}>Expand All</Button>
        <Button variant="secondary" onClick={handleCollapseAll} disabled={isLoading}>Collapse All</Button>
        {hasActiveFilters && (
          <Button variant="secondary" onClick={handleClearFilters}>Clear Filters</Button>
        )}
      </div>

      {/* Grid */}
      <div ref={gridWrapperRef} style={{ flex: 1, minHeight: 0 }}>
        <RoadmapGrid
          allNodes={allNodes}
          loading={isLoading}
          searchText={searchText}
          severityFilter={severityFilter}
          onGridReady={handleGridReady}
        />
      </div>
    </div>
  );
};
