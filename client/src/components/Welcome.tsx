import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Markdown from 'react-markdown';
import type { WelcomeContent } from '../../../shared/types';
import { useTranslate } from '@/lib/i18n-context';

/**
 * Welcome home page (T018, US1, FR-001–FR-005/FR-012).
 *
 * The first screen a first-time participant sees at `/`: a researcher-authored (or localized-default)
 * Markdown introduction and a single keyboard-reachable Begin control that advances into the flow. The
 * introduction comes from the server-resolved `welcome` copy and is rendered as authored (never
 * translated, FR-015); only the Begin label is looked up in the deployment language via `t()`. The
 * page reveals no task answers or ground truth (FR-004). Built from shadcn/ui with a
 * visible focus ring on Begin so the whole page is completable by keyboard (FR-010, Constitution I).
 */

export interface WelcomeProps {
  welcome: WelcomeContent;
  onBegin: () => void;
}

export function Welcome({ welcome, onBegin }: WelcomeProps) {
  const t = useTranslate();

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="survey-prose prose max-w-none">
          <Markdown>{welcome.content}</Markdown>
        </div>

        <div className="flex justify-end">
          <Button onClick={onBegin}>{t('welcomeBegin')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
