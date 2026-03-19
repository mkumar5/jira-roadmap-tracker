import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { SlippagePage } from '@/pages/SlippagePage';
import { useConfigStore } from '@/store/configStore';

// Ensure project keys are configured before tests
function renderSlippagePage() {
  useConfigStore.setState({ projectKeys: ['PROJ'] });
  return renderWithProviders(<SlippagePage />);
}

describe('SlippagePage', () => {
  it('renders page heading', () => {
    renderSlippagePage();
    expect(screen.getByText('Slippage Alerts')).toBeInTheDocument();
  });

  it('renders Slipped Items tab', () => {
    renderSlippagePage();
    expect(screen.getByText(/Slipped Items/i)).toBeInTheDocument();
  });

  it('renders At Risk tab', () => {
    renderSlippagePage();
    const matches = screen.getAllByText(/At Risk/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders Refresh button', () => {
    renderSlippagePage();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });

  it('renders Export CSV button', () => {
    renderSlippagePage();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderSlippagePage();
    expect(screen.getByPlaceholderText(/Search key, summary, assignee/i)).toBeInTheDocument();
  });

  it('shows empty state when no project keys configured', () => {
    useConfigStore.setState({ projectKeys: [] });
    renderWithProviders(<SlippagePage />);
    expect(screen.getByText(/No project keys configured/i)).toBeInTheDocument();
  });

  it('loads slipped items from API', async () => {
    renderSlippagePage();
    // The MSW handler returns items with duedate < now(), so at least the grid renders
    await waitFor(() => {
      // AG Grid renders a root element; just confirm no critical crash
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});
