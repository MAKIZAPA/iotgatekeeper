import React from 'react';
import { cn } from '../../lib/cn';
import { Loader2, Check } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'grant' | 'warn' | 'deny' | 'revoke' | 'accent' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  successText?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'accent',
  isLoading = false,
  isSuccess = false,
  loadingText = 'Ejecutando...',
  successText = 'Listo',
  disabled,
  ...props
}) => {
  const baseClasses = 'relative h-11 px-4 rounded-[10px] text-[14px] font-medium transition-all duration-150 inline-flex items-center justify-center gap-2 select-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 overflow-hidden';

  const variantClasses = {
    grant: 'bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-[0_0_15px_rgba(34,197,94,0.25)]',
    warn: 'bg-[#F59E0B] text-black font-semibold hover:bg-[#D97706] shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    deny: 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    revoke: 'bg-[#A855F7] text-white hover:bg-[#9333EA] shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    accent: 'bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-[0_0_15px_rgba(59,130,246,0.25)]',
    secondary: 'bg-surface-2 text-text hover:bg-surface-3 border border-border',
    outline: 'border border-border bg-transparent text-text hover:bg-surface-2',
    ghost: 'bg-transparent text-text-2 hover:text-text hover:bg-surface-2',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{loadingText}</span>
          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/40 overflow-hidden">
            <span className="block h-full bg-white animate-pulse"></span>
          </span>
        </>
      ) : isSuccess ? (
        <>
          <Check className="w-4 h-4 text-white flex-shrink-0" />
          <span>{successText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
