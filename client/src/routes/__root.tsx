import { Toaster } from '@/components/ui/sonner';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { surveyLanguage } from '@/lib/config';
import { LanguageProvider } from '@/lib/i18n';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <LanguageProvider language={surveyLanguage}>
      <Outlet />
      <Toaster />
    </LanguageProvider>
  );
}
