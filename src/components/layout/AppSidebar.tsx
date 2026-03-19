import { NavLink, useLocation } from 'react-router-dom';
import {
  DashboardSolidIcon,
  HierarchySolidIcon,
  ProgressInprogressIcon,
  WarningSolidIcon,
  BuildReportSolidIcon,
  SettingsSolidIcon,
  LineChartSolidIcon,
} from '@salt-ds/icons';
import { useConfigStore } from '@/store/configStore';
import type { ReactElement } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactElement;
}

const MAIN_NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardSolidIcon /> },
  { path: '/roadmap', label: 'Roadmap', icon: <HierarchySolidIcon /> },
  { path: '/sprints', label: 'Sprint Tracking', icon: <ProgressInprogressIcon /> },
  { path: '/slippage', label: 'Slippage Alerts', icon: <WarningSolidIcon /> },
  { path: '/reports', label: 'Sprint Reports', icon: <BuildReportSolidIcon /> },
  { path: '/ai-efficiency', label: 'AI Efficiency', icon: <LineChartSolidIcon /> },
];

function NavItemLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={`nav-item${isActive ? ' active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {item.icon}
      <span className="nav-item-label">{item.label}</span>
    </NavLink>
  );
}

export const AppSidebar = () => {
  const location = useLocation();
  const { projectKeys } = useConfigStore();
  const appName = (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Roadmap Manager';

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">JR</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">{appName}</span>
          {projectKeys.length > 0 && (
            <span className="sidebar-brand-subtitle">{projectKeys.join(' · ')}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-section" style={{ paddingTop: 'var(--salt-spacing-75)' }}>
        <div className="sidebar-section-label">Navigation</div>
        {MAIN_NAV.map((item) => (
          <NavItemLink
            key={item.path}
            item={item}
            isActive={location.pathname === item.path}
          />
        ))}
      </div>

      <div className="sidebar-footer">
        <NavItemLink
          item={{ path: '/settings', label: 'Settings', icon: <SettingsSolidIcon /> }}
          isActive={location.pathname === '/settings'}
        />
      </div>
    </nav>
  );
};
