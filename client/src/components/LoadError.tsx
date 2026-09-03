import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle, Button } from '@databricks/appkit-ui/react';
import { TriangleAlert } from 'lucide-react';
import { useTranslate } from '@/lib/i18n-context';

export interface LoadErrorProps {
  onRetry: () => void;
  title?: ReactNode;
  description?: string;
  retryLabel?: string;
}

export function LoadError({ onRetry, title, description, retryLabel }: LoadErrorProps) {
  const t = useTranslate();
  const displayTitle = title ?? t('loadErrorTitle');
  const displayDescription = description ?? t('loadErrorDescription');
  const displayRetryLabel = retryLabel ?? t('loadErrorRetry');

  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{displayTitle}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{displayDescription}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {displayRetryLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
