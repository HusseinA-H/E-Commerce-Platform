import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full bg-background border border-outline-variant px-md py-3 text-sm text-foreground font-sans rounded-lg outline-none transition-colors focus:border-tertiary focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-on-surface-variant/40',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };