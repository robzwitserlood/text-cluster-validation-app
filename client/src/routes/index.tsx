import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { InlineErrorAlert } from '@/components/InlineErrorAlert';
import { Welcome } from '@/components/Welcome';
import { acknowledgeInstructions } from '@/lib/api';
import { FlowRouteFrame } from '@/lib/flow-pages';
import { SUBMIT_ERROR, useFlowSession } from '@/lib/flow-route-state';
import { loadSessionForPhases } from '@/lib/flow-router';

/**
 * Welcome home page — the server-driven flow entrypoint (US1).
 *
 * The server still owns phase order. This index route reads `GET /api/session`; when the phase is
 * `welcome` (a first-time visitor at the very start) it renders the `Welcome` component, and for
 * every other phase the loader redirects to the matching page — so a returning in-progress
 * participant lands on their current phase, never the welcome page (FR-005). Begin records the
 * non-PII `welcome` acknowledgement (localStorage + `X-Ack-Instructions`) and advances into the
 * existing flow via `refreshAndNavigate()`.
 */

export const Route = createFileRoute('/')({
  loader: ({ context }) => loadSessionForPhases(context, ['welcome']),
  component: IndexRoutePage,
});

function IndexRoutePage() {
  const { data: session, isPending, isError, refreshAndNavigate } = useFlowSession();
  const [beginError, setBeginError] = useState<string | null>(null);

  const handleBegin = () => {
    setBeginError(null);
    acknowledgeInstructions('welcome');
    void refreshAndNavigate().catch(() => {
      setBeginError(SUBMIT_ERROR);
    });
  };

  const welcome = session?.current.phase === 'welcome' ? session.current.welcome : null;

  return (
    <FlowRouteFrame session={session} isPending={isPending} isError={isError} onRetry={() => void refreshAndNavigate()}>
      {welcome ? (
        <div className="space-y-4">
          <Welcome welcome={welcome} onBegin={handleBegin} />
          {beginError ? <InlineErrorAlert>{beginError}</InlineErrorAlert> : null}
        </div>
      ) : null}
    </FlowRouteFrame>
  );
}
