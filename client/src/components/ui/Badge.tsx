import React from 'react';
import { cn } from '../../lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'grant' | 'deny' | 'warn' | 'revoke' | 'accent' | 'neutral';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  dot = false,
  ...props
}) => {
  const variantStyles = {
    grant: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
    deny: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    warn: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    revoke: 'bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30',
    accent: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
    neutral: 'bg-surface-2 text-text-2 border-border',
  };

  const dotColors = {
    grant: 'bg-[#22C55E]',
    deny: 'bg-[#EF4444]',
    warn: 'bg-[#F59E0B]',
    revoke: 'bg-[#A855F7]',
    accent: 'bg-[#3B82F6]',
    neutral: 'bg-text-3',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[999px] text-[11px] font-mono font-medium border leading-none tracking-normal',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
