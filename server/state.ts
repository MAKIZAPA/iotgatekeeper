import { Server as SocketIOServer } from 'socket.io';
import type {
  FsmState,
  FsmStepDetail,
  UserRecord,
  AuditLog,
  HardwareTelemetry,
  OledDisplayState,
  VaultPacket,
  SimulationPayload
} from './types.js';
import {
  getAllUsers,
  getUserByUid,
  updateUserStatus,
  updateLastAccess,
  insertAuditLog,
  getAuditLogs,
  insertVaultPacket,
  getVaultPackets,
  getSystemMetrics
} from './db.js';

export class GatekeeperState {
  private io: SocketIOServer | null = null;
  public currentState: FsmState = 'IDLE';
  public currentScenario: string = 'IDLE';
  public activeUser: UserRecord | null = null;
  public activeUid: string = '';
  public activeChi2: number = 28.45;
  public blinkDetected: boolean = true;
  public fsmStartTime: number = 0;
  public totalLatencyMs: number = 0;
  public relayTimer: NodeJS.Timeout | null = null;
  public relayRemainingMs: number = 0;
  private currentTempCelsius: number = 33.6;
  private readonly AMBIENT_TEMP_IDLE: number = 33.6;
  public stepDetails: Record<FsmState, FsmStepDetail>;
  public telemetry: HardwareTelemetry;
  public oled: OledDisplayState;

  constructor() {
    this.stepDetails = {
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
        nominal_ms: 88.5, // 84.0ms LBPH + 4.5ms ESP-NOW
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
    };

    this.telemetry = {
      voltage_usbc: 5.01,
      battery_v: 3.84,
      battery_pct: 91,
      current_ma: 42,
      temp_c: 33.5,
      relay_active: false,
      relay_countdown_ms: 0,
      uptime_seconds: 1420,
      gpio_states: {
        GPIO1: { pin: 'GPIO1', name: 'OLED_SDA', level: 'HIGH', mode: 'I2C', bus: 'I2C0', notes: 'SSD1306 SDA' },
        GPIO2: { pin: 'GPIO2', name: 'OLED_SCL', level: 'HIGH', mode: 'I2C', bus: 'I2C0', notes: 'SSD1306 SCL' },
        GPIO4: { pin: 'GPIO4', name: 'CAM_TX', level: 'LOW', mode: 'UART', bus: 'ESP-NOW / UART', notes: 'Transmisión hacia cámara OV2640' },
        GPIO5: { pin: 'GPIO5', name: 'CAM_RX', level: 'LOW', mode: 'UART', bus: 'ESP-NOW / UART', notes: 'Recepción de descriptores faciales LBPH' },
        GPIO9: { pin: 'GPIO9', name: 'RC522_RST', level: 'HIGH', mode: 'OUTPUT', bus: 'MFRC522', notes: 'Reinicio de hardware del sensor RFID' },
        GPIO10: { pin: 'GPIO10', name: 'RC522_CS', level: 'HIGH', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Selección de chip lector RFID' },
        GPIO11: { pin: 'GPIO11', name: 'RC522_SCK', level: 'LOW', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Reloj de sincronización de datos SPI (10 MHz)' },
        GPIO12: { pin: 'GPIO12', name: 'RC522_MISO', level: 'LOW', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Lectura del código UID de la tarjeta' },
        GPIO13: { pin: 'GPIO13', name: 'RC522_MOSI', level: 'LOW', mode: 'SPI', bus: 'SPI2 (FSPI)', notes: 'Envío de comandos al lector RFID' },
        GPIO14: { pin: 'GPIO14', name: 'RELAY_SOLENOID', level: 'LOW', mode: 'OUTPUT', bus: 'Optoacoplador', notes: 'Actuador de cerradura' }
      }
    };

    this.oled = {
      line1: 'IOT GATEKEEPER v1.0',
      line2: 'UNFV - FIEI  GATEWAY',
      line3: 'MFRC522: ESPERA RFID',
      line4: 'SISTEMA LISTO [IDLE]',
      icon: 'idle'
    };

    // Telemetry ticker (flocculates slight realistic sensor changes)
    setInterval(() => {
      this.tickTelemetry();
    }, 1000);
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  private tickTelemetry() {
    this.telemetry.uptime_seconds += 1;

    // 1. Realistic USB-C voltage oscillation with slight delay (4.98V - 5.04V)
    const jitterVolt = (Math.random() - 0.5) * 0.04;
    this.telemetry.voltage_usbc = Number((5.01 + jitterVolt).toFixed(2));

    // 2. Realistic Temperature with Thermal Inertia (Inercia térmica real con disipador)
    // Reposo normal: ~33.6°C. Bajo carga pesada (OV2640 LBPH / TLS 1.3): objetivo térmico 39.5°C - 41.5°C.
    let targetTemp = this.AMBIENT_TEMP_IDLE;
    if (this.currentState === 'BIOMETRIC_VER') {
      targetTemp = 40.5; // Carga computacional dual-core a 240 MHz + cámara
    } else if (this.currentState === 'VAULT_AUTH') {
      targetTemp = 38.2; // Aceleración criptográfica TLS 1.3
    } else if (this.currentState === 'READ_RFID' || this.currentState === 'GRANT') {
      targetTemp = 35.8;
    }

    // Calentamiento progresivo bajo carga (+0.45°C/s), enfriamiento lento realista (-0.09°C/s)
    if (this.currentTempCelsius < targetTemp) {
      this.currentTempCelsius = Math.min(targetTemp, this.currentTempCelsius + 0.45 + (Math.random() * 0.15));
    } else if (this.currentTempCelsius > this.AMBIENT_TEMP_IDLE) {
      // Disipación gradual por inercia térmica hacia la temperatura ambiente (tarda decenas de segundos)
      this.currentTempCelsius = Math.max(this.AMBIENT_TEMP_IDLE, this.currentTempCelsius - (0.09 + Math.random() * 0.05));
    }

    const jitterTemp = (Math.random() - 0.5) * 0.1;
    this.telemetry.temp_c = Number((this.currentTempCelsius + jitterTemp).toFixed(1));

    // 3. Dynamic current consumption (mA) strictly driven by FSM active phase:
    let baseCurrent = 42; // Reposo IDLE
    if (this.currentState === 'READ_RFID') {
      baseCurrent = 74; // Antena RF 13.56 MHz energizada
    } else if (this.currentState === 'BIOMETRIC_VER') {
      baseCurrent = 158; // OV2640 + WiFi ESP-NOW transmisión
    } else if (this.currentState === 'VAULT_AUTH') {
      baseCurrent = 126; // Criptoprocesador TLS 1.3 activo
    } else if (this.currentState === 'GRANT') {
      baseCurrent = 86; // Conexión activa
    } else if (this.currentState === 'DENY') {
      baseCurrent = 52; // Registro de auditoría
    }
    const jitterCurrent = (Math.random() - 0.5) * 6;
    this.telemetry.current_ma = Math.max(38, Math.round(baseCurrent + jitterCurrent));

    // 4. Dynamic GPIO logic levels reflecting active hardware bus
    if (this.currentState === 'READ_RFID') {
      this.telemetry.gpio_states.GPIO10.level = 'LOW'; // Chip select activo
      this.telemetry.gpio_states.GPIO11.level = 'HIGH'; // Reloj SPI activo
      this.telemetry.gpio_states.GPIO12.level = 'HIGH'; // Datos UID
      this.telemetry.gpio_states.GPIO13.level = 'HIGH';
    } else if (this.currentState === 'BIOMETRIC_VER') {
      this.telemetry.gpio_states.GPIO4.level = 'HIGH'; // Stream cámara
      this.telemetry.gpio_states.GPIO5.level = 'HIGH'; // Descriptores LBPH
      this.telemetry.gpio_states.GPIO10.level = 'HIGH';
      this.telemetry.gpio_states.GPIO11.level = 'LOW';
      this.telemetry.gpio_states.GPIO12.level = 'LOW';
      this.telemetry.gpio_states.GPIO13.level = 'LOW';
    } else {
      this.telemetry.gpio_states.GPIO4.level = 'LOW';
      this.telemetry.gpio_states.GPIO5.level = 'LOW';
      this.telemetry.gpio_states.GPIO10.level = 'HIGH';
      this.telemetry.gpio_states.GPIO11.level = 'LOW';
      this.telemetry.gpio_states.GPIO12.level = 'LOW';
      this.telemetry.gpio_states.GPIO13.level = 'LOW';
    }

    if (this.relayRemainingMs > 0) {
      this.relayRemainingMs = Math.max(0, this.relayRemainingMs - 1000);
      this.telemetry.relay_countdown_ms = this.relayRemainingMs;
    }

    this.broadcastState();
  }

  public broadcastState() {
    if (!this.io) return;
    const fullState = {
      currentState: this.currentState,
      currentScenario: this.currentScenario,
      activeUser: this.activeUser,
      activeUid: this.activeUid,
      activeChi2: this.activeChi2,
      blinkDetected: this.blinkDetected,
      totalLatencyMs: this.totalLatencyMs,
      stepDetails: this.stepDetails,
      telemetry: this.telemetry,
      oled: this.oled,
      metrics: getSystemMetrics(),
      users: getAllUsers(),
      recentLogs: getAuditLogs(15),
      recentVaultPackets: getVaultPackets(10)
    };
    this.io.emit('state:sync', fullState);
  }

  public resetToIdle() {
    this.currentState = 'IDLE';
    this.currentScenario = 'IDLE';
    this.activeUser = null;
    this.activeUid = '';
    this.activeChi2 = 28.45;
    this.blinkDetected = true;
    this.totalLatencyMs = 0;

    // Reset step status
    for (const key of Object.keys(this.stepDetails) as FsmState[]) {
      this.stepDetails[key].status = key === 'IDLE' ? 'active' : 'pending';
    }

    // Reset GPIOs
    this.telemetry.gpio_states.GPIO10.level = 'HIGH';
    this.telemetry.gpio_states.GPIO14.level = 'LOW';
    this.telemetry.relay_active = false;
    this.relayRemainingMs = 0;
    this.telemetry.relay_countdown_ms = 0;
    this.telemetry.current_ma = 42;

    this.oled = {
      line1: 'IOT GATEKEEPER v1.0',
      line2: 'UNFV - FIEI  GATEWAY',
      line3: 'MFRC522: ESPERA RFID',
      line4: 'SISTEMA LISTO [IDLE]',
      icon: 'idle'
    };

    this.broadcastState();
  }

  // Trigger full automated simulation scenario
  public async runScenario(payload: SimulationPayload) {
    const { scenario, uid = '04:A1:88:C2' } = payload;
    this.currentScenario = scenario;
    this.activeUid = uid;

    const user = getUserByUid(uid) || {
      id: 'usr-temp',
      name: payload.target_user_name || 'Desconocido / Tarjeta Externa',
      uid: uid,
      role: 'Visitante Temporal',
      status: 'ACTIVE',
      chi2_nominal: 32.0,
      last_access: null
    };

    this.activeUser = user;

    // Determine parameters based on scenario
    let targetChi2 = payload.chi2_distance ?? user.chi2_nominal;
    let blinkValid = payload.blink_verified ?? true;
    let willVaultPass = user.status === 'ACTIVE';

    if (scenario === 'FULL_GRANT') {
      targetChi2 = user.chi2_nominal; // nominal e.g. 28.45
      blinkValid = true;
      willVaultPass = user.status === 'ACTIVE';
    } else if (scenario === 'SPOOF_PHOTO') {
      targetChi2 = 29.50;
      blinkValid = false; // anti-spoofing fails
    } else if (scenario === 'LBPH_MISMATCH') {
      targetChi2 = 68.90; // exceeds 45.0 threshold
      blinkValid = true;
    } else if (scenario === 'VAULT_REVOKED') {
      targetChi2 = 28.45;
      blinkValid = true;
      willVaultPass = false; // 403 Forbidden
    }

    this.activeChi2 = Number(targetChi2.toFixed(2));
    this.blinkDetected = blinkValid;

    // Step 1: Transition to READ_RFID
    await this.executeStepReadRfid(user);

    // Step 2: Transition to BIOMETRIC_VER
    const biometricSuccess = await this.executeStepBiometric(user, targetChi2, blinkValid);
    if (!biometricSuccess) {
      await this.executeStepDeny(
        user,
        !blinkValid
          ? 'Fallo Anti-Spoofing: Ausencia de parpadeo (Cuadro N vs N+3 idénticos - Foto Estática)'
          : `Fallo LBPH: Distancia Chi2 (${targetChi2.toFixed(2)}) supera el umbral normativo (45.0)`,
        400
      );
      return;
    }

    // Step 3: Transition to VAULT_AUTH
    const vaultSuccess = await this.executeStepVault(user, willVaultPass);
    if (!vaultSuccess) {
      await this.executeStepDeny(
        user,
        `Rechazado por HashiCorp Vault (:8200 KV2): Credencial con estado REVOKED`,
        403
      );
      return;
    }

    // Step 4: Transition to GRANT
    await this.executeStepGrant(user, targetChi2);
  }

  private async executeStepReadRfid(user: UserRecord): Promise<void> {
    this.currentState = 'READ_RFID';
    this.stepDetails.IDLE.status = 'completed';
    this.stepDetails.READ_RFID.status = 'active';

    // Simulate SPI CS low pulse and DMA read
    this.telemetry.gpio_states.GPIO10.level = 'LOW';
    this.oled = {
      line1: 'IOT GATEKEEPER v1.0',
      line2: `UID: ${user.uid}`,
      line3: 'SPI DMA: DECODIFICANDO',
      line4: 'BUS SPI 10MHz [OK]',
      icon: 'scanning'
    };
    this.broadcastState();

    // Realistic interactive demo pacing: 350ms so RFID read is clearly visible
    await this.sleep(350);

    const delayMs = 12.5 + (Math.random() - 0.5) * 1.5;
    this.telemetry.gpio_states.GPIO10.level = 'HIGH';
    this.stepDetails.READ_RFID.actual_ms = Number(delayMs.toFixed(1));
    this.stepDetails.READ_RFID.status = 'completed';
    this.broadcastState();
  }

  private async executeStepBiometric(user: UserRecord, chi2: number, blink: boolean): Promise<boolean> {
    this.currentState = 'BIOMETRIC_VER';
    this.stepDetails.BIOMETRIC_VER.status = 'active';

    this.oled = {
      line1: `UID: ${user.uid}`,
      line2: `LBPH REC: 128x128 8x8`,
      line3: `BLINK: ${blink ? 'COMPROBANDO...' : 'ESTATICO (SPOOF)'}`,
      line4: `CHI2 VAL: ${chi2.toFixed(2)}`,
      icon: 'verifying'
    };
    this.broadcastState();

    // Visual scanning animation duration: 2.2 seconds so the sweep is clearly visible
    await this.sleep(2200);

    const delayMs = 88.5 + (Math.random() - 0.5) * 2.5;
    this.stepDetails.BIOMETRIC_VER.actual_ms = Number(delayMs.toFixed(1));

    const isMatch = chi2 <= 45.0 && blink;
    this.stepDetails.BIOMETRIC_VER.status = isMatch ? 'completed' : 'failed';
    this.broadcastState();

    return isMatch;
  }

  private async executeStepVault(user: UserRecord, isAuthorized: boolean): Promise<boolean> {
    this.currentState = 'VAULT_AUTH';
    this.stepDetails.VAULT_AUTH.status = 'active';

    this.oled = {
      line1: 'HASHICORP VAULT :8200',
      line2: 'TLS 1.3 AES_256_GCM',
      line3: 'GET /v1/secret/users',
      line4: 'TOKEN AUTH VERIFY...',
      icon: 'vault'
    };
    this.broadcastState();

    // Realistic Vault TLS 1.3 handshake pacing: 650ms
    await this.sleep(650);

    const delayMs = 78.0 + (Math.random() - 0.5) * 3.0;
    this.stepDetails.VAULT_AUTH.actual_ms = Number(delayMs.toFixed(1));

    const httpStatus = isAuthorized ? 200 : 403;
    const packet: VaultPacket = {
      id: `vlt-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      endpoint: '/v1/secret/data/users',
      tls_version: 'TLS 1.3',
      cipher_suite: 'TLS_AES_256_GCM_SHA384',
      token_masked: 's.vault_***4f19',
      http_method: 'GET',
      http_status: httpStatus,
      response_time_ms: Number(delayMs.toFixed(1)),
      uid_queried: user.uid,
      decision: isAuthorized ? 'ACTIVE' : 'REVOKED',
      raw_response: {
        request_id: `req-${Math.random().toString(36).substring(2, 9)}`,
        lease_id: '',
        renewable: false,
        lease_duration: 2764800,
        data: {
          data: {
            uid: user.uid,
            name: user.name,
            role: user.role,
            status: isAuthorized ? 'ACTIVE' : 'REVOKED',
            allowed_zones: ['LAB_EMBEBIDOS_FIEI_PISO2', 'GATE_MAIN'],
            chi2_threshold_enforced: 45.0
          },
          metadata: {
            created_time: '2026-10-20T08:00:00.000Z',
            version: 2
          }
        }
      }
    };

    insertVaultPacket(packet);

    this.stepDetails.VAULT_AUTH.status = isAuthorized ? 'completed' : 'failed';
    this.broadcastState();

    return isAuthorized;
  }

  private async executeStepGrant(user: UserRecord, chi2: number): Promise<void> {
    this.currentState = 'GRANT';
    this.stepDetails.GRANT.status = 'completed';

    // Nominal logic: 8.0ms
    const logicMs = 8.0 + (Math.random() - 0.5) * 1.5;
    this.stepDetails.GRANT.actual_ms = Number(logicMs.toFixed(1));

    this.totalLatencyMs = Number((
      this.stepDetails.READ_RFID.actual_ms +
      this.stepDetails.BIOMETRIC_VER.actual_ms +
      this.stepDetails.VAULT_AUTH.actual_ms +
      this.stepDetails.GRANT.actual_ms
    ).toFixed(1));

    // Turn ON Relay (GPIO14)
    this.telemetry.gpio_states.GPIO14.level = 'HIGH';
    this.telemetry.relay_active = true;
    this.relayRemainingMs = 10000;
    this.telemetry.relay_countdown_ms = 10000;
    this.telemetry.current_ma = 448; // Peak load with 12V solenoid energization

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updateLastAccess(user.uid, nowStr);

    // Insert Audit Log
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: nowStr,
      uid: user.uid,
      user_name: user.name,
      chi2_distance: chi2,
      chi2_threshold: 45.0,
      blink_verified: true,
      decision: 'GRANT',
      reason: `Autenticación exitosa multifactor (RFID + LBPH Chi2 ${chi2.toFixed(2)} + Vault KV2 ACTIVE)`,
      latency_ms: this.totalLatencyMs,
      vault_http_status: 200
    };
    insertAuditLog(log);

    this.oled = {
      line1: 'ACCESO CONCEDIDO [GRANT]',
      line2: user.name.split(' ')[0] + ' ' + (user.name.split(' ')[1] || ''),
      line3: `X2: ${chi2.toFixed(2)} | LAT: ${this.totalLatencyMs}ms`,
      line4: 'GPIO14 RELAY: HIGH (5.0s)',
      icon: 'unlocked'
    };
    this.broadcastState();

    // 10-second pulse countdown
    if (this.relayTimer) clearTimeout(this.relayTimer);
    this.relayTimer = setTimeout(() => {
      this.telemetry.gpio_states.GPIO14.level = 'LOW';
      this.telemetry.relay_active = false;
      this.telemetry.relay_countdown_ms = 0;
      this.telemetry.current_ma = 42;
      this.resetToIdle();
    }, 10000);
  }

  private async executeStepDeny(user: UserRecord, reason: string, httpStatus: number): Promise<void> {
    this.currentState = 'DENY';
    this.stepDetails.DENY.status = 'completed';

    const calculatedLatency = Number((
      (this.stepDetails.READ_RFID.status === 'completed' ? this.stepDetails.READ_RFID.actual_ms : 0) +
      (this.stepDetails.BIOMETRIC_VER.status === 'completed' || this.stepDetails.BIOMETRIC_VER.status === 'failed' ? this.stepDetails.BIOMETRIC_VER.actual_ms : 0) +
      (this.stepDetails.VAULT_AUTH.status === 'completed' || this.stepDetails.VAULT_AUTH.status === 'failed' ? this.stepDetails.VAULT_AUTH.actual_ms : 0)
    ).toFixed(1));

    this.totalLatencyMs = calculatedLatency;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: nowStr,
      uid: user.uid,
      user_name: user.name,
      chi2_distance: this.activeChi2,
      chi2_threshold: 45.0,
      blink_verified: this.blinkDetected,
      decision: 'DENY',
      reason,
      latency_ms: this.totalLatencyMs,
      vault_http_status: httpStatus
    };
    insertAuditLog(log);

    this.oled = {
      line1: 'ACCESO DENEGADO [DENY]',
      line2: `UID: ${user.uid}`,
      line3: `CHI2: ${this.activeChi2.toFixed(2)} (MAX 45.0)`,
      line4: 'SOLENOIDE: BLOQUEADO',
      icon: 'denied'
    };
    this.broadcastState();

    // Stay in DENY for 10 seconds, then return to IDLE
    this.relayRemainingMs = 10000;
    this.telemetry.relay_countdown_ms = 10000;
    if (this.relayTimer) clearTimeout(this.relayTimer);
    this.relayTimer = setTimeout(() => {
      this.resetToIdle();
    }, 10000);
  }

  // Remote emergency unlock via Mobile App (WSS_UNLOCK_RELAY)
  public async triggerRemoteUnlock(): Promise<void> {
    this.currentState = 'GRANT';
    this.currentScenario = 'REMOTE_UNLOCK';
    this.stepDetails.GRANT.status = 'completed';
    this.stepDetails.GRANT.actual_ms = 4.0;
    this.totalLatencyMs = 4.0;

    this.telemetry.gpio_states.GPIO14.level = 'HIGH';
    this.telemetry.relay_active = true;
    this.relayRemainingMs = 10000;
    this.telemetry.relay_countdown_ms = 10000;
    this.telemetry.current_ma = 448;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: nowStr,
      uid: 'REMOTE_APP',
      user_name: 'Administrador Móvil (WSS_UNLOCK_RELAY)',
      chi2_distance: 0.0,
      chi2_threshold: 45.0,
      blink_verified: true,
      decision: 'GRANT',
      reason: 'Apertura remota de emergencia vía WebSocket autenticado desde App Móvil',
      latency_ms: 4.0,
      vault_http_status: 200
    };
    insertAuditLog(log);

    this.oled = {
      line1: 'DESBLOQUEO REMOTO WSS',
      line2: 'COMANDO: UNLOCK_RELAY',
      line3: 'ORIGEN: APP MOVIL FIEI',
      line4: 'GPIO14 RELAY: HIGH (5.0s)',
      icon: 'unlocked'
    };
    this.broadcastState();

    if (this.relayTimer) clearTimeout(this.relayTimer);
    this.relayTimer = setTimeout(() => {
      this.telemetry.gpio_states.GPIO14.level = 'LOW';
      this.telemetry.relay_active = false;
      this.telemetry.relay_countdown_ms = 0;
      this.telemetry.current_ma = 42;
      this.resetToIdle();
    }, 5000);
  }

  // Manual state change by Operator
  public setManualState(state: FsmState): void {
    if (this.relayTimer) {
      clearTimeout(this.relayTimer);
      this.relayTimer = null;
    }

    this.currentState = state;
    const order: FsmState[] = ['IDLE', 'READ_RFID', 'BIOMETRIC_VER', 'VAULT_AUTH', 'GRANT'];
    const targetIdx = order.indexOf(state);

    for (const key of Object.keys(this.stepDetails) as FsmState[]) {
      if (key === state) {
        this.stepDetails[key].status = state === 'DENY' ? 'failed' : 'active';
      } else if (state === 'DENY') {
        this.stepDetails[key].status = (key === 'IDLE' || key === 'READ_RFID') ? 'completed' : 'pending';
      } else {
        const keyIdx = order.indexOf(key);
        if (targetIdx !== -1 && keyIdx !== -1 && keyIdx < targetIdx) {
          this.stepDetails[key].status = 'completed';
        } else {
          this.stepDetails[key].status = 'pending';
        }
      }
    }

    if (state === 'GRANT') {
      this.telemetry.gpio_states.GPIO14.level = 'HIGH';
      this.telemetry.relay_active = true;
      this.relayRemainingMs = 10000;
      this.telemetry.relay_countdown_ms = 10000;
      this.telemetry.current_ma = 448;
      this.relayTimer = setTimeout(() => {
        this.resetToIdle();
      }, 10000);
    } else if (state === 'DENY') {
      this.telemetry.gpio_states.GPIO14.level = 'LOW';
      this.telemetry.relay_active = false;
      this.telemetry.current_ma = 52;
      this.relayTimer = setTimeout(() => {
        this.resetToIdle();
      }, 10000);
    } else if (state === 'READ_RFID') {
      this.telemetry.gpio_states.GPIO10.level = 'HIGH';
      this.telemetry.gpio_states.GPIO11.level = 'HIGH';
      this.telemetry.gpio_states.GPIO13.level = 'HIGH';
      this.telemetry.gpio_states.GPIO4.level = 'LOW';
      this.telemetry.gpio_states.GPIO5.level = 'LOW';
      this.telemetry.gpio_states.GPIO14.level = 'LOW';
      this.telemetry.relay_active = false;
      this.telemetry.current_ma = 74;
    } else if (state === 'BIOMETRIC_VER') {
      this.telemetry.gpio_states.GPIO4.level = 'HIGH';
      this.telemetry.gpio_states.GPIO5.level = 'HIGH';
      this.telemetry.current_ma = 158;
    } else if (state === 'VAULT_AUTH') {
      this.telemetry.gpio_states.GPIO4.level = 'LOW';
      this.telemetry.gpio_states.GPIO5.level = 'LOW';
      this.telemetry.current_ma = 126;
    } else {
      this.telemetry.gpio_states.GPIO14.level = 'LOW';
      this.telemetry.relay_active = false;
      this.relayRemainingMs = 0;
      this.telemetry.relay_countdown_ms = 0;
      this.telemetry.current_ma = 42;
    }

    this.broadcastState();
  }

  // Interactive Phase Controller (Mago de Oz manual step progression)
  public async handleManualStep(phase: string, action: 'start' | 'approve' | 'deny', uid?: string): Promise<void> {
    const targetUid = uid || this.activeUid || '04:A1:88:C2';
    const user = getUserByUid(targetUid) || {
      id: 'usr-1',
      uid: targetUid,
      name: 'Carlos Mendoza',
      role: 'Docente Investigador FIEI',
      status: 'ACTIVE',
      face_token: 'face-001',
      created_at: '',
      last_access: '',
      chi2_nominal: 28.45
    };
    this.activeUser = user;
    this.activeUid = user.uid;

    if (this.relayTimer) {
      clearTimeout(this.relayTimer);
      this.relayTimer = null;
    }

    if (phase === 'IDLE') {
      this.resetToIdle();
      return;
    }

    if (phase === 'GRANT') {
      await this.executeStepGrant(user, user.chi2_nominal || 28.45);
      return;
    }

    if (phase === 'DENY') {
      await this.executeStepDeny(user, 'Acceso denegado manualmente desde consola de operador', 403);
      return;
    }

    if (phase === 'READ_RFID') {
      if (action === 'start') {
        this.currentState = 'READ_RFID';
        this.stepDetails.IDLE.status = 'completed';
        this.stepDetails.READ_RFID.status = 'active';
        this.stepDetails.BIOMETRIC_VER.status = 'pending';
        this.stepDetails.VAULT_AUTH.status = 'pending';
        this.stepDetails.GRANT.status = 'pending';
        this.stepDetails.DENY.status = 'pending';
        this.telemetry.gpio_states.GPIO10.level = 'HIGH';
        this.telemetry.gpio_states.GPIO11.level = 'HIGH';
        this.telemetry.gpio_states.GPIO13.level = 'HIGH';
        this.telemetry.gpio_states.GPIO4.level = 'LOW';
        this.telemetry.gpio_states.GPIO5.level = 'LOW';
        this.telemetry.gpio_states.GPIO14.level = 'LOW';
        this.telemetry.relay_active = false;
        this.telemetry.current_ma = 74;
        this.stepDetails.READ_RFID.actual_ms = 12.5;
        this.broadcastState();
      } else if (action === 'approve') {
        this.stepDetails.READ_RFID.status = 'completed';
        this.stepDetails.READ_RFID.actual_ms = 12.5;
        // Advance to BIOMETRIC_VER (illuminates in orange on monitor)
        this.currentState = 'BIOMETRIC_VER';
        this.stepDetails.BIOMETRIC_VER.status = 'active';
        this.telemetry.gpio_states.GPIO4.level = 'HIGH';
        this.telemetry.gpio_states.GPIO5.level = 'HIGH';
        this.telemetry.current_ma = 158;
        this.blinkDetected = true;
        this.activeChi2 = 28.45;
        this.broadcastState();
      } else if (action === 'deny') {
        this.stepDetails.READ_RFID.status = 'failed';
        await this.executeStepDeny(user, 'Tarjeta RFID denegada o UID no reconocido en bus SPI', 400);
      }
      return;
    }

    if (phase === 'BIOMETRIC_VER') {
      if (action === 'start') {
        this.currentState = 'BIOMETRIC_VER';
        this.stepDetails.IDLE.status = 'completed';
        this.stepDetails.READ_RFID.status = 'completed';
        this.stepDetails.BIOMETRIC_VER.status = 'active';
        this.stepDetails.VAULT_AUTH.status = 'pending';
        this.stepDetails.GRANT.status = 'pending';
        this.stepDetails.DENY.status = 'pending';
        this.telemetry.gpio_states.GPIO4.level = 'HIGH';
        this.telemetry.gpio_states.GPIO5.level = 'HIGH';
        this.telemetry.current_ma = 158;
        this.broadcastState();
      } else if (action === 'approve') {
        this.stepDetails.BIOMETRIC_VER.status = 'completed';
        this.stepDetails.BIOMETRIC_VER.actual_ms = 88.5;
        this.blinkDetected = true;
        this.activeChi2 = 28.45;
        // Advance to VAULT_AUTH (illuminates in orange on monitor)
        this.currentState = 'VAULT_AUTH';
        this.stepDetails.VAULT_AUTH.status = 'active';
        this.telemetry.gpio_states.GPIO4.level = 'LOW';
        this.telemetry.gpio_states.GPIO5.level = 'LOW';
        this.telemetry.current_ma = 126;
        this.broadcastState();
      } else if (action === 'deny') {
        this.stepDetails.BIOMETRIC_VER.status = 'failed';
        this.blinkDetected = false;
        this.activeChi2 = 68.90;
        await this.executeStepDeny(user, 'Fallo biométrico OV2640: foto estática detectada (anti-spoofing)', 401);
      }
      return;
    }

    if (phase === 'VAULT_AUTH') {
      if (action === 'start') {
        this.currentState = 'VAULT_AUTH';
        this.stepDetails.IDLE.status = 'completed';
        this.stepDetails.READ_RFID.status = 'completed';
        this.stepDetails.BIOMETRIC_VER.status = 'completed';
        this.stepDetails.VAULT_AUTH.status = 'active';
        this.stepDetails.GRANT.status = 'pending';
        this.stepDetails.DENY.status = 'pending';
        this.telemetry.current_ma = 126;
        this.broadcastState();
      } else if (action === 'approve') {
        this.stepDetails.VAULT_AUTH.status = 'completed';
        this.stepDetails.VAULT_AUTH.actual_ms = 24.5;
        await this.executeStepGrant(user, user.chi2_nominal || 28.45);
      } else if (action === 'deny') {
        this.stepDetails.VAULT_AUTH.status = 'failed';
        await this.executeStepDeny(user, 'Credencial revocada en HashiCorp Vault (HTTP 403 Forbidden)', 403);
      }
      return;
    }
  }

  // Toggle user authorization in HashiCorp Vault
  public toggleUserVaultStatus(uid: string): boolean {
    const user = getUserByUid(uid);
    if (!user) return false;
    const newStatus = user.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    updateUserStatus(uid, newStatus);
    this.broadcastState();
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gatekeeperState = new GatekeeperState();
