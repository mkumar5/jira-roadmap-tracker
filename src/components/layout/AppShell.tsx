import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  mode: 'light' | 'dark';
  onModeChange: (mode: 'light' | 'dark') => void;
}

export const AppShell = ({ mode, onModeChange }: AppShellProps) => (
  <div className="app-layout">
    <div className="app-header">
      <AppHeader mode={mode} onModeChange={onModeChange} />
    </div>
    <nav className="app-sidebar" aria-label="Main navigation">
      <AppSidebar />
    </nav>
    <main className="app-main">
      <Outlet />
    </main>
  </div>
);
