import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { Debrief } from '@/components/Debrief';
import { LoadingMessage } from '@/components/LoadingMessage';
import { FlowRouteFrame } from '@/lib/flow-pages';
import { useFlowSession } from '@/lib/flow-route-state';
import { isTerminalPhase, loadSessionForPhases } from '@/lib/flow-router';
import { useTranslate } from '@/lib/i18n-context';
import { debriefQueryOptions } from '@/lib/queries';
import type { DebriefExample } from '../../../shared/types';

export const Route = createFileRoute('/complete')({
  loader: ({ context }) => loadSessionForPhases(context, ['debrief', 'complete']),
  component: CompletionPage,
});

/** The three read-only completion states (US4, FR-018/FR-021). The walkthrough writes nothing (FR-022). */
type Step = 'thankYou' | 'walkthrough' | 'closing';

function CompletionPage() {
  const t = useTranslate();
  const { data: session, isPending, isError, refreshAndNavigate } = useFlowSession();
  const { data: debrief, isPending: isDebriefPending } = useQuery({
    ...debriefQueryOptions(),
    enabled: !!session && isTerminalPhase(session.phase),
  });

  const [step, setStep] = useState<Step>('thankYou');
  const [index, setIndex] = useState(0);

  return (
    <FlowRouteFrame session={session} isPending={isPending} isError={isError} onRetry={() => void refreshAndNavigate()}>
      {step === 'thankYou' ? (
        <ThankYou onContinue={() => setStep('walkthrough')} debriefLoading={isDebriefPending} />
      ) : null}

      {step === 'walkthrough' ? (
        isDebriefPending || !debrief ? (
          <Card>
            <CardContent>
              <LoadingMessage className="py-16">{t('debriefPreparing')}</LoadingMessage>
            </CardContent>
          </Card>
        ) : (
          <Walkthrough
            examples={debrief.examples}
            index={index}
            onNext={() => {
              if (index + 1 < debrief.examples.length) {
                setIndex(index + 1);
              } else {
                setStep('closing');
              }
            }}
          />
        )
      ) : null}

      {step === 'closing' ? <Closing /> : null}
    </FlowRouteFrame>
  );
}

/** Step 1 — thank-you: states the survey is complete, offers close guidance and a continue control. */
function ThankYou({ onContinue, debriefLoading }: { onContinue: () => void; debriefLoading: boolean }) {
  const t = useTranslate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <CardTitle>{t('completeTitle')}</CardTitle>
        </div>
        <CardDescription>{t('completeThankYou')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('completeCloseHint')}</p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onContinue} disabled={debriefLoading}>
            {t('completeContinue')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Step 2 — walkthrough: one answered item re-rendered read-only in the session layout, with Next. */
function Walkthrough({ examples, index, onNext }: { examples: DebriefExample[]; index: number; onNext: () => void }) {
  const t = useTranslate();
  const example = examples[index];
  if (!example) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('debriefTitle')}</CardTitle>
        </CardHeader>
      </Card>

      <Debrief key={example.itemId} example={example} />

      <div className="flex justify-end">
        <Button onClick={onNext}>{t('debriefNext')}</Button>
      </div>
    </div>
  );
}

/** Step 3 — closing: a final thank-you indicating the window may be closed. */
function Closing() {
  const t = useTranslate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <CardTitle>{t('closingTitle')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('closingBody')}</p>
      </CardContent>
    </Card>
  );
}
