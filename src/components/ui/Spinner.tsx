'use client';

import { cn } from '@/lib/cn';

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-2 border-current border-t-transparent animate-spin',
        className,
      )}
      aria-hidden="true"
    />
  );
}
