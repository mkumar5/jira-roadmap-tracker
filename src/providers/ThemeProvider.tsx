import { SaltProvider } from '@salt-ds/core';
import { useState, type FC, type ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: FC<AppThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      <SaltProvider theme="salt" mode={mode} density="high">
        <div data-theme-mode={mode} style={{ minHeight: '100vh' }}>
          {children}
        </div>
      </SaltProvider>
    </ThemeContext.Provider>
  );
};
