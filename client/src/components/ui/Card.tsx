import React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  elevated = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-md p-5 transition-all duration-150',
        elevated ? 'shadow-sm hover:border-border-strong hover:-translate-y-[1px]' : 'shadow-subtle',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
