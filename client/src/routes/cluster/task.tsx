import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ClusterTermList } from '@/components/ClusterTermList';
import { TaskItem, type TaskCandidate } from '@/components/TaskItem';
import { useTranslate } from '@/lib/i18n-context';
import { FlowRouteFrame } from '@/lib/flow-pages';
import { useFlowResponseMutation, useFlowSession } from '@/lib/flow-route-state';
import { loadSessionForPhases } from '@/lib/flow-router';

export const Route = createFileRoute('/cluster/task')({
  loader: ({ context }) => loadSessionForPhases(context, ['cluster-items']),
  component: ClusterTaskPage,
});

function ClusterTaskPage() {
  const t = useTranslate();
  const { data: session, isPending, isError, refreshAndNavigate, advanceToSession } = useFlowSession();
  const { responseMutation, submitError } = useFlowResponseMutation();
  const [selection, setSelection] = useState<{ itemId: string; value: string } | null>(null);
  const current = session?.current;

  const itemId = current?.phase === 'cluster-items' ? current.item.itemId : null;
  const selectedValue = itemId && selection?.itemId === itemId ? selection.value : null;

  const handleChange = (value: string) => {
    if (itemId) {
      setSelection({ itemId, value });
    }
  };

  const handleSubmit = async () => {
    if (!selectedValue || !current || current.phase !== 'cluster-items') return;

    try {
      const result = await responseMutation.mutateAsync({
        itemId: current.item.itemId,
        taskType: current.item.taskType,
        selection: { kind: 'candidate', value: selectedValue },
      });
      setSelection(null);
      await advanceToSession(result.next);
    } catch {
      // The mutation's onError handler owns the user-facing error.
    }
  };

  return (
    <FlowRouteFrame session={session} isPending={isPending} isError={isError} onRetry={() => void refreshAndNavigate()}>
      {current?.phase === 'cluster-items' ? (
        <TaskItem
          title={t('clusterTaskPrompt')}
          description={t('clusterTaskDescription')}
          targetHtml={current.item.targetHtml}
          candidates={current.item.candidates.map(
            (candidate): TaskCandidate => ({
              value: candidate.clusterId,
              label: <ClusterTermList terms={candidate.representativeWords} />,
            })
          )}
          value={selectedValue}
          onChange={handleChange}
          submitting={responseMutation.isPending}
          error={submitError}
          onSubmit={() => void handleSubmit()}
        />
      ) : null}
    </FlowRouteFrame>
  );
}
