import React, { useState } from 'react';
import { ShieldCheck, Server, Cpu, CheckCircle2, XCircle, ArrowRight, ChevronDown, ChevronUp, Copy, Check, Lock } from 'lucide-react';
import type { VaultPacket } from '../types';
import { cn } from '../lib/cn';

interface VaultInspectorProps {
  recentPackets: VaultPacket[];
}

export const VaultInspector: React.FC<VaultInspectorProps> = ({ recentPackets }) => {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const activePacket = recentPackets[0] || {
    id: 'vlt-nominal',
    timestamp: new Date().toISOString(),
    endpoint: '/v1/secret/data/users',
    tls_version: 'TLS 1.3',
    cipher_suite: 'TLS_AES_256_GCM_SHA384',
    token_masked: 's.vault_***4f19',
    http_method: 'GET',
    http_status: 200,
    response_time_ms: 78.0,
    uid_queried: '04:A1:88:C2',
    decision: 'ACTIVE',
    raw_response: {
      request_id: 'req-vault-latest',
      lease_duration: 2764800,
      data: {
        engine: 'kv-v2',
        status: 'ACTIVE',
        tls: 'TLS_AES_256_GCM_SHA384'
      }
    }
  };

  const isOk = activePacket.http_status === 200;

  const copyJson = () => {
    if (activePacket?.raw_response) {
      navigator.clipboard.writeText(JSON.stringify(activePacket.raw_response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-subtle flex flex-col gap-4">
      {/* Clean Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border gap-2">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <div>
            <h3 className="text-[15px] font-semibold text-text font-sans">
              Custodia HashiCorp Vault
            </h3>
            <span className="text-[12px] text-text-3 font-sans">
              Validación remota de credenciales · Cero claves en memoria del lector
            </span>
          </div>
        </div>

        {/* Grouped Status Pill */}
        <div className="flex items-center gap-2 text-[11px] font-mono self-start sm:self-auto bg-surface-2 border border-border px-3 py-1 rounded-sm">
          <span className="w-2 h-2 rounded-full bg-grant animate-pulse" />
          <span className="text-text font-medium">Bóveda :8200 en línea</span>
          <span className="text-border">·</span>
          <span className="text-grant font-medium">TLS 1.3 Seguro</span>
        </div>
      </div>

      {/* 1. Visual Architecture Flow: Gateway -> TLS Tunnel -> Vault -> Decision */}
      <div className="bg-surface-2/60 border border-border/80 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-3 text-center md:text-left">
          {/* Node 1: ESP32 Gateway */}
          <div className="md:col-span-2 bg-surface border border-border p-3 rounded-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-accent/15 border border-accent/30 text-accent flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="truncate text-left">
              <span className="text-[13px] font-semibold text-text block leading-tight">ESP32-S3 Gateway</span>
              <span className="text-[11px] text-text-3 font-mono">Sin claves locales</span>
            </div>
          </div>

          {/* Flow Connector 1: Encrypted TLS 1.3 Tunnel */}
          <div className="md:col-span-1 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-accent font-semibold flex items-center gap-1 mb-1">
              <Lock className="w-3 h-3" />
              <span>TLS 1.3</span>
            </span>
            <div className="w-full flex items-center justify-center text-accent">
              <div className="hidden md:block h-[1.5px] w-full bg-accent/40 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-accent rotate-45" />
              </div>
              <ArrowRight className="md:hidden w-4 h-4 text-accent" />
            </div>
          </div>

          {/* Node 2: Central HashiCorp Vault Server */}
          <div className="md:col-span-2 bg-surface border border-border p-3 rounded-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-revoke/15 border border-revoke/30 text-revoke flex items-center justify-center flex-shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div className="truncate text-left">
              <span className="text-[13px] font-semibold text-text block leading-tight">HashiCorp Vault</span>
              <span className="text-[11px] text-text-3 font-mono">Motor KV2 :8200</span>
            </div>
          </div>

          {/* Flow Connector 2 */}
          <div className="md:col-span-1 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-text-3 mb-1">Respuesta</span>
            <div className="w-full flex items-center justify-center text-text-3">
              <div className="hidden md:block h-[1.5px] w-full bg-border relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-text-3 rotate-45" />
              </div>
              <ArrowRight className="md:hidden w-4 h-4 text-text-3" />
            </div>
          </div>

          {/* Node 3: Result Decision */}
          <div className={cn(
            'md:col-span-1 p-3 rounded-sm border flex flex-col items-center justify-center font-mono',
            isOk
              ? 'bg-grant/10 border-grant/40 text-grant shadow-[0_0_15px_rgba(34,197,94,0.15)]'
              : 'bg-deny/10 border-deny/40 text-deny shadow-[0_0_15px_rgba(239,68,68,0.15)]'
          )}>
            <div className="flex items-center gap-1 text-[12px] font-bold">
              {isOk ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{isOk ? 'ACTIVO' : 'REVOCADO'}</span>
            </div>
            <span className="text-[10px] opacity-80">{activePacket.http_status} · {activePacket.response_time_ms}ms</span>
          </div>
        </div>
      </div>

      {/* 2. Three Clean Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Security Model */}
        <div className="bg-surface-2/40 border border-border p-3.5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-text-3 font-sans">Modelo de Seguridad</span>
            <span className="w-2 h-2 rounded-full bg-grant" />
          </div>
          <span className="text-[14px] font-semibold text-text">Zero-Trust en Hardware</span>
          <p className="text-[11px] text-text-3 mt-1">
            El chip no almacena claves ni contraseñas. Si es extraído de la pared, no hay credenciales que robar.
          </p>
        </div>

        {/* Card 2: Credential Verification */}
        <div className="bg-surface-2/40 border border-border p-3.5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-text-3 font-sans">Última Tarjeta Consultada</span>
            <span className="text-[10px] font-mono text-text-3">{activePacket.timestamp.substring(11, 19)}</span>
          </div>
          <span className="text-[14px] font-mono font-bold text-accent">UID: {activePacket.uid_queried}</span>
          <p className="text-[11px] text-text-3 mt-1 flex items-center justify-between font-mono">
            <span>Decisión Bóveda:</span>
            <span className={cn('font-bold', isOk ? 'text-grant' : 'text-deny')}>
              {isOk ? '200 OK (Autorizado)' : '403 (Bloqueado)'}
            </span>
          </p>
        </div>

        {/* Card 3: Cryptographic Specs */}
        <div className="bg-surface-2/40 border border-border p-3.5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-text-3 font-sans">Cifrado de Enlace</span>
            <span className="text-[10px] font-mono text-grant font-bold">{activePacket.response_time_ms}ms</span>
          </div>
          <span className="text-[14px] font-mono font-semibold text-text">TLS 1.3 · AES-256-GCM</span>
          <p className="text-[11px] text-text-3 mt-1 flex items-center justify-between font-mono">
            <span>Token Acceso:</span>
            <span className="text-text-2">{activePacket.token_masked}</span>
          </p>
        </div>
      </div>

      {/* 3. Optional Collapsible Raw JSON (Hidden by default for ultra-clean UI) */}
      <div className="border border-border/80 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="w-full px-3.5 py-2 bg-surface-2/60 hover:bg-surface-2 text-text-3 hover:text-text flex items-center justify-between text-[11px] font-mono transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-text-3" />
            <span>{showJson ? 'Ocultar payload JSON técnico' : 'Ver payload JSON devuelto por Vault (Opcional)'}</span>
          </span>
          {showJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showJson && (
          <div className="p-3.5 bg-[#0A0D12] border-t border-border font-mono text-[11px] text-text-2 relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-[10px] text-text-3">
              <span>GET /v1/secret/data/users (TLS 1.3 Handshake OK)</span>
              <button
                type="button"
                onClick={copyJson}
                className="hover:text-text flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-grant" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[#94A3B8] leading-relaxed">
              {JSON.stringify(activePacket.raw_response || activePacket, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
