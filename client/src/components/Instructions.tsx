import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TriangleAlert } from 'lucide-react';
import type { TaskType } from '../../../shared/types';
import { useTranslate } from '@/lib/i18n-context';

/**
 * Per-task instructions screen (T008/US1, FR-003–FR-005).
 *
 * Renders a single subtitle (which carries the former informational "how it works" guidance, now
 * folded into the lede) and at most one supporting box holding the essential reminders: answers are
 * final (FR-012), completing in one sitting with pause/resume possible (FR-004), and practice-first
 * (FR-005). There is no "progress saved to this browser" line and no stop-survey control (FR-007). It
 * deliberately makes NO mention of practice being recorded — practice recording is silent (FR-011).
 * All chrome is looked up in the deployment language via `t()`; only built-in catalog keys are used,
 * never researcher content (FR-014/FR-015).
 */

export interface InstructionsProps {
  taskType: TaskType;
  onBegin: () => void;
}

/** Per-task-type catalog keys for the title + single subtitle (the folded-in "how it works" copy). */
const COPY_KEYS = {
  word: { title: 'wordInstructionsTitle', lede: 'wordInstructionsLede' },
  cluster: { title: 'clusterInstructionsTitle', lede: 'clusterInstructionsLede' },
} as const satisfies Record<TaskType, { title: string; lede: string }>;

export function Instructions({ taskType, onBegin }: InstructionsProps) {
  const t = useTranslate();
  const keys = COPY_KEYS[taskType];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t(keys.title)}</CardTitle>
        <CardDescription>{t(keys.lede)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t('instructionsBeforeYouBegin')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              <li>{t('instructionsAnswersFinal')}</li>
              <li>{t('instructionsOneSitting')}</li>
              <li>{t('instructionsPracticeFirst')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={onBegin}>{t('instructionsBegin')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
