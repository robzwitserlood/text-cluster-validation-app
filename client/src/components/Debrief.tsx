import { Badge } from '@databricks/appkit-ui/react';
import { CheckCircle2, GraduationCap, XCircle } from 'lucide-react';
import type { DebriefExample } from '../../../shared/types';
import { useTranslate } from '@/lib/i18n-context';
import { ClusterTermList } from './ClusterTermList';
import { TaskItem, type TaskCandidate } from './TaskItem';

/**
 * Post-completion debrief item (T040, US4 — FR-019/FR-020).
 *
 * Re-renders ONE answered item read-only in the session layout: the same {@link TaskItem} the
 * participant used, with the choice controls locked (`hideSubmit`), the participant's own selection
 * marked, and a correct/incorrect indicator plus the system-generated, cluster-framed explanation
 * below. The stepper in `complete.tsx` (T041) drives which example is shown and the Next control.
 *
 * The framing is deliberately about the **clusters**, not the participant: there is no score,
 * pass/fail, or aggregate statistic (Edge Cases), and the copy never grades the person (FR-020). The
 * values here are the only place the correct intruder is revealed (R5) — this renders only after the
 * server reports completion and `GET /api/debrief` succeeds.
 */

export interface DebriefProps {
  example: DebriefExample;
}

function toCandidates(example: DebriefExample): { candidates: TaskCandidate[]; targetHtml?: string } {
  if (example.taskType === 'word') {
    return { candidates: example.candidateWords.map((word) => ({ value: word, label: word })) };
  }
  return {
    targetHtml: example.targetHtml,
    candidates: example.candidates.map((candidate) => ({
      value: candidate.clusterId,
      label: <ClusterTermList terms={candidate.representativeWords} />,
    })),
  };
}

export function Debrief({ example }: DebriefProps) {
  const t = useTranslate();
  const { candidates, targetHtml } = toCandidates(example);
  const title = example.taskType === 'word' ? t('wordTaskPrompt') : t('clusterTaskPrompt');

  return (
    <TaskItem
      title={title}
      targetHtml={targetHtml}
      candidates={candidates}
      // The participant's own selection is marked; the controls are locked (read-only recap).
      value={example.yourSelection.value}
      onChange={() => {}}
      onSubmit={() => {}}
      hideSubmit
      footer={
        <div className="space-y-2">
          <Badge variant="outline" className="gap-1.5">
            {example.correct ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t('debriefCorrect')}
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> {t('debriefIncorrect')}
              </>
            )}
          </Badge>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="h-4 w-4" />
            {t('practiceExplanationHeading')}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{example.clusterValidityExplanation}</p>
        </div>
      }
    />
  );
}
