import { Moon, Sun } from 'lucide-react';

import { Button } from '@databricks/appkit-ui/react';
import { useTheme } from '@/components/apx/theme-context';

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-8 w-8 rounded-sm p-2 transition-transform duration-200 ease-in-out hover:scale-110"
    >
      <Sun className="absolute inset-0 m-auto h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute inset-0 m-auto h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
