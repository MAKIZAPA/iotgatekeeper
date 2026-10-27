import React from 'react';
import { Lock, Unlock, ShieldAlert, Cpu } from 'lucide-react';
import type { OledDisplayState } from '../types';

interface OledMirrorProps {
  oled: OledDisplayState;
  relayActive: boolean;
  relayCountdownMs: number;
}

export const OledMirror: React.FC<OledMirrorProps> = ({ oled, relayActive, relayCountdownMs }) => {
  const relaySeconds = (relayCountdownMs / 1000).toFixed(1);

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-subtle flex flex-col justify-between">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent" />
          <div>
            <h3 className="text-[14px] font-semibold text-text font-sans">
              Espejo físico OLED SSD1306 (0.96&quot;)
            </h3>
            <span className="text-[12px] text-text-3 font-sans">
              Emulación de bus I2C a nivel de registro
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-text-2 bg-surface-2 px-2.5 py-1 rounded-sm border border-border">
          0x3C | SDA: GPIO1 | SCL: GPIO2
        </span>
      </div>

      {/* Hardware Frame */}
      <div className="relative mx-auto w-full max-w-[360px] bg-[#12151B] rounded-md p-3.5 border border-[#242A35] flex flex-col justify-between shadow-md select-none">
        {/* PCB Silkscreen Header */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#667688] pb-1 border-b border-[#242A35] mb-2">
          <span>SSD1306 · 128x64 I2C</span>
          <span className="text-[#8FA0B2]">[GND VCC SCL SDA]</span>
        </div>

        {/* OLED Screen (128x64 display) */}
        <div className="bg-[#0A0D11] rounded-sm p-3 aspect-[2/1] border border-[#1A202A] flex flex-col justify-between shadow-inner">
          {/* OLED Top Bar */}
          <div className="flex items-center justify-between border-b border-[#1E2633] pb-1 z-10">
            <span className="font-mono text-[11px] font-bold text-[#D6E6F5] tracking-wider truncate">
              {oled.line1 || 'IOT GATEKEEPER v1.0'}
            </span>
            <div className="flex items-center gap-1.5">
              {oled.icon === 'unlocked' && (
                <div className="flex items-center gap-1 text-[#34D399]">
                  <Unlock className="w-3 h-3" />
                  <span className="text-[9px] font-mono font-bold">ABIERTO</span>
                </div>
              )}
              {oled.icon === 'denied' && (
                <div className="flex items-center gap-1 text-[#F87171]">
                  <ShieldAlert className="w-3 h-3" />
                  <span className="text-[9px] font-mono font-bold">DENEGADO</span>
                </div>
              )}
              {(oled.icon === 'idle' || oled.icon === 'locked' || oled.icon === 'scanning' || oled.icon === 'verifying' || oled.icon === 'vault') && (
                <div className="flex items-center gap-1 text-[#667688]">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-mono">STANDBY</span>
                </div>
              )}
            </div>
          </div>

          {/* OLED Middle Content */}
          <div className="my-auto py-1 z-10 flex flex-col gap-0.5">
            <div className="font-mono text-xs font-semibold text-[#D6E6F5] truncate">
              {oled.line2 || 'ESPERANDO TARJETA...'}
            </div>
            <div className="font-mono text-[11px] text-[#A6C0D8] truncate">
              {oled.line3 || 'MFRC522: SPI a 10.0 MHz'}
            </div>
          </div>

          {/* OLED Bottom Status */}
          <div className="z-10 pt-1 border-t border-[#1E2633] flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#8FA0B2] truncate">
              {relayActive
                ? `GPIO14: HIGH (${relaySeconds}s)`
                : (oled.line4 || 'FSM: IDLE')}
            </span>

            {relayActive && (
              <div className="w-16 h-1 bg-[#1A222E] rounded-full overflow-hidden border border-[#2A3648]">
                <div
                  className="h-full bg-[#10B981] transition-all duration-300"
                  style={{ width: `${(relayCountdownMs / 5000) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Specifications Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-3 font-mono">
        <span>Resolución: 128x64 monocromo</span>
        <span className="text-grant bg-grant-soft px-2 py-0.5 rounded-sm border border-grant/20 font-medium">
          I2C Fast Mode (400 kHz)
        </span>
      </div>
    </div>
  );
};
