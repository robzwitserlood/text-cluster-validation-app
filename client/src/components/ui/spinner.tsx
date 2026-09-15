import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

function Spinner({ className, size = 'default', ...props }: React.ComponentProps<'svg'> & { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'size-4',
    default: 'size-6',
    lg: 'size-8',
  } as const;

  return <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)} {...props} />;
}

export { Spinner };