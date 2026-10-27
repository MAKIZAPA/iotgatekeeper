import React from 'react';
import type { UserRecord } from '../types';
import { cn } from '../lib/cn';
import { Badge } from './ui/Badge';
import { Check } from 'lucide-react';

interface IdentityCardProps {
  user: UserRecord;
  isSelected: boolean;
  onSelect: (uid: string) => void;
  onToggleStatus: (uid: string) => void;
}

export const IdentityCard: React.FC<IdentityCardProps> = ({
  user,
  isSelected,
  onSelect,
  onToggleStatus,
}) => {
  const isRevoked = user.status === 'REVOKED';

  const names = user.name.split(' ');
  const initials = names.length >= 2
    ? `${names[0][0]}${names[names.length - 1][0]}`
    : names[0].slice(0, 2).toUpperCase();

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(user.uid)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(user.uid);
        }
      }}
      className={cn(
        'relative p-4 rounded-md border text-left cursor-pointer transition-all duration-150 select-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
        isSelected
          ? 'border-2 border-accent bg-accent/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2/60'
      )}
    >
      {/* Corner Selection Check Icon */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 stroke-[2.5]" />
        </div>
      )}

      {/* Header with Avatar and Basic Info */}
      <div className="flex items-start gap-3 mb-3 pr-6">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 transition-colors',
            isSelected
              ? 'bg-accent text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
              : 'bg-surface-2 text-text-2 border border-border'
          )}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-text truncate leading-snug">
            {user.name}
          </h3>
          <p className="text-[12px] text-text-3 truncate mt-0.5">
            {user.role}
          </p>
        </div>
      </div>

      {/* Technical Data and Vault Badge */}
      <div className="pt-2.5 border-t border-border/80 flex items-center justify-between text-[12px] font-mono">
        <div className="flex items-center gap-1.5 text-text-2">
          <span>UID: <strong className="text-text">{user.uid}</strong></span>
          <span className="text-border">·</span>
          <span>χ² {user.chi2_nominal.toFixed(2)}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(user.uid);
          }}
          className="focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent rounded-full"
          title="Toca para alternar permiso en Vault KV2"
        >
          <Badge
            variant={isRevoked ? 'deny' : 'grant'}
            dot
            className="hover:opacity-85 transition-opacity cursor-pointer"
          >
            {user.status}
          </Badge>
        </button>
      </div>
    </div>
  );
};
