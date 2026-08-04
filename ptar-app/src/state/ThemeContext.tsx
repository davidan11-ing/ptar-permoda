import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { darkTheme, lightTheme, type ThemeTokens } from '../lib/theme';

interface ThemeContextValue {
  theme: ThemeTokens;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ptar-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('ptar-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
