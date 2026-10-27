import React from 'react';
import { useGatekeeper } from '../context/GatekeeperContext';
import { NavigationHeader } from '../components/NavigationHeader';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Wifi,
  Server
} from 'lucide-react';

interface MobileAppProps {
  onNavigate?: (path: string) => void;
}

export const MobileApp: React.FC<MobileAppProps> = () => {
  const { state, isConnected, remoteUnlock, toggleUserStatus } = useGatekeeper();

  if (!state) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-mono text-xs text-text-3">
        Iniciando App móvil...
      </div>
    );
  }

  const isUnlocked = state.telemetry.relay_active;
  const relaySeconds = (state.telemetry.relay_countdown_ms / 1000).toFixed(1);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-accent/30 selection:text-white bg-dark-grid relative">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-0 left-0 right-0 h-96 ambient-glow pointer-events-none" />

      {/* Navigation Header (Desktop / Laptop only) */}
      <div className="hidden sm:block">
        <NavigationHeader
          isConnected={isConnected}
          viewTitle="App Móvil"
        />
      </div>

      {/* Center Phone Canvas Container (Fluid on phones, Mockup frame on desktop) */}
      <div className="flex-1 flex items-center justify-center p-0 sm:py-8 sm:px-4 z-10">
        {/* iPhone 16 Pro Frame on desktop / Native full-bleed on phone */}
        <div className="w-full max-w-full sm:max-w-[400px] bg-[#12151B] border-0 sm:border-[6px] border-[#222733] rounded-none sm:rounded-[44px] shadow-floating flex flex-col min-h-screen sm:min-h-[760px] overflow-hidden relative ring-0 sm:ring-1 ring-white/10">
          {/* iOS Dynamic Island & Status Bar (Simulated on desktop only) */}
          <div className="hidden sm:flex pt-3.5 px-7 pb-2 items-center justify-between text-xs font-mono select-none bg-[#12151B]">
            <span className="font-semibold text-text">22:45</span>
            {/* Dynamic Island pill */}
            <div className="w-24 h-5 bg-black rounded-full mx-auto flex items-center justify-end px-2 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-grant animate-pulse"></span>
            </div>
            <div className="flex items-center gap-1.5 text-text-2">
              <span className="text-[10px]">{state.telemetry.battery_pct}%</span>
              <BatteryCharging className="w-3.5 h-3.5 text-grant" />
              <Wifi className="w-3.5 h-3.5 text-grant" />
            </div>
          </div>

          {/* App Top Titlebar */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-surface-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-accent text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
                IG
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-tight text-text uppercase font-mono">
                  Gatekeeper Mobile
                </h1>
                <p className="text-[10px] text-text-3 font-sans">
                  Consola de campo · UNFV FIEI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-grant' : 'bg-deny'}`}></span>
              <span className="text-text-3">{isConnected ? 'En línea' : 'Offline'}</span>
            </div>
          </div>

          {/* Scrollable Mobile Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Main Interactive Lock Card */}
            <div className={`p-6 rounded-md border text-center transition-all duration-300 shadow-md ${
              isUnlocked
                ? 'bg-grant/10 border-grant/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                : 'bg-surface border-border'
            }`}>
              {/* Circular Lock Disc */}
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center mb-3">
                <div className={`absolute inset-0 rounded-full border-4 transition-all duration-300 ${
                  isUnlocked
                    ? 'border-grant animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    : 'border-border'
                }`}></div>

                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${
                  isUnlocked ? 'bg-surface-2 text-grant' : 'bg-surface-2 text-text-3'
                }`}>
                  {isUnlocked ? (
                    <Unlock className="w-8 h-8 text-grant" />
                  ) : (
                    <Lock className="w-8 h-8 text-text-3" />
                  )}
                </div>
              </div>

              <div className="font-semibold text-base text-text font-sans">
                {isUnlocked ? 'Acceso desbloqueado' : 'Puerta asegurada'}
              </div>
              <div className="text-xs font-mono text-text-3 mt-0.5">
                {isUnlocked
                  ? `Relé GPIO14 activo: ${relaySeconds}s restantes`
                  : 'Solenoide 12V en reposo (Relé LOW)'}
              </div>

              {/* Emergency Remote Unlock Button */}
              <button
                onClick={() => remoteUnlock()}
                disabled={isUnlocked}
                className={`mt-4 w-full py-3 px-4 rounded-[10px] font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isUnlocked
                    ? 'bg-grant/20 text-grant border border-grant/40 cursor-not-allowed'
                    : 'bg-accent hover:bg-accent-hover active:scale-[0.98] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                }`}
              >
                <Zap className="w-4 h-4" />
                {isUnlocked ? 'DESBLOQUEO EN CURSO' : 'APERTURA REMOTA (WSS_UNLOCK)'}
              </button>
            </div>

            {/* Quick Hardware Telemetry Widget */}
            <div className="bg-surface border border-border rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-2.5">
                <span className="text-[11px] font-semibold text-text uppercase font-mono tracking-wider">
                  Telemetría ESP32-S3
                </span>
                <span className="text-[10px] font-mono text-text-3">
                  192.168.4.1
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-center">
                <div className="p-2 bg-surface-2 rounded-sm border border-border">
                  <div className="text-[10px] text-text-3 font-sans">Consumo</div>
                  <div className="font-bold text-xs text-text mt-0.5">{state.telemetry.current_ma} mA</div>
                </div>
                <div className="p-2 bg-surface-2 rounded-sm border border-border">
                  <div className="text-[10px] text-text-3 font-sans">Temperatura</div>
                  <div className="font-bold text-xs text-text mt-0.5">{state.telemetry.temp_c.toFixed(1)} °C</div>
                </div>
              </div>
            </div>

            {/* HashiCorp Vault Permissions Manager */}
            <div className="bg-surface border border-border rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                <div>
                  <span className="text-[11px] font-semibold text-text uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-accent" />
                    Permisos HashiCorp Vault
                  </span>
                  <p className="text-[10px] text-text-3 font-sans">
                    Revocación en vivo (Falla en fase VAULT_AUTH)
                  </p>
                </div>

                <span className="text-[10px] font-mono bg-grant/15 text-grant border border-grant/30 px-2 py-0.5 rounded-sm font-semibold">
                  TLS 1.3
                </span>
              </div>

              <div className="space-y-2">
                {state.users.map((user) => {
                  const isActive = user.status === 'ACTIVE';

                  return (
                    <div
                      key={user.id}
                      className="p-3 rounded-md border border-border bg-surface-2/60 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold text-text font-sans truncate">
                          {user.name}
                        </div>
                        <div className="text-[10px] font-mono text-text-3 flex items-center gap-1.5 mt-0.5">
                          <span>{user.uid}</span>
                          <span>·</span>
                          <span className="truncate">{user.role}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleUserStatus(user.uid)}
                        className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold border transition-colors flex items-center gap-1 flex-shrink-0 ${
                          isActive
                            ? 'bg-grant/15 text-grant border-grant/30 hover:bg-grant/25'
                            : 'bg-deny/15 text-deny border-deny/30 hover:bg-deny/25'
                        }`}
                        title="Toca para cambiar permiso en Vault KV2"
                      >
                        {isActive ? <ShieldCheck className="w-3 h-3 text-grant" /> : <ShieldAlert className="w-3 h-3 text-deny" />}
                        {user.status}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* iOS Home Indicator Bar */}
          <div className="py-2.5 bg-[#12151B] flex items-center justify-center">
            <div className="w-32 h-1 bg-[#2E3545] rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
