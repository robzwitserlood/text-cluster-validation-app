import { Progress } from '@/components/ui/progress';
import { useMessages } from '@/lib/i18n-context';

/**
 * Progress indicator (T036, US4).
 *
 * Renders how many real items the participant has completed out of the total in their assigned
 * Session, driven entirely by `SessionState.progress` (FR-007). Practice attempts are already
 * excluded server-side, so this never reflects them. Renders nothing when there are no real items
 * to report (e.g. an empty Session).
 */

export interface ProgressBarProps {
  answered: number;
  total: number;
}

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const m = useMessages();
  if (total <= 0) return null;
  const value = Math.min(100, Math.round((answered / total) * 100));
  const label = m.progressAnswered(answered, total);

  return (
    <div className="space-y-1">
      <Progress value={value} className="h-2" aria-label={label} />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
