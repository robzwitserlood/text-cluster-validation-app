import type { Phase } from '../../../shared/types';
import { Progress } from '@/components/ui/progress';
import { useMessages } from '@/lib/i18n-context';

const PHASE_ORDER: readonly Phase[] = [
  'welcome',
  'word-instructions',
  'word-practice',
  'word-items',
  'cluster-instructions',
  'cluster-practice',
  'cluster-items',
  'debrief',
  'complete',
];

export interface ProgressBarProps {
  answered: number;
  total: number;
  phase: Phase;
}

export function ProgressBar({ answered, total, phase }: ProgressBarProps) {
  const m = useMessages();
  if (total <= 0) return null;
  const value = Math.min(100, Math.round((answered / total) * 100));

  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const stepLabel = phaseIndex >= 0 ? m.progress.step(phaseIndex + 1, PHASE_ORDER.length) : '';
  const questionLabel = m.progress.question(answered + 1, total);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {stepLabel} — {questionLabel}
      </p>
      <Progress value={value} className="h-2" aria-label={questionLabel} />
    </div>
  );
}