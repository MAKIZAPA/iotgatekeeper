import React from 'react';
import type { FsmState, UserRecord } from '../types';
import { cn } from '../lib/cn';
import { Zap, Lock, KeyRound, User, ShieldCheck, XCircle } from 'lucide-react';

interface GatewayStatusProps {
  state: FsmState;
  relayActive: boolean;
  relayCountdownMs: number;
  activeUser?: UserRecord | null;
}

export const GatewayStatus: React.FC<GatewayStatusProps> = ({
  state,
  relayActive,
  relayCountdownMs,
  activeUser
}) => {
  const isIdle = state === 'IDLE';
  const isGrant = state === 'GRANT';
  const isDeny = state === 'DENY';
  const relaySeconds = (relayCountdownMs / 1000).toFixed(0);

  // Status themes
  const theme = {
    IDLE: {
      border: 'border-border',
      bg: 'bg-surface',
      titleColor: 'text-text',
      statusText: 'SISTEMA LISTO EN ESPERA · CONTROLADOR DE ACCESO',
      subText: 'Lector RFID MFRC522 listo en 13.56 MHz. Presente tarjeta para solicitar token y autorización.',
      vaultStatus: 'Bóveda Vault :8200 · En espera'
    },
    READ_RFID: {
      border: 'border-accent/60 shadow-[0_0_24px_rgba(59,130,246,0.25)]',
      bg: 'bg-gradient-to-r from-accent/15 via-surface to-surface',
      titleColor: 'text-accent',
      statusText: 'AUTENTICACIÓN PASO 1 · LECTURA RFID EN CURSO',
      subText: 'Decodificando bloque de memoria UID mediante bus SPI DMA a 10.0 MHz...',
      vaultStatus: 'Identificando credencial de usuario...'
    },
    BIOMETRIC_VER: {
      border: 'border-warn/60 shadow-[0_0_24px_rgba(245,158,11,0.25)]',
      bg: 'bg-gradient-to-r from-warn/15 via-surface to-surface',
      titleColor: 'text-warn',
      statusText: 'AUTENTICACIÓN PASO 2 · BIOMETRÍA FACIAL & PRUEBA DE VIDA',
      subText: 'Cámara OV2640 analizando descriptores LBPH y transición de parpadeo anti-spoofing...',
      vaultStatus: 'Validando vector facial con HashiCorp Vault...'
    },
    VAULT_AUTH: {
      border: 'border-[#38BDF8]/60 shadow-[0_0_24px_rgba(56,189,248,0.25)]',
      bg: 'bg-gradient-to-r from-[#38BDF8]/15 via-surface to-surface',
      titleColor: 'text-[#38BDF8]',
      statusText: 'AUTENTICACIÓN PASO 3 · CUSTODIA CRIPTOGRÁFICA VAULT',
      subText: 'Negociando enlace TLS 1.3 con HashiCorp Vault (:8200 KV2) para verificar permisos del token...',
      vaultStatus: 'Consultando /v1/secret/data/users...'
    },
    GRANT: {
      border: 'border-grant/70 shadow-[0_0_35px_rgba(34,197,94,0.35)]',
      bg: 'bg-gradient-to-r from-grant/20 via-surface to-grant/10',
      titleColor: 'text-grant',
      statusText: 'ACCESO CONCEDIDO · TOKEN DE SESIÓN EMITIDO',
      subText: 'HashiCorp Vault autenticó la identidad con éxito (HTTP 200 OK). Token de acceso emitido y señal GPIO14 activa.',
      vaultStatus: `Token Lease: VÁLIDO · Sesión activa (${relaySeconds}s)`
    },
    DENY: {
      border: 'border-deny/70 shadow-[0_0_35px_rgba(239,68,68,0.35)]',
      bg: 'bg-gradient-to-r from-deny/20 via-surface to-deny/10',
      titleColor: 'text-deny',
      statusText: 'ACCESO DENEGADO · TOKEN REVOCADO O INVÁLIDO',
      subText: 'La bóveda HashiCorp Vault denegó la solicitud (HTTP 403 Forbidden) o falló la prueba biométrica anti-spoofing.',
      vaultStatus: 'Bóveda Vault: SOLICITUD RECHAZADA'
    }
  }[state];

  // User monogram for avatar
  const userInitials = activeUser?.name
    ? activeUser.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'ID';

  return (
    <section
      aria-live="polite"
      className={cn(
        'w-full border rounded-lg p-5 transition-all duration-300 relative overflow-hidden',
        theme.border,
        theme.bg
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Side: Destination + Main Status */}
        <div className="flex items-start gap-4">
          {/* Main Status Icon Indicator */}
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300',
              isGrant
                ? 'bg-grant/20 text-grant border border-grant/40 shadow-[0_0_16px_rgba(34,197,94,0.4)]'
                : isDeny
                ? 'bg-deny/20 text-deny border border-deny/40 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                : !isIdle
                ? 'bg-warn/20 text-warn border border-warn/40 animate-pulse'
                : 'bg-surface-2 text-text-3 border border-border'
            )}
          >
            {isGrant ? (
              <KeyRound className="w-6 h-6 text-grant" />
            ) : isDeny ? (
              <Lock className="w-6 h-6 text-deny" />
            ) : !isIdle ? (
              <KeyRound className="w-6 h-6 text-warn" />
            ) : (
              <Lock className="w-6 h-6 text-text-3" />
            )}
          </div>

          <div>
            {/* Context Badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-sm flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Custodia HashiCorp Vault KV2
              </span>
              <span className="text-text-3 text-[11px] font-mono hidden sm:inline">
                Infraestructura Segura FIEI · Cero claves en hardware
              </span>
            </div>

            {/* Big Status Title */}
            <h2 className={cn('text-[18px] sm:text-[20px] font-bold tracking-tight font-sans leading-tight', theme.titleColor)}>
              {theme.statusText}
            </h2>

            {/* Subtext and Vault Instruction */}
            <p className="text-[13px] text-text-2 mt-1 leading-snug">
              {theme.subText}
            </p>
          </div>
        </div>

        {/* Right Side: Identified User Card & Token / Signal Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Identified User Badge (if activeUser present) */}
          {!isIdle && activeUser ? (
            <div
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-md border text-xs transition-all shadow-sm',
                isGrant
                  ? 'bg-grant/10 border-grant/30 text-text'
                  : isDeny
                  ? 'bg-deny/10 border-deny/30 text-text'
                  : 'bg-surface-2/90 border-border text-text'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-[11px] flex-shrink-0',
                  isGrant
                    ? 'bg-grant text-black font-extrabold shadow-[0_0_10px_#22C55E]'
                    : isDeny
                    ? 'bg-deny text-white font-extrabold shadow-[0_0_10px_#EF4444]'
                    : 'bg-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                )}
              >
                {userInitials}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px] text-text font-sans leading-tight">
                    {activeUser.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-text-3 mt-0.5">
                  <span className="text-text-2">{activeUser.role}</span>
                  <span>·</span>
                  <span className="text-accent font-medium">UID: {activeUser.uid}</span>
                </div>
              </div>
            </div>
          ) : isIdle ? (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-surface-2/60 border border-border text-xs font-mono text-text-3">
              <User className="w-4 h-4 text-text-3/60" />
              <span>Aproxime tarjeta para identificar</span>
            </div>
          ) : null}

          {/* Token Lease & GPIO14 Actuator Status */}
          <div
            className={cn(
              'px-3.5 py-2.5 rounded-md border text-xs font-mono flex items-center gap-2 justify-center sm:justify-start',
              relayActive
                ? 'bg-grant/20 border-grant/50 text-grant font-bold shadow-[0_0_12px_rgba(34,197,94,0.3)] animate-pulse'
                : isDeny
                ? 'bg-deny/15 border-deny/40 text-deny font-medium'
                : 'bg-surface-2 border-border text-text-3'
            )}
          >
            {relayActive ? (
              <Zap className="w-4 h-4 text-grant animate-bounce" />
            ) : isDeny ? (
              <XCircle className="w-4 h-4 text-deny" />
            ) : (
              <KeyRound className="w-3.5 h-3.5 opacity-70" />
            )}
            <span>{theme.vaultStatus}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
