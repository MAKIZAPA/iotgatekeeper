import React from 'react';
import type { AuditLog } from '../types';
import { Badge } from './ui/Badge';
import { Terminal } from 'lucide-react';

interface EventLogProps {
  logs: AuditLog[];
}

export const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  const recentLogs = logs.slice(0, 5);

  return (
    <div className="bg-surface border border-border rounded-md p-4 sm:p-5 shadow-subtle">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-text-3" />
          <h3 className="text-[14px] font-semibold text-text font-sans">
            Log de eventos recientes
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-3">
          Sincronizado vía WebSocket
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-border text-[11px] text-text-3">
              <th className="py-1.5 pr-3">Hora</th>
              <th className="py-1.5 pr-3">UID</th>
              <th className="py-1.5 pr-3">Usuario</th>
              <th className="py-1.5 pr-3">Resultado</th>
              <th className="py-1.5 pr-3 text-right">Latencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {recentLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-text-3 font-sans text-xs">
                  Esperando eventos de simulación...
                </td>
              </tr>
            ) : (
              recentLogs.map((log) => {
                const isGrant = log.decision === 'GRANT';
                const time = log.timestamp.split(' ')[1] || log.timestamp;

                return (
                  <tr key={log.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-2 pr-3 text-text-3 whitespace-nowrap">{time}</td>
                    <td className="py-2 pr-3 font-semibold text-text whitespace-nowrap">{log.uid}</td>
                    <td className="py-2 pr-3 text-text-2 font-sans truncate max-w-[200px]">{log.user_name}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={isGrant ? 'grant' : 'deny'} dot>
                        {log.decision}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-text tabular-nums">
                      {log.latency_ms.toFixed(1)} ms
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
