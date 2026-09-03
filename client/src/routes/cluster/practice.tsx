import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PracticeItem } from '@/components/PracticeItem';
import { FlowRouteFrame } from '@/lib/flow-pages';
import { useFlowResponseMutation, useFlowSession } from '@/lib/flow-route-state';
import { loadSessionForPhases } from '@/lib/flow-router';
import type { Selection, SessionState } from '../../../../shared/types';

const PHASE = 'cluster-practice';

export const Route = createFileRoute('/cluster/practice')({
  loader: ({ context }) => loadSessionForPhases(context, ['cluster-practice']),
  component: ClusterPracticePage,
});

function ClusterPracticePage() {
  const { data: session, isPending, isError, refreshAndNavigate, advanceToSession } = useFlowSession();
  const { responseMutation, submitError } = useFlowResponseMutation();
  const [pendingNext, setPendingNext] = useState<SessionState | null>(null);
  const current = session?.current;

  const handlePracticeSubmit = async (selection: Selection): Promise<boolean> => {
    if (!current || current.phase !== PHASE) return false;

    try {
      const result = await responseMutation.mutateAsync({
        itemId: current.practice.itemId,
        taskType: current.practice.taskType,
        selection,
      });
      setPendingNext(result.next);
      return true;
    } catch {
      return false;
    }
  };

  const handlePracticeContinue = () => {
    if (pendingNext) {
      void advanceToSession(pendingNext);
    }
  };

  return (
    <FlowRouteFrame session={session} isPending={isPending} isError={isError} onRetry={() => void refreshAndNavigate()}>
      {current?.phase === PHASE ? (
        <PracticeItem
          // Remount per practice item so `value`/`revealed` reset — the explanation stays hidden
          // until THIS item's answer is submitted (US4, FR-017, research.md R6).
          key={current.practice.itemId}
          practice={current.practice}
          index={current.index}
          of={current.of}
          submitting={responseMutation.isPending}
          error={submitError}
          onSubmit={handlePracticeSubmit}
          onContinue={handlePracticeContinue}
        />
      ) : null}
    </FlowRouteFrame>
  );
}
