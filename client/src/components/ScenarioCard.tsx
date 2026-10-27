import React, { useState } from 'react';
import type { ScenarioDefinition } from '../lib/scenarios';
import { Button } from './ui/Button';
import { cn } from '../lib/cn';
import { ShieldCheck, ScanFace, UserX, KeyRound, Info } from 'lucide-react';

interface ScenarioCardProps {
  scenario: ScenarioDefinition;
  onTrigger: (id: string) => void;
  isAnyRunning: boolean;
  isActiveScenario: boolean;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onTrigger,
  isAnyRunning,
  isActiveScenario,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);

  const colorMap = {
    grant: {
      bar: 'bg-[#22C55E]',
      badge: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
      icon: ShieldCheck,
      iconColor: 'text-[#22C55E]',
    },
    warn: {
      bar: 'bg-[#F59E0B]',
      badge: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
      icon: ScanFace,
      iconColor: 'text-[#F59E0B]',
    },
    deny: {
      bar: 'bg-[#EF4444]',
      badge: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
      icon: UserX,
      iconColor: 'text-[#EF4444]',
    },
    revoke: {
      bar: 'bg-[#A855F7]',
      badge: 'bg-[#A855F7]/15 text-[#A855F7] border-[#A855F7]/30',
      icon: KeyRound,
      iconColor: 'text-[#A855F7]',
    },
  };

  const style = colorMap[scenario.type];
  const Icon = style.icon;

  const handleClick = () => {
    onTrigger(scenario.id);
    setIsSuccessFeedback(true);
    setTimeout(() => {
      setIsSuccessFeedback(false);
    }, 1500);
  };

  return (
    <div className="relative bg-surface border border-border rounded-md p-5 flex flex-col justify-between shadow-subtle hover:border-border-strong hover:-translate-y-[1px] transition-all duration-150 overflow-hidden">
      {/* 3px Top Semantic Accent Bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', style.bar)} />

      <div>
        {/* Top Metric & Icon Row */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="w-8 h-8 rounded-sm bg-surface-2 flex items-center justify-center">
            <Icon className={cn('w-4 h-4', style.iconColor)} />
          </div>

          <span className={cn('px-2.5 py-0.5 rounded-[999px] text-[11px] font-mono font-medium border', style.badge)}>
            {scenario.badge}
          </span>
        </div>

        {/* Title and Summary */}
        <h3 className="text-[17px] font-semibold text-text leading-tight mb-1.5 font-sans">
          {scenario.title}
        </h3>

        <p className="text-[13px] text-text-2 leading-snug font-sans mb-3 min-h-[36px]">
          {scenario.summary}
        </p>

        {/* Expandable Technical Flow */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-text-3 hover:text-text flex items-center gap-1 font-mono transition-colors"
          >
            <Info className="w-3 h-3" />
            <span>{showDetails ? 'Ocultar flujo técnico' : 'Ver flujo técnico'}</span>
          </button>

          {showDetails && (
            <div className="mt-2 p-2.5 bg-surface-2 rounded-sm text-[11px] text-text-2 font-mono leading-relaxed border border-border">
              {scenario.technicalFlow}
            </div>
          )}
        </div>
      </div>

      {/* 44px Minimum Touch Action Button */}
      <Button
        variant={scenario.type}
        onClick={handleClick}
        disabled={isAnyRunning && !isActiveScenario}
        isLoading={isActiveScenario}
        isSuccess={isSuccessFeedback}
        loadingText={scenario.runningText}
        successText={scenario.successText}
        className="w-full mt-auto"
      >
        {scenario.actionText}
      </Button>
    </div>
  );
};
