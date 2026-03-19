import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { SettingsPage } from '@/pages/SettingsPage';

describe('SettingsPage', () => {
  it('renders Jira Connection card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Jira Connection')).toBeInTheDocument();
  });

  it('renders Project Configuration card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Project Configuration')).toBeInTheDocument();
  });

  it('renders Slippage Alerting card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Slippage Alerting')).toBeInTheDocument();
  });

  it('renders Test Connection button', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
  });

  it('renders Save Settings button', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
  });

  it('shows success banner after successful connection test', async () => {
    renderWithProviders(<SettingsPage />);
    const btn = screen.getByRole('button', { name: /Test Connection/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/Connected as/i)).toBeInTheDocument();
    });
  });

  it('shows saved confirmation after clicking Save', async () => {
    renderWithProviders(<SettingsPage />);
    const btn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/Settings saved/i)).toBeInTheDocument();
    });
  });
});
