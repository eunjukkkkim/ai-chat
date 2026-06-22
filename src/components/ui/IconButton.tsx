'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function IconButton({ children, className, style, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center bg-transparent border-none cursor-pointer text-muted hover:text-ink-strong rounded-[7px] transition-colors',
        className,
      )}
      style={{
        boxShadow: 'inset 0 0 0 1px #232934',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
