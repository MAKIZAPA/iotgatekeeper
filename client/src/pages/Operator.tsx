import React, { useState } from 'react';
import { useGatekeeper } from '../context/GatekeeperContext';
import { SCENARIOS } from '../lib/scenarios';
import { GatewayStatus } from '../components/GatewayStatus';
import { IdentityCard } from '../components/IdentityCard';
import { ScenarioCard } from '../components/ScenarioCard';
import { EventLog } from '../components/EventLog';
import { Button } from '../components/ui/Button';
import { NavigationHeader } from '../components/NavigationHeader';
import {
  RotateCcw,
  Copy,
  Check,
  Radio,
  Camera,
  Lock,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';

interface OperatorProps {
  onNavigate?: (path: string) => void;
}

export const Operator: React.FC<OperatorProps> = () => {
  const {
    state,
    isConnected,
    triggerScenario,
    resetFsm,
    toggleUserStatus,
    executeManualStep
  } = useGatekeeper();

  const [selectedUid, setSelectedUid] = useState<string>('04:A1:88:C2');
  const [copiedUid, setCopiedUid] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  if (!state) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-mono text-xs text-text-3">
        Iniciando consola del operador...
      </div>
    );
  }

  const isRunning = state.currentState !== 'IDLE' && state.currentState !== 'GRANT' && state.currentState !== 'DENY';

  const handleCopyUid = () => {
    navigator.clipboard.writeText(selectedUid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleTrigger = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    triggerScenario(scenarioId, selectedUid, scenarioId === 'LBPH_MISMATCH' ? 68.90 : undefined);
    setTimeout(() => {
      setActiveScenarioId(null);
    }, 2500);
  };

  const phases = [
    {
      key: 'READ_RFID' as const,
      number: '01',
      title: 'Lectura RFID',
      bus: 'SPI DMA · 10 MHz',
      icon: Radio,
      desc: 'Sondeo de tarjeta y decodificación de UID por bus SPI'
    },
    {
      key: 'BIOMETRIC_VER' as const,
      number: '02',
      title: 'Biometría Facial',
      bus: 'ESP-NOW / UART',
      icon: Camera,
      desc: 'Mapeo facial 3D, descriptor LBPH y prueba de vida'
    },
    {
      key: 'VAULT_AUTH' as const,
      number: '03',
      title: 'Custodia Vault',
      bus: 'TLS 1.3 · Port 8200',
      icon: Lock,
      desc: 'Consulta criptográfica TLS 1.3 al motor Vault KV2'
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-accent/30 selection:text-white bg-dark-grid relative">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-0 left-0 right-0 h-96 ambient-glow pointer-events-none" />

      {/* Fixed Sticky Header */}
      <NavigationHeader isConnected={isConnected} viewTitle="Consola del Operador" />

      {/* Main Operator Canvas */}
      <main className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6 flex-grow">
        {/* Title and Reset Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold text-text tracking-tight leading-tight">
              Consola del operador
            </h1>
            <p className="text-[15px] text-text-2 mt-0.5">
              Controla las pruebas sin afectar la vista del jurado.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => resetFsm()}
            className="self-start sm:self-auto font-mono text-xs"
          >
            <RotateCcw className="w-4 h-4 text-text-3" />
            <span>Reiniciar a IDLE</span>
          </Button>
        </div>

        {/* 1. HERO: Gateway Status Indicator */}
        <GatewayStatus
          state={state.currentState}
          relayActive={state.telemetry.relay_active}
          relayCountdownMs={state.telemetry.relay_countdown_ms}
          activeUser={state.activeUser}
        />

        {/* 2. Control Manual por Fases (Wizard of Oz para el Profesor) */}
        <section className="bg-surface border border-border rounded-md p-5 shadow-subtle flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border gap-2">
            <div>
              <h2 className="text-[17px] font-semibold text-text leading-tight font-sans">
                Control manual por fases (Demostración Mago de Oz)
              </h2>
              <p className="text-[12px] text-text-3 font-sans mt-0.5">
                Haz clic en una fase para activarla en naranja (pantalla del profesor). Luego pulsa Aprobar (✓) para que avance a verde o Denegar (✕) para bloquear.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => resetFsm()}
                className="text-xs font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar a IDLE</span>
              </Button>
            </div>
          </div>

          {/* 3 Interactive Phase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {phases.map((phase) => {
              const Icon = phase.icon;
              const isActive = state.currentState === phase.key;
              const detail = state.stepDetails[phase.key];
              const isCompleted = detail?.status === 'completed';
              const isFailed = detail?.status === 'failed';

              let cardStyles = 'bg-surface-2/40 border-border text-text-3 hover:border-text-3/60';
              let badgeStyles = 'bg-surface-2 text-text-3 border-border';
              let badgeText = 'PENDIENTE';

              if (isActive) {
                cardStyles = 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.25)]';
                badgeStyles = 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 animate-pulse';
                badgeText = 'EN ESPERA... (NARANJA)';
              } else if (isCompleted) {
                cardStyles = 'bg-[#22C55E]/10 border-[#22C55E]/60 text-[#22C55E]';
                badgeStyles = 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50';
                badgeText = 'VALIDADO ✓';
              } else if (isFailed) {
                cardStyles = 'bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444]';
                badgeStyles = 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50';
                badgeText = 'FALLO ✕';
              }

              return (
                <div
                  key={phase.key}
                  onClick={() => {
                    if (!isActive) {
                      executeManualStep(phase.key, 'start', selectedUid);
                    }
                  }}
                  className={`border rounded-md p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer ${cardStyles}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] font-bold tracking-wider opacity-70">
                        FASE {phase.number}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeStyles}`}>
                        {badgeText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-1.5">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <h3 className="font-bold text-[15px] font-sans text-text leading-tight">
                        {phase.title}
                      </h3>
                    </div>

                    <p className="text-[12px] opacity-80 font-sans leading-snug mb-3">
                      {phase.desc}
                    </p>
                  </div>

                  {/* If phase is active: render the TWO decision buttons */}
                  {isActive ? (
                    <div className="pt-3 border-t border-current/20 flex flex-col gap-2">
                      <span className="text-[11px] font-mono font-semibold opacity-90 text-center">
                        Decisión para el profesor:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            executeManualStep(phase.key, 'approve', selectedUid);
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-grant/25 hover:bg-grant/35 text-grant border border-grant/60 font-bold font-mono text-xs shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprobar (✓)</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            executeManualStep(phase.key, 'deny', selectedUid);
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-deny/25 hover:bg-deny/35 text-deny border border-deny/60 font-bold font-mono text-xs shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all hover:scale-[1.02]"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Denegar (✕)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 text-[11px] font-mono opacity-60 text-center">
                      {isCompleted ? 'Clic para reactivar fase' : 'Clic para activar fase'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active 10-Second Countdown Banner when GRANT or DENY */}
          {(state.currentState === 'GRANT' || state.currentState === 'DENY') && (
            <div
              className={`p-4 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in ${
                state.currentState === 'GRANT'
                  ? 'bg-grant/15 border-grant/40 text-grant'
                  : 'bg-deny/15 border-deny/40 text-deny'
              }`}
            >
              <div className="flex items-center gap-3">
                {state.currentState === 'GRANT' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm font-sans">
                    {state.currentState === 'GRANT'
                      ? 'Acceso Concedido (GRANT) · Relé GPIO14 cerrado (12V Solenoide activo)'
                      : 'Acceso Denegado (DENY) · Intento bloqueado y registrado en auditoría'}
                  </div>
                  <div className="text-xs font-mono opacity-90 mt-0.5">
                    Reiniciando automáticamente a IDLE en{' '}
                    <strong className="underline">{Math.ceil(state.telemetry.relay_countdown_ms / 1000) || 10}s</strong>...
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => resetFsm()}
                className="px-3 py-1.5 rounded bg-surface border border-border text-text font-mono text-xs font-bold hover:bg-surface-2 transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar a IDLE ahora</span>
              </button>
            </div>
          )}

          {/* Quick Direct Actions Toolbar */}
          <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <span className="text-text-3 font-sans">Atajos directos:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => executeManualStep('READ_RFID', 'start', selectedUid)}
                className="px-2.5 py-1 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] font-semibold hover:bg-[#F59E0B]/20 transition-all flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>Iniciar Fase 1 (RFID)</span>
              </button>
              <button
                type="button"
                onClick={() => executeManualStep('GRANT', 'start', selectedUid)}
                className="px-2.5 py-1 rounded bg-grant/15 border border-grant/30 text-grant font-semibold hover:bg-grant/25 transition-all"
              >
                Forzar GRANT
              </button>
              <button
                type="button"
                onClick={() => executeManualStep('DENY', 'start', selectedUid)}
                className="px-2.5 py-1 rounded bg-deny/15 border border-deny/30 text-deny font-semibold hover:bg-deny/25 transition-all"
              >
                Forzar DENY
              </button>
              <button
                type="button"
                onClick={() => resetFsm()}
                className="px-2.5 py-1 rounded bg-surface-2 border border-border text-text-3 hover:text-text hover:bg-border transition-all"
              >
                IDLE (Reposo)
              </button>
            </div>
          </div>
        </section>

        {/* 3. Identidad de prueba */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-[20px] font-semibold text-text leading-tight">
                Identidad de prueba
              </h2>
              <p className="text-[13px] text-text-3 mt-0.5">
                Selecciona la tarjeta RFID que enviará los datos al gateway.
              </p>
            </div>

            {/* Selected UID with Copy button */}
            <div className="flex items-center gap-2 font-mono text-[12px] bg-surface border border-border px-3 py-1.5 rounded-sm shadow-subtle self-start sm:self-auto">
              <span className="text-text-3">UID seleccionado:</span>
              <strong className="text-text">{selectedUid}</strong>
              <button
                type="button"
                onClick={handleCopyUid}
                className="text-text-3 hover:text-text transition-colors p-1"
                title="Copiar UID"
              >
                {copiedUid ? <Check className="w-3.5 h-3.5 text-grant" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Radio Group */}
          <div
            role="radiogroup"
            aria-label="Selección de identidad"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {state.users.map((user) => (
              <IdentityCard
                key={user.id}
                user={user}
                isSelected={user.uid === selectedUid}
                onSelect={(uid) => {
                  setSelectedUid(uid);
                }}
                onToggleStatus={toggleUserStatus}
              />
            ))}
          </div>
        </section>

        {/* 4. Escenarios automatizados */}
        <section>
          <div className="mb-3">
            <h2 className="text-[20px] font-semibold text-text leading-tight">
              Escenarios automatizados
            </h2>
            <p className="text-[13px] text-text-3 mt-0.5">
              Ejecuta pruebas completas de extremo a extremo con un solo clic.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onTrigger={handleTrigger}
                isAnyRunning={isRunning}
                isActiveScenario={activeScenarioId === scenario.id}
              />
            ))}
          </div>
        </section>

        {/* 5. Event Log */}
        <section>
          <EventLog logs={state.recentLogs} />
        </section>
      </main>
    </div>
  );
};
