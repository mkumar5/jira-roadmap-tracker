import { NavigationItem } from '@salt-ds/core';
import {
  DashboardSolidIcon,
  HierarchySolidIcon,
  ProgressInprogressIcon,
  WarningSolidIcon,
  BuildReportSolidIcon,
  SettingsSolidIcon,
} from '@salt-ds/icons';
import { NavLink, useLocation } from 'react-router-dom';
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
];

export const AppSidebar = () => {
  const location = useLocation();

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ul role="list" style={{ listStyle: 'none', flex: 1, padding: 0 }}>
        {MAIN_NAV.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <NavigationItem
                active={isActive}
                orientation="vertical"
                render={<NavLink to={item.path} />}
              >
                {item.icon}
                {item.label}
              </NavigationItem>
            </li>
          );
        })}
      </ul>

      <ul role="list" style={{ listStyle: 'none', padding: 0, borderTop: '1px solid var(--salt-separable-primary-borderColor)' }}>
        <li>
          <NavigationItem
            active={location.pathname === '/settings'}
            orientation="vertical"
            render={<NavLink to="/settings" />}
          >
            <SettingsSolidIcon />
            Settings
          </NavigationItem>
        </li>
      </ul>
    </nav>
  );
};
