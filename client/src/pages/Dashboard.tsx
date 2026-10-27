import React from 'react';
import { useGatekeeper } from '../context/GatekeeperContext';
import { NavigationHeader } from '../components/NavigationHeader';
import { GatewayStatus } from '../components/GatewayStatus';
import { FsmTimeline } from '../components/FsmTimeline';
import { CameraLbphView } from '../components/CameraLbphView';
import { VaultInspector } from '../components/VaultInspector';
import { TelemetryPanel } from '../components/TelemetryPanel';
import { AuditTable } from '../components/AuditTable';

interface DashboardProps {
  onNavigate?: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const { state, isConnected } = useGatekeeper();

  if (!state) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-mono text-xs text-text-3">
        Iniciando monitor del gateway...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-accent/30 selection:text-white bg-dark-grid relative">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-0 left-0 right-0 h-96 ambient-glow pointer-events-none" />

      {/* Fixed Sticky Header */}
      <NavigationHeader isConnected={isConnected} />

      {/* Main Dashboard Canvas */}
      <main className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6 flex-grow z-10">
        {/* Clean Page Title */}
        <div className="pb-3 border-b border-border">
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-text tracking-tight leading-tight">
            IoT Gatekeeper
          </h1>
        </div>

        {/* 1. Gateway Status HERO Card */}
        <GatewayStatus
          state={state.currentState}
          relayActive={state.telemetry.relay_active}
          relayCountdownMs={state.telemetry.relay_countdown_ms}
          activeUser={state.activeUser}
        />

        {/* 2. Deterministic FSM Pipeline Timeline */}
        <section>
          <FsmTimeline
            currentState={state.currentState}
            stepDetails={state.stepDetails}
            totalLatencyMs={state.totalLatencyMs}
          />
        </section>

        {/* 3. Subnodo de Visión: ESP32-CAM (OV2640) */}
        <section>
          <CameraLbphView
            chi2Value={state.activeChi2}
            blinkVerified={state.blinkDetected}
            isProcessing={state.currentState === 'BIOMETRIC_VER'}
            fsmState={state.currentState}
          />
        </section>

        {/* 4. HashiCorp Vault Cryptographic Inspector */}
        <section>
          <VaultInspector recentPackets={state.recentVaultPackets} />
        </section>

        {/* 5. Hardware Sensors & Normative GPIO Pinout */}
        <section>
          <TelemetryPanel telemetry={state.telemetry} />
        </section>

        {/* 6. Forensic Audit Logs & Research Performance Matrix */}
        <section>
          <AuditTable logs={state.recentLogs} metrics={state.metrics} />
        </section>
      </main>

      {/* Dark Footer */}
      <footer className="mt-auto border-t border-border bg-surface px-6 py-4 text-xs text-text-3 font-sans z-10">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Universidad Nacional Federico Villarreal · Facultad de Ingeniería Electrónica e Informática</span>
          <span className="font-mono text-[11px] text-text-3">IoT Gatekeeper v1.0 (2026)</span>
        </div>
      </footer>
    </div>
  );
};
