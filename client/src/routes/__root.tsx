import { ThemeProvider } from '@/components/apx/theme-provider';
import { Toaster } from '@databricks/appkit-ui/react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { surveyLanguage } from '@/lib/config';
import { LanguageProvider } from '@/lib/i18n';
import { PblChrome } from '@/components/PblChrome';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="apx-ui-theme">
      <LanguageProvider language={surveyLanguage}>
        <PblChrome>
          <Outlet />
        </PblChrome>
        <Toaster richColors />
      </LanguageProvider>
    </ThemeProvider>
  );
}
