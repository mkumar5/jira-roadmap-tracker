import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { Spinner, Text } from '@salt-ds/core';

export interface BaseGridProps<T extends object> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  loading?: boolean;
  height?: string | number;
  gridOptions?: GridOptions<T>;
  onGridReady?: (event: GridReadyEvent<T>) => void;
  treeData?: boolean;
  getDataPath?: (data: T) => string[];
  testId?: string;
  emptyMessage?: string;
}

export function BaseGrid<T extends object>({
  rowData,
  columnDefs,
  loading = false,
  height = '100%',
  gridOptions,
  onGridReady,
  treeData = false,
  getDataPath,
  testId,
  emptyMessage = 'No data to display.',
}: BaseGridProps<T>) {
  if (loading) {
    return (
      <div className="loading-container" style={{ height }}>
        <Spinner size="medium" aria-label="Loading data" />
      </div>
    );
  }

  if (rowData.length === 0) {
    return (
      <div className="empty-state" style={{ height }}>
        <Text color="secondary">{emptyMessage}</Text>
      </div>
    );
  }

  return (
    <div className="ag-theme-quartz" style={{ height, width: '100%' }} data-testid={testId}>
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
          minWidth: 80,
        }}
        rowSelection="multiple"
        animateRows={true}
        suppressRowClickSelection={true}
        treeData={treeData}
        getDataPath={getDataPath}
        onGridReady={onGridReady}
        {...gridOptions}
      />
    </div>
  );
}
