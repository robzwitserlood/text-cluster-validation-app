import { useEffect, useState } from 'react';
import { ThemeProviderContext, type Theme, type ThemeProviderState } from './theme-context';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeProviderState['resolvedTheme']>('light');

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (nextTheme: Theme) => {
      const resolved =
        nextTheme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : nextTheme;

      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };

    applyTheme(theme);

    if (theme !== 'system') {
      return;
    }

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => applyTheme('system');

    systemThemeQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      systemThemeQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
