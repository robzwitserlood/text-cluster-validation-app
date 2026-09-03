import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { InlineErrorAlert } from '@/components/InlineErrorAlert';
import { Instructions } from '@/components/Instructions';
import { acknowledgeInstructions } from '@/lib/api';
import { FlowRouteFrame } from '@/lib/flow-pages';
import { SUBMIT_ERROR, useFlowSession } from '@/lib/flow-route-state';
import { loadSessionForPhases } from '@/lib/flow-router';

export const Route = createFileRoute('/word/instructions')({
  loader: ({ context }) => loadSessionForPhases(context, ['word-instructions']),
  component: WordInstructionsPage,
});

function WordInstructionsPage() {
  const { data: session, isPending, isError, refreshAndNavigate } = useFlowSession();
  const [beginError, setBeginError] = useState<string | null>(null);

  const handleBegin = () => {
    setBeginError(null);
    acknowledgeInstructions('word');
    void refreshAndNavigate().catch(() => {
      setBeginError(SUBMIT_ERROR);
    });
  };

  return (
    <FlowRouteFrame session={session} isPending={isPending} isError={isError} onRetry={() => void refreshAndNavigate()}>
      <div className="space-y-4">
        <Instructions taskType="word" onBegin={handleBegin} />
        {beginError ? <InlineErrorAlert>{beginError}</InlineErrorAlert> : null}
      </div>
    </FlowRouteFrame>
  );
}
