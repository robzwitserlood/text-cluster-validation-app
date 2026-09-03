import type { ReactNode } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  Spinner,
} from '@databricks/appkit-ui/react';
import { CheckCircle2 } from 'lucide-react';
import { InlineErrorAlert } from '@/components/InlineErrorAlert';
import { LoadingMessage } from '@/components/LoadingMessage';
import { SafeHtml } from '@/components/SafeHtml';
import { useTranslate } from '@/lib/i18n-context';
import { cn } from '@/lib/utils';

/**
 * Shared single-select item renderer for the word (and, from US2, cluster) tasks (T019, FR-002,
 * FR-015, R12).
 *
 * Uses a keyboard-operable radio group (arrow keys move, Space/Enter select; visible focus rings)
 * so the whole flow is completable without a mouse (SC-006). The choice is forced: the submit
 * button stays disabled until a candidate is selected, blocking an empty submit (FR-002). The
 * intruder is never marked — candidates arrive pre-shuffled and unlabelled from the server (R5/R6).
 */

export interface TaskCandidate {
  /** The value recorded on submit — a word, or (US2) a clusterId. */
  value: string;
  /** What the participant sees for this candidate. */
  label: ReactNode;
}

export interface TaskItemProps {
  title: string;
  description?: string;
  /** Server-sanitized target document HTML shown above the choices (cluster task, US2). */
  targetHtml?: string;
  candidates: TaskCandidate[];
  /** The currently selected candidate value, or `null` for no selection. */
  value: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  /** A generic, PII-free error message to surface (R10). */
  error?: string | null;
  submitLabel?: string;
  loading?: boolean;
  /** When true, hides the submit button and locks the choice controls. */
  hideSubmit?: boolean;
  /** Left-aligned content shown in place of the submit button (e.g. practice explanation). */
  footer?: ReactNode;
}

export function TaskItem({
  title,
  description,
  targetHtml,
  candidates,
  value,
  onChange,
  onSubmit,
  submitting = false,
  error = null,
  submitLabel,
  loading = false,
  hideSubmit = false,
  footer = null,
}: TaskItemProps) {
  const t = useTranslate();
  const resolvedSubmitLabel = submitLabel ?? t('taskSubmit');

  if (loading) {
    return (
      <Card>
        <CardContent>
          <LoadingMessage className="py-16">{t('loading')}</LoadingMessage>
        </CardContent>
      </Card>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <Empty>
            <EmptyTitle>{t('taskNothingToShowTitle')}</EmptyTitle>
            <EmptyDescription>{t('taskNothingToShowDescription')}</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const disabled = submitting || hideSubmit;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {targetHtml ? <SafeHtml html={targetHtml} /> : null}

        <RadioGroup
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="grid gap-3 sm:grid-cols-2"
          aria-label={title}
        >
          {candidates.map((candidate) => {
            const id = `candidate-${candidate.value}`;
            const isSelected = value === candidate.value;
            return (
              <Label
                key={candidate.value}
                htmlFor={id}
                className={cn(
                  'relative flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-4 text-left font-medium transition-all',
                  'hover:border-primary/60 hover:bg-primary/5',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-card text-foreground'
                )}
              >
                <RadioGroupItem id={id} value={candidate.value} />
                <span className="flex-1">{candidate.label}</span>
                {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : null}
              </Label>
            );
          })}
        </RadioGroup>

        {error ? <InlineErrorAlert>{error}</InlineErrorAlert> : null}

        {footer ? <div className="text-left">{footer}</div> : null}

        {!hideSubmit ? (
          <div className="flex justify-end">
            <Button onClick={onSubmit} disabled={!value || submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2" /> {t('taskSubmitting')}
                </>
              ) : (
                resolvedSubmitLabel
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
