import { useState } from 'react';
import { Badge, Button } from '@databricks/appkit-ui/react';
import { GraduationCap } from 'lucide-react';
import type { ClientPracticeItem, Selection } from '../../../shared/types';
import { useMessages, useTranslate } from '@/lib/i18n-context';
import { ClusterTermList } from './ClusterTermList';
import { TaskItem, type TaskCandidate } from './TaskItem';

/**
 * Practice renderer (T021). Reuses {@link TaskItem} for the choice, then — after the attempt is
 * recorded — reveals the teaching `explanation` (FR-011, exempt from FR-021) and a Continue button.
 *
 * Practice recording is silent: nothing here tells the participant their attempt was stored, and no
 * pass/fail or score is shown (FR-011).
 */

export interface PracticeItemProps {
  practice: ClientPracticeItem;
  index: number;
  of: number;
  /** Records the practice attempt; resolves `true` once stored so the explanation can be revealed. */
  onSubmit: (selection: Selection) => Promise<boolean>;
  /** Advance to the next practice item or the first real item. */
  onContinue: () => void;
  submitting?: boolean;
  error?: string | null;
}

function toCandidates(practice: ClientPracticeItem): { candidates: TaskCandidate[]; targetHtml?: string } {
  if (practice.taskType === 'word') {
    return { candidates: practice.candidateWords.map((word) => ({ value: word, label: word })) };
  }
  return {
    targetHtml: practice.targetHtml,
    candidates: practice.candidates.map((candidate) => ({
      value: candidate.clusterId,
      label: <ClusterTermList terms={candidate.representativeWords} />,
    })),
  };
}

export function PracticeItem({
  practice,
  index,
  of,
  onSubmit,
  onContinue,
  submitting = false,
  error = null,
}: PracticeItemProps) {
  const t = useTranslate();
  const m = useMessages();
  const [value, setValue] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const { candidates, targetHtml } = toCandidates(practice);

  const handleSubmit = () => {
    if (!value || submitting || revealed) return;
    setRevealed(true);
    void onSubmit({ kind: 'candidate', value }).then((recorded) => {
      if (!recorded) setRevealed(false);
    });
  };

  const handleContinue = () => {
    setValue(null);
    setRevealed(false);
    onContinue();
  };

  const isLastPractice = index === of;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{m.practiceLabel(index, of)}</Badge>
      </div>

      {/* The "real questions start on the next page" note appears only on the last practice (FR-006). */}
      {isLastPractice ? <p className="text-sm font-medium text-muted-foreground">{t('practiceRealNext')}</p> : null}

      <TaskItem
        title={practice.taskType === 'word' ? t('wordTaskPrompt') : t('clusterTaskPrompt')}
        description={t('practiceDescription')}
        targetHtml={targetHtml}
        candidates={candidates}
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        submitting={submitting && !revealed}
        hideSubmit={revealed}
        error={error}
        submitLabel={t('practiceCheckAnswer')}
        footer={
          revealed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="h-4 w-4" />
                {t('practiceExplanationHeading')}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{practice.explanation}</p>
            </div>
          ) : null
        }
      />

      {revealed ? (
        <div className="flex justify-end">
          <Button onClick={handleContinue} disabled={submitting}>
            {t('practiceContinue')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
