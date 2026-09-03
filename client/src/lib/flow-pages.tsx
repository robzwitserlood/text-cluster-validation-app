import type { ReactNode } from 'react';
import type { SessionState } from '../../../shared/types';
import { LoadError } from '@/components/LoadError';
import { LoadingMessage } from '@/components/LoadingMessage';
import { isItemPhase } from '@/lib/flow-router';
import { ProgressBar } from '@/components/ProgressBar';
import { useTranslate } from '@/lib/i18n-context';

export interface FlowRouteFrameProps {
  session: SessionState | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
}

export function FlowRouteFrame({ session, isPending, isError, onRetry, children }: FlowRouteFrameProps) {
  const t = useTranslate();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {isPending ? <LoadingMessage className="py-24">{t('loading')}</LoadingMessage> : null}
      {isError ? <LoadError onRetry={onRetry} /> : null}
      {session && !isError ? (
        <div className="space-y-6">
          {isItemPhase(session.phase) ? (
            <ProgressBar answered={session.progress.answered} total={session.progress.total} />
          ) : null}
          {children}
        </div>
      ) : null}
    </main>
  );
}
