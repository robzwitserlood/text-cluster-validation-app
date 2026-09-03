import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@databricks/appkit-ui/react';

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
