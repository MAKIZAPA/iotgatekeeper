import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GatekeeperSyncState, FsmState } from '../types';

interface GatekeeperContextType {
  state: GatekeeperSyncState | null;
  isConnected: boolean;
  triggerScenario: (scenario: string, uid?: string, chi2?: number, blink?: boolean) => void;
  setManualState: (state: FsmState) => void;
  resetFsm: () => void;
  remoteUnlock: () => void;
  toggleUserStatus: (uid: string) => void;
  adjustChi2: (value: number) => void;
  executeManualStep: (phase: string, action: 'start' | 'approve' | 'deny', uid?: string) => void;
}

const DEFAULT_STATE: GatekeeperSyncState = {
  currentState: 'IDLE',
  currentScenario: 'IDLE',
  activeUser: null,
  activeUid: '',
  activeChi2: 28.45,
  blinkDetected: true,
  totalLatencyMs: 0,
  stepDetails: {
    IDLE: {
      state: 'IDLE',
      label: '1. Espera de Tarjeta (IDLE)',
      nominal_ms: 0,
      actual_ms: 0,
      status: 'active',
      details: 'MFRC522 en sondeo SPI a 10.0 MHz. Esperando interrupción IRQ coplanar (15-40mm).'
    },
    READ_RFID: {
      state: 'READ_RFID',
      label: '2. Lectura RFID (SPI DMA)',
      nominal_ms: 12.5,
      actual_ms: 12.5,
      status: 'pending',
      details: 'Transacción CS (GPIO10) bajo por 1.2ms. Decodificación de bloque UID por DMA en 12.5ms.'
    },
    BIOMETRIC_VER: {
      state: 'BIOMETRIC_VER',
      label: '3. Verificación Facial (LBPH + Anti-Spoofing)',
      nominal_ms: 88.5,
      actual_ms: 88.5,
      status: 'pending',
      details: 'OV2640 128x128px grilla 8x8. Chi2 <= 45.0. Verificación de parpadeo Frame N -> N+3.'
    },
    VAULT_AUTH: {
      state: 'VAULT_AUTH',
      label: '4. Custodia Vault (TLS 1.3 / KV2)',
      nominal_ms: 78.0,
      actual_ms: 78.0,
      status: 'pending',
      details: 'Handshake TLS 1.3 en :8200 hacia HashiCorp Vault. Consulta /v1/secret/data/users.'
    },
    GRANT: {
      state: 'GRANT',
      label: '5. Acceso Concedido (GPIO14 5.0s)',
      nominal_ms: 8.0,
      actual_ms: 8.0,
      status: 'pending',
      details: 'Pulso de 5000ms en GPIO14. Relé activa solenoide 12V (diodo 1N4007). Publica MQTT Adafruit IO.'
    },
    DENY: {
      state: 'DENY',
      label: '6. Acceso Denegado',
      nominal_ms: 0,
      actual_ms: 0,
      status: 'pending',
      details: 'Intrusión / Falla biométrica o credencial revocada. Registro inmediato de auditoría.'
    }
  },
  telemetry: {
    voltage_usbc: 5.01,
    battery_v: 3.84,
    battery_pct: 91,
    current_ma: 42,
    temp_c: 33.5,
    relay_active: false,
    relay_countdown_ms: 0,
    uptime_seconds: 1420,
    gpio_states: {
      GPIO1: { pin: 'GPIO1', name: 'OLED_SDA', level: 'HIGH', mode: 'I2C', bus: 'I2C0', notes: 'SSD1306 128x64 @ 400kHz' },
      GPIO2: { pin: 'GPIO2', name: 'OLED_SCL', level: 'HIGH', mode: 'I2C', bus: 'I2C0', notes: 'SSD1306 Clock Línea' },
      GPIO4: { pin: 'GPIO4', name: 'CAM_TX', level: 'HIGH', mode: 'UART', bus: 'ESP-NOW / UART', notes: 'Telemetría ESP32-CAM OV2640' },
      GPIO5: { pin: 'GPIO5', name: 'CAM_RX', level: 'HIGH', mode: 'UART', bus: 'ESP-NOW / UART', notes: 'Recepción descriptores LBPH' },
      GPIO9: { pin: 'GPIO9', name: 'RC522_RST', level: 'HIGH', mode: 'OUTPUT', bus: 'MFRC522', notes: 'Reset de hardware' },
      GPIO10: { pin: 'GPIO10', name: 'RC522_CS', level: 'HIGH', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Chip Select SPI (1.2ms pulso bajo)' },
      GPIO11: { pin: 'GPIO11', name: 'RC522_SCK', level: 'LOW', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Clock SPI a 10.0 MHz' },
      GPIO12: { pin: 'GPIO12', name: 'RC522_MISO', level: 'LOW', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Master In Slave Out' },
      GPIO13: { pin: 'GPIO13', name: 'RC522_MOSI', level: 'LOW', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Master Out Slave In' },
      GPIO14: { pin: 'GPIO14', name: 'RELAY_SOLENOID', level: 'LOW', mode: 'OUTPUT', bus: 'Optoacoplador', notes: 'Relé 5V -> Solenoide 12V (Flyback 1N4007)' }
    }
  },
  oled: {
    line1: 'IOT GATEKEEPER v1.0',
    line2: 'UNFV - FIEI  GATEWAY',
    line3: 'MFRC522: ESPERA RFID',
    line4: 'SISTEMA LISTO [IDLE]',
    icon: 'idle'
  },
  metrics: {
    total_attempts: 6,
    grants: 5,
    denies: 1,
    accuracy_rate: 98.0,
    far_rate: 2.0,
    frr_rate: 2.0,
    average_latency_ms: 187.0
  },
  users: [
    {
      id: 'usr-01',
      name: 'Alessandro Thiago Rosas Mirabal',
      uid: '04:A1:88:C2',
      role: 'Investigador Principal',
      status: 'ACTIVE',
      chi2_nominal: 28.45,
      last_access: '2026-10-25 21:55:12'
    },
    {
      id: 'usr-02',
      name: 'Piero Raúl Rivera Estrada',
      uid: '04:B7:31:D9',
      role: 'Arquitectura Embebida',
      status: 'ACTIVE',
      chi2_nominal: 29.10,
      last_access: '2026-10-25 21:30:40'
    },
    {
      id: 'usr-03',
      name: 'Franz José Jimenez Villalva',
      uid: '04:C9:55:E4',
      role: 'Visión Artificial LBPH',
      status: 'ACTIVE',
      chi2_nominal: 27.80,
      last_access: '2026-10-25 21:12:05'
    },
    {
      id: 'usr-04',
      name: 'Luis Angel Cotacallapa Velasquez',
      uid: '04:D2:19:F1',
      role: 'Seguridad Vault TLS',
      status: 'ACTIVE',
      chi2_nominal: 30.25,
      last_access: '2026-10-25 20:45:18'
    },
    {
      id: 'usr-05',
      name: 'Tito Condori Quispe',
      uid: '04:E6:73:A8',
      role: 'Integración Hardware',
      status: 'ACTIVE',
      chi2_nominal: 28.95,
      last_access: '2026-10-25 20:22:33'
    },
    {
      id: 'usr-06',
      name: 'Tarjeta Clonada MIFARE Classic (Ataque Diccionario)',
      uid: 'DE:AD:BE:EF',
      role: 'Intruso No Autorizado',
      status: 'REVOKED',
      chi2_nominal: 68.90,
      last_access: null
    }
  ],
  recentLogs: [],
  recentVaultPackets: []
};

const GatekeeperContext = createContext<GatekeeperContextType | null>(null);

export const GatekeeperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GatekeeperSyncState>(DEFAULT_STATE);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // 1. Initialize BroadcastChannel fallback
    try {
      const bc = new BroadcastChannel('iot_gatekeeper_bus');
      channelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'STATE_SYNC' && event.data.payload) {
          setState(event.data.payload);
        }
      };
    } catch {
      // BroadcastChannel might not be supported in some embedded webviews
    }

    // 2. Initialize Socket.io client
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('state:sync', (incomingState: GatekeeperSyncState) => {
      setState(incomingState);
      // Propagate to other tabs via BroadcastChannel
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'STATE_SYNC',
          payload: incomingState
        });
      }
    });

    // Also fetch initial state via HTTP API as fallback
    fetch('/api/telemetry')
      .then(res => res.json())
      .catch(() => {
        // server might still be booting
      });

    return () => {
      socket.disconnect();
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  const triggerScenario = useCallback((scenario: string, uid?: string, chi2?: number, blink?: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('fsm:trigger_scenario', { scenario, uid, chi2_distance: chi2, blink_verified: blink });
    } else {
      // Fallback via HTTP API
      fetch('/api/fsm/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, uid, chi2_distance: chi2, blink_verified: blink })
      }).catch(console.error);
    }
  }, []);

  const setManualState = useCallback((fsmState: FsmState) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('fsm:set_manual_state', fsmState);
    } else {
      fetch('/api/fsm/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: fsmState })
      }).catch(console.error);
    }
  }, []);

  const resetFsm = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('fsm:reset');
    } else {
      fetch('/api/fsm/reset', { method: 'POST' }).catch(console.error);
    }
  }, []);

  const remoteUnlock = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('relay:remote_unlock');
    } else {
      fetch('/api/relay/unlock', { method: 'POST' }).catch(console.error);
    }
  }, []);

  const toggleUserStatus = useCallback((uid: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vault:toggle_status', uid);
    } else {
      fetch(`/api/users/${uid}/toggle`, { method: 'POST' }).catch(console.error);
    }
  }, []);

  const adjustChi2 = useCallback((value: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('operator:adjust_chi2', value);
    }
  }, []);

  const executeManualStep = useCallback((phase: string, action: 'start' | 'approve' | 'deny', uid?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('fsm:manual_step', { phase, action, uid });
    } else {
      fetch('/api/fsm/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, action, uid })
      }).catch(console.error);
    }
  }, []);

  return (
    <GatekeeperContext.Provider
      value={{
        state,
        isConnected,
        triggerScenario,
        setManualState,
        resetFsm,
        remoteUnlock,
        toggleUserStatus,
        adjustChi2,
        executeManualStep
      }}
    >
      {children}
    </GatekeeperContext.Provider>
  );
};

export const useGatekeeper = () => {
  const context = useContext(GatekeeperContext);
  if (!context) {
    throw new Error('useGatekeeper must be used within a GatekeeperProvider');
  }
  return context;
};
