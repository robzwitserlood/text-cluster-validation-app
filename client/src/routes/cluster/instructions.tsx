import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { InlineErrorAlert } from '@/components/InlineErrorAlert';
import { Instructions } from '@/components/Instructions';
import { acknowledgeInstructions } from '@/lib/api';
import { FlowRouteFrame } from '@/lib/flow-pages';
import { SUBMIT_ERROR, useFlowSession } from '@/lib/flow-route-state';
import { loadSessionForPhases } from '@/lib/flow-router';

export const Route = createFileRoute('/cluster/instructions')({
  loader: ({ context }) => loadSessionForPhases(context, ['cluster-instructions']),
  component: ClusterInstructionsPage,
});

function ClusterInstructionsPage() {
  const { data: session, isPending, isError, refreshAndNavigate } = useFlowSession();
  const [beginError, setBeginError] = useState<string | null>(null);

  const handleBegin = () => {
    setBeginError(null);
    acknowledgeInstructions('cluster');
    void refreshAndNavigate().catch(() => {
      setBeginError(SUBMIT_ERROR);
    });
  };

  return (
    <FlowRouteFrame session={session} isPending={isPending} isError={isError} onRetry={() => void refreshAndNavigate()}>
      <div className="space-y-4">
        <Instructions taskType="cluster" onBegin={handleBegin} />
        {beginError ? <InlineErrorAlert>{beginError}</InlineErrorAlert> : null}
      </div>
    </FlowRouteFrame>
  );
}
