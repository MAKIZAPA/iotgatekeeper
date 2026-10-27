import React from 'react';
import { Wifi, Lock } from 'lucide-react';

interface NavigationHeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  isConnected: boolean;
  viewTitle?: string;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  isConnected,
  viewTitle
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#090C11]/92 backdrop-blur-xl border-b border-[#1E2536] px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Top subtle laser hairline */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent pointer-events-none" />

      {/* Brand & Institution (Left) */}
      <div className="flex items-center gap-3.5">
        {/* Custom High-Tech Hardware Emblem */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg p-[1px] bg-gradient-to-b from-[#2E3C54] via-[#1B2332] to-[#10141D] shadow-[0_0_20px_rgba(37,99,235,0.25)] flex-shrink-0">
          <div className="w-full h-full rounded-[7px] bg-[#0A0E16] flex items-center justify-center relative overflow-hidden">
            {/* Ambient inner micro-glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />

            {/* Custom PCB Microchip Core */}
            <svg
              className="w-5 h-5 text-accent relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" />
              <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" />
              <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" strokeLinecap="round" />
            </svg>

            {/* Micro active green status LED pin */}
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-grant animate-pulse shadow-[0_0_6px_#22C55E]" />
          </div>
        </div>

        {/* Text Details */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[16px] text-white tracking-tight leading-none font-sans">
              IoT Gatekeeper
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-accent bg-[#111928] px-2 py-0.5 rounded-[4px] border border-accent/35 tracking-wider uppercase shadow-[0_0_10px_rgba(59,130,246,0.15)]">
              <span className="w-1 h-1 rounded-full bg-accent" />
              v1.0 DevKit
            </span>
            {viewTitle && (
              <span className="inline-flex items-center font-mono text-[10px] font-medium text-text-3 bg-surface-2 px-2 py-0.5 rounded-[4px] border border-border">
                {viewTitle}
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-3 font-mono leading-tight tracking-wider uppercase mt-1 hidden sm:block">
            UNFV · Facultad de Ingeniería Electrónica e Informática
          </p>
        </div>
      </div>

      {/* Grouped High-Tech Telemetry Cluster (Right) */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Pod 1: Gateway Connection & Heartbeat */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0D121B] border border-[#20293A] text-xs font-mono shadow-sm">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-grant opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected
                  ? 'bg-grant shadow-[0_0_8px_#22C55E]'
                  : 'bg-deny shadow-[0_0_8px_#EF4444]'
              }`}
            />
          </span>
          <span className="text-text font-bold text-[11px] tracking-wide">
            ESP32-S3
          </span>
          <span
            className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border ${
              isConnected
                ? 'text-grant bg-grant/15 border-grant/30'
                : 'text-deny bg-deny/15 border-deny/30'
            }`}
          >
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Pod 2: Local SoftAP Network */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0D121B] border border-[#20293A] text-[11px] font-mono text-text-2 shadow-sm">
          <Wifi className="w-3.5 h-3.5 text-accent/80" />
          <span>192.168.4.1</span>
          <span className="text-[9px] font-mono text-text-3 font-semibold px-1 py-0.2 bg-surface-2 rounded border border-border">
            AP
          </span>
        </div>

        {/* Pod 3: Cryptographic Custody (Vault TLS 1.3) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-[#0F1829] to-[#0C121E] border border-[#253754] text-[11px] font-mono text-accent shadow-[0_0_14px_rgba(59,130,246,0.18)]">
          <Lock className="w-3.5 h-3.5 text-accent" />
          <span className="font-bold text-white tracking-tight">Vault KV2</span>
          <span className="text-border">·</span>
          <span className="text-accent font-semibold">TLS 1.3</span>
        </div>
      </div>

      {/* Bottom subtle hairline */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#1E2536] to-transparent pointer-events-none" />
    </header>
  );
};
