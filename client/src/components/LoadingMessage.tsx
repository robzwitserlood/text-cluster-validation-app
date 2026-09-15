import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface LoadingMessageProps {
  children: ReactNode;
  className?: string;
}

export function LoadingMessage({ children, className }: LoadingMessageProps) {
  return (
    <div className={cn('flex items-center justify-center gap-3 text-muted-foreground', className)}>
      <Spinner /> {children}
    </div>
  );
}
