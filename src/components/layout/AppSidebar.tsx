import { NavLink } from 'react-router-dom';
import { Text } from '@salt-ds/core';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Executive Dashboard', icon: '📊' },
  { path: '/roadmap', label: 'Roadmap', icon: '🗺️' },
  { path: '/sprints', label: 'Sprint Tracking', icon: '⚡' },
  { path: '/slippage', label: 'Slippage Alerts', icon: '🔴' },
  { path: '/reports', label: 'Sprint Reports', icon: '📋' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export const AppSidebar = () => (
  <ul style={{ listStyle: 'none' }}>
    {NAV_ITEMS.map((item) => (
      <li key={item.path}>
        <NavLink
          to={item.path}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 16px',
            textDecoration: 'none',
            color: isActive
              ? 'var(--salt-color-blue-600)'
              : 'var(--salt-color-foreground)',
            backgroundColor: isActive
              ? 'color-mix(in srgb, var(--salt-color-blue-600) 10%, transparent)'
              : 'transparent',
            borderLeft: isActive ? '3px solid var(--salt-color-blue-600)' : '3px solid transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: '14px',
          })}
        >
          <span aria-hidden="true">{item.icon}</span>
          <Text styleAs="label">{item.label}</Text>
        </NavLink>
      </li>
    ))}
  </ul>
);
