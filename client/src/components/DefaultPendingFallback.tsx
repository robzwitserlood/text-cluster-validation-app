import { LoadingMessage } from '@/components/LoadingMessage';
import { useTranslate } from '@/lib/i18n-context';

/** Router-level `defaultPendingComponent` — shown while a route loader is in flight (FR-001/FR-002). */
export function DefaultPendingFallback() {
  const t = useTranslate();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <LoadingMessage className="py-24">{t('loading')}</LoadingMessage>
    </main>
  );
}
