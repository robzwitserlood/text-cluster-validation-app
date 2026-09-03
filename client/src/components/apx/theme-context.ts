import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light' | 'system';

export type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: Exclude<Theme, 'system'>;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function useTheme(): ThemeProviderState {
  return useContext(ThemeProviderContext);
}
