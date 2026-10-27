import React from 'react';
import { Radio, Eye, ShieldCheck, CheckCircle2, XCircle, Check, Loader2 } from 'lucide-react';
import type { FsmState, FsmStepDetail } from '../types';
import { cn } from '../lib/cn';

interface FsmTimelineProps {
  currentState: FsmState;
  stepDetails: Record<FsmState, FsmStepDetail>;
  totalLatencyMs?: number;
}

export const FsmTimeline: React.FC<FsmTimelineProps> = ({
  currentState,
  stepDetails
}) => {
  const steps: { key: FsmState; icon: any; stageNum: string; hardwareBus: string }[] = [
    { key: 'IDLE', icon: Radio, stageNum: '01', hardwareBus: 'MFRC522 Polling' },
    { key: 'READ_RFID', icon: Radio, stageNum: '02', hardwareBus: 'SPI DMA 10MHz' },
    { key: 'BIOMETRIC_VER', icon: Eye, stageNum: '03', hardwareBus: 'ESP-NOW 2.4GHz' },
    { key: 'VAULT_AUTH', icon: ShieldCheck, stageNum: '04', hardwareBus: 'TLS 1.3 :8200' },
    { key: 'GRANT', icon: CheckCircle2, stageNum: '05', hardwareBus: '' },
    { key: 'DENY', icon: XCircle, stageNum: '06', hardwareBus: 'Lock Audit' },
  ];

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-subtle">
      {/* Clean Single Title */}
      <h2 className="text-[18px] font-semibold text-text mb-4 tracking-tight">
        Fases
      </h2>

      {/* 6 Sequential Dynamic Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {steps.map(({ key, icon: Icon, stageNum, hardwareBus }) => {
          const step = stepDetails[key];
          const isActive = currentState === key;
          const isCompleted = step?.status === 'completed' && !isActive;
          const isFailed = step?.status === 'failed' && !isActive;

          // Color tokens:
          // Active = MEDIO NARANJA (Ilumina completamente todo el cuadro con resplandor intenso)
          // Completed = VERDE (Ilumina completamente todo el cuadro con verde resplandeciente)
          // Failed = ROJO (Ilumina completamente todo el cuadro en rojo de alerta)
          // Pending = Atenuado
          let borderClass = 'border border-border/80';
          let bgClass = 'bg-surface-2/60';
          let titleColor = 'text-text-2 font-medium';
          let badgeClass = 'bg-surface-3 text-text-3 border-border';
          let timeBadge = 'text-text-3';
          let hardwareColor = 'text-text-3';
          let footerDivider = 'border-border/60';
          let footerStatusText = 'PENDIENTE';
          let footerStatusClass = 'text-text-3';

          if (isActive) {
            // Cuadro completamente iluminado en naranja / ámbar intenso y radiante
            borderClass = 'border-2 border-[#F59E0B] shadow-[0_0_28px_rgba(245,158,11,0.4),inset_0_0_24px_rgba(245,158,11,0.25)]';
            bgClass = 'bg-gradient-to-b from-[#F59E0B]/35 via-[#F59E0B]/20 to-[#F59E0B]/12';
            titleColor = 'text-white font-bold text-[14px] drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]';
            badgeClass = 'bg-[#F59E0B] text-black font-extrabold border-transparent shadow-[0_0_12px_#F59E0B]';
            timeBadge = 'text-[#FDE68A] font-bold';
            hardwareColor = 'text-[#FDE68A] font-semibold';
            footerDivider = 'border-[#F59E0B]/40';
            footerStatusText = 'EN ESPERA...';
            footerStatusClass = 'text-[#FCD34D] font-extrabold animate-pulse';
          } else if (isCompleted) {
            // Cuadro completamente iluminado en verde esmeralda validado
            borderClass = 'border-2 border-[#22C55E] shadow-[0_0_28px_rgba(34,197,94,0.4),inset_0_0_24px_rgba(34,197,94,0.25)]';
            bgClass = 'bg-gradient-to-b from-[#22C55E]/30 via-[#22C55E]/20 to-[#22C55E]/10';
            titleColor = 'text-white font-bold text-[14px] drop-shadow-[0_0_8px_rgba(34,197,94,0.7)]';
            badgeClass = 'bg-[#22C55E] text-black font-extrabold border-transparent shadow-[0_0_12px_#22C55E]';
            timeBadge = 'text-[#BBF7D0] font-bold';
            hardwareColor = 'text-[#BBF7D0] font-semibold';
            footerDivider = 'border-[#22C55E]/40';
            footerStatusText = 'VALIDADO ✓';
            footerStatusClass = 'text-[#86EFAC] font-extrabold';
          } else if (isFailed) {
            // Cuadro completamente iluminado en rojo intenso
            borderClass = 'border-2 border-[#EF4444] shadow-[0_0_28px_rgba(239,68,68,0.4),inset_0_0_24px_rgba(239,68,68,0.25)]';
            bgClass = 'bg-gradient-to-b from-[#EF4444]/35 via-[#EF4444]/20 to-[#EF4444]/12';
            titleColor = 'text-white font-bold text-[14px] drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]';
            badgeClass = 'bg-[#EF4444] text-white font-extrabold border-transparent shadow-[0_0_12px_#EF4444]';
            timeBadge = 'text-[#FECACA] font-bold';
            hardwareColor = 'text-[#FECACA] font-semibold';
            footerDivider = 'border-[#EF4444]/40';
            footerStatusText = 'FALLO ✕';
            footerStatusClass = 'text-[#FCA5A5] font-extrabold';
          }

          return (
            <div
              key={key}
              className={cn(
                'rounded-md p-3.5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden',
                borderClass,
                bgClass
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full border', badgeClass)}>
                    {stageNum}
                  </span>
                  <div className={cn('flex items-center gap-1 font-mono text-[11px]', timeBadge)}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{step?.nominal_ms ? `${step.nominal_ms}ms` : '--'}</span>
                  </div>
                </div>

                <div className={cn('text-[13px] leading-tight mb-1 min-h-[34px] flex items-center', titleColor)}>
                  {step?.label.split('(')[0].replace(/^\d+\.\s*/, '')}
                </div>

                {hardwareBus ? (
                  <div className="text-[11px] font-mono flex items-center gap-1.5">
                    <span className="opacity-70 text-text-3">Bus:</span>
                    <span className={cn('truncate', hardwareColor)}>{hardwareBus}</span>
                  </div>
                ) : (
                  <div className="text-[11px] font-mono h-[16px]" aria-hidden="true" />
                )}
              </div>

              {/* Status Footer Pill */}
              <div className={cn('mt-3.5 pt-2 border-t flex items-center justify-between text-[11px] font-mono', footerDivider)}>
                <span className={cn('opacity-80', timeBadge)}>
                  {step?.actual_ms > 0 ? `${step.actual_ms}ms` : 'Espera'}
                </span>
                <span className={cn('flex items-center gap-1.5', footerStatusClass)}>
                  {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isCompleted && <Check className="w-3.5 h-3.5" />}
                  <span>{footerStatusText}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
