import React from 'react';
import { cn } from '../../lib/cn';

export interface SegmentOption {
  id: string;
  label: string;
  icon?: any;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className
}) => {
  return (
    <div
      className={cn(
        'p-1 bg-surface-2 rounded-md border border-border inline-flex items-center gap-1 select-none',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'px-3 py-1.5 rounded-sm text-[13px] font-medium transition-all duration-150 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
              isActive
                ? 'bg-surface-3 text-white shadow-sm font-semibold'
                : 'text-text-2 hover:text-text hover:bg-surface-3/50'
            )}
          >
            {Icon && <Icon className={cn('w-4 h-4', isActive ? 'text-accent' : 'text-text-3')} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
