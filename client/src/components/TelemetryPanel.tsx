import React from 'react';
import { Activity, Thermometer, Cpu } from 'lucide-react';
import type { HardwareTelemetry } from '../types';

interface TelemetryPanelProps {
  telemetry: HardwareTelemetry;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  // Filter out removed components (OLED and Relay)
  const gpioList = Object.values(telemetry.gpio_states).filter((gpio) => {
    return !gpio.name.includes('OLED') && !gpio.name.includes('RELAY');
  });

  // Simplified technical notes
  const simplifiedNotes: Record<string, string> = {
    CAM_TX: 'Envío de comandos al módulo de cámara',
    CAM_RX: 'Recepción de descriptores faciales LBPH',
    RC522_RST: 'Reinicio de hardware del sensor RFID',
    RC522_CS: 'Activación del lector de tarjetas RFID',
    RC522_SCK: 'Sincronización de reloj SPI (10.0 MHz)',
    RC522_MISO: 'Lectura del código UID de la tarjeta',
    RC522_MOSI: 'Configuración y comandos al lector RFID',
  };

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-subtle flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border gap-2">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-accent" />
          <h3 className="text-[15px] font-semibold text-text font-sans">
            Telemetría y estado de señales
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
          <span className="text-text-3">
            Uptime: <strong className="text-text">{Math.floor(telemetry.uptime_seconds / 60)}m {telemetry.uptime_seconds % 60}s</strong>
          </span>
          <span className="text-grant bg-grant/15 border border-grant/30 px-2.5 py-0.5 rounded-sm text-[11px] font-semibold">
            192.168.4.1 (AP Mode)
          </span>
        </div>
      </div>

      {/* 2 Clean Metric Cards (Consumo eléctrico & Temperatura) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Electrical Current dynamically driven by active phase */}
        <div className="bg-surface-2/60 border border-border rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-3 text-[12px] mb-1 font-sans">
            <span>Consumo eléctrico</span>
            <Cpu className="w-4 h-4 text-accent" />
          </div>
          <div className="font-mono text-[22px] font-bold text-accent tabular-nums">
            {telemetry.current_ma} mA
          </div>
        </div>

        {/* 2. Core Temperature (Sensor interno de silicio) */}
        <div className="bg-surface-2/60 border border-border rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-3 text-[12px] mb-1 font-sans">
            <span>Temperatura</span>
            <Thermometer className="w-4 h-4 text-warn" />
          </div>
          <div className="font-mono text-[22px] font-bold text-text tabular-nums">
            {telemetry.temp_c.toFixed(1)} °C
          </div>
        </div>
      </div>

      {/* Clean Peripherals Signal Table (Without Pin GPIO, without OLED, without Relay) */}
      <div className="border border-border/80 rounded-sm overflow-hidden bg-surface-2/30">
        <div className="px-3.5 py-2.5 bg-surface-2 border-b border-border flex items-center justify-between text-[11px] font-mono text-text-2">
          <span className="font-semibold text-text">Líneas de comunicación y periféricos activos</span>
          <span className="text-text-3">Actualización en tiempo real por bus</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase text-text-3 bg-surface-2/50">
                <th className="px-3.5 py-2.5">Identificador</th>
                <th className="px-3.5 py-2.5">Bus / Periférico</th>
                <th className="px-3.5 py-2.5">Nivel lógico</th>
                <th className="px-3.5 py-2.5">Función del circuito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-surface">
              {gpioList.map((gpio) => {
                const isHigh = gpio.level === 'HIGH';

                return (
                  <tr key={gpio.pin} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-accent">{gpio.name}</td>
                    <td className="px-3.5 py-2.5 text-text-2">{gpio.bus}</td>
                    <td className="px-3.5 py-2.5">
                      {isHigh ? (
                        <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold bg-grant/20 text-grant border border-grant/50 shadow-[0_0_10px_rgba(34,197,94,0.3)] inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-grant animate-pulse"></span>
                          <span>ACTIVO (3.3V)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-sm text-[10px] font-medium bg-surface-2 text-text-3 border border-border inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-text-3/60"></span>
                          <span>REPOSO (0.0V)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-text-2 font-sans">
                      {simplifiedNotes[gpio.name] || gpio.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
