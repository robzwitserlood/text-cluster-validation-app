import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, GraduationCap, XCircle } from 'lucide-react';
import type { DebriefExample } from '../../../shared/types';
import { useTranslate } from '@/lib/i18n-context';
import { cn } from '@/lib/utils';
import { ClusterTermList } from './ClusterTermList';
import { SafeHtml } from './SafeHtml';

export interface DebriefProps {
  example: DebriefExample;
  onNext: () => void;
  isLast: boolean;
}

interface Candidate {
  value: string;
  label: React.ReactNode;
}

function toCandidates(example: DebriefExample): { candidates: Candidate[]; targetHtml?: string } {
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

export function Debrief({ example, onNext, isLast }: DebriefProps) {
  const t = useTranslate();
  const { candidates, targetHtml } = toCandidates(example);
  const title = example.taskType === 'word' ? t('wordTaskPrompt') : t('clusterTaskPrompt');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {targetHtml ? <SafeHtml html={targetHtml} /> : null}

        <RadioGroup
          value={example.yourSelection.value}
          disabled
          className="grid gap-3 sm:grid-cols-2"
          aria-label={title}
        >
          {candidates.map((candidate) => {
            const id = `debrief-${candidate.value}`;
            const isSelected = example.yourSelection.value === candidate.value;
            return (
              <Label
                key={candidate.value}
                htmlFor={id}
                className={cn(
                  'relative flex cursor-default items-center gap-3 rounded-lg border-2 px-4 py-4 text-left font-medium',
                  isSelected
                    ? 'border-primary bg-accent shadow-sm'
                    : 'border-border bg-card text-muted-foreground'
                )}
              >
                <RadioGroupItem id={id} value={candidate.value} />
                <span className="flex-1">{candidate.label}</span>
                {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : null}
              </Label>
            );
          })}
        </RadioGroup>

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
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onNext}>{isLast ? t('debriefFinish') : t('debriefNext')}</Button>
      </CardFooter>
    </Card>
  );
}