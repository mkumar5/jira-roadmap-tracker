import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export const AppShell = () => (
  <div className="app-layout">
    <div className="app-header">
      <AppHeader />
    </div>
    <nav className="app-sidebar" aria-label="Main navigation">
      <AppSidebar />
    </nav>
    <main className="app-main">
      <Outlet />
    </main>
  </div>
);
