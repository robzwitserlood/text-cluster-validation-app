import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface InlineErrorAlertProps {
  children: ReactNode;
}

export function InlineErrorAlert({ children }: InlineErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
