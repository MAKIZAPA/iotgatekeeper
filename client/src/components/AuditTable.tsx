import React from 'react';
import { ShieldAlert, FileText, CheckCircle2, XCircle } from 'lucide-react';
import type { AuditLog, SystemMetrics } from '../types';

interface AuditTableProps {
  logs: AuditLog[];
  metrics?: SystemMetrics;
}

export const AuditTable: React.FC<AuditTableProps> = ({ logs }) => {
  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-subtle flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border gap-2">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-accent" />
          <div>
            <h3 className="text-[15px] font-semibold text-text font-sans">
              Registro de auditoría y transacciones
            </h3>
            <span className="text-[12px] text-text-3 font-sans">
              Trazabilidad en tiempo real de cada intento de acceso y decisión de seguridad
            </span>
          </div>
        </div>

        <div className="text-xs font-mono text-text-3 self-start sm:self-auto">
          Total eventos: <strong className="text-text">{logs.length}</strong>
        </div>
      </div>

      {/* Clean Visual Logs Table */}
      <div className="overflow-x-auto rounded-sm border border-border/80 bg-surface-2/30">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase font-mono text-text-3 bg-surface-2/60">
              <th className="px-3.5 py-2.5">Hora</th>
              <th className="px-3.5 py-2.5">Usuario / Tarjeta</th>
              <th className="px-3.5 py-2.5">Biometría Facial</th>
              <th className="px-3.5 py-2.5">Prueba de Vida</th>
              <th className="px-3.5 py-2.5">Bóveda Vault</th>
              <th className="px-3.5 py-2.5">Velocidad</th>
              <th className="px-3.5 py-2.5 text-right font-mono">Decisión Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-surface font-sans">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-text-3 font-sans">
                  No hay transacciones registradas todavía en la base de datos local.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isGrant = log.decision === 'GRANT';

                return (
                  <tr key={log.id} className="hover:bg-surface-2/40 transition-colors">
                    {/* Timestamp */}
                    <td className="px-3.5 py-2.5 text-text-3 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp.split(' ')[1] || log.timestamp}
                    </td>

                    {/* User and UID combined cleanly in 2 lines */}
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-text text-[13px] leading-tight">
                        {log.user_name}
                      </div>
                      <div className="text-[11px] font-mono text-text-3 mt-0.5">
                        UID: <span className="text-text-2 font-medium">{log.uid}</span>
                      </div>
                    </td>

                    {/* Chi-Squared LBPH Result */}
                    <td className="px-3.5 py-2.5">
                      {log.chi2_distance <= 45.0 ? (
                        <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold font-mono bg-grant/15 text-grant border border-grant/30 inline-flex items-center gap-1">
                          <span>Aprobado ({log.chi2_distance.toFixed(1)})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold font-mono bg-deny/15 text-deny border border-deny/30 inline-flex items-center gap-1">
                          <span>No coincide ({log.chi2_distance.toFixed(1)})</span>
                        </span>
                      )}
                    </td>

                    {/* Anti-Spoofing Verification */}
                    <td className="px-3.5 py-2.5">
                      {log.blink_verified ? (
                        <span className="text-grant flex items-center gap-1 text-[11px] font-medium font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Parpadeo Real</span>
                        </span>
                      ) : (
                        <span className="text-deny font-bold font-sans inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-deny/15 border border-deny/30 text-[11px]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Foto Estática</span>
                        </span>
                      )}
                    </td>

                    {/* HashiCorp Vault Status */}
                    <td className="px-3.5 py-2.5">
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold font-mono border ${
                        log.vault_http_status === 200
                          ? 'bg-grant/15 text-grant border-grant/30'
                          : 'bg-deny/15 text-deny border-deny/30'
                      }`}>
                        {log.vault_http_status === 200 ? 'Activo (200)' : 'Revocado (403)'}
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="px-3.5 py-2.5 font-mono text-text-2 text-xs whitespace-nowrap">
                      {log.latency_ms.toFixed(1)} ms
                    </td>

                    {/* Final Decision Badge (Spanish) */}
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-mono">
                      {isGrant ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-grant/20 text-grant border border-grant/40 shadow-[0_0_12px_rgba(34,197,94,0.2)]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>AUTORIZADO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-bold bg-deny/20 text-deny border border-deny/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>DENEGADO</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
