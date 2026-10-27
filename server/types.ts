export type FsmState = 'IDLE' | 'READ_RFID' | 'BIOMETRIC_VER' | 'VAULT_AUTH' | 'GRANT' | 'DENY';

export interface UserRecord {
  id: string;
  name: string;
  uid: string;
  role: string;
  status: 'ACTIVE' | 'REVOKED';
  chi2_nominal: number;
  last_access: string | null;
  created_at?: string;
}

export interface FsmStepDetail {
  state: FsmState;
  label: string;
  nominal_ms: number;
  actual_ms: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  details: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  uid: string;
  user_name: string;
  chi2_distance: number;
  chi2_threshold: number;
  blink_verified: boolean;
  decision: 'GRANT' | 'DENY';
  reason: string;
  latency_ms: number;
  vault_http_status: number;
}

export interface GpioPinState {
  pin: string;
  name: string;
  level: 'HIGH' | 'LOW';
  mode: 'OUTPUT' | 'INPUT' | 'SPI' | 'I2C' | 'UART';
  bus: string;
  notes: string;
}

export interface HardwareTelemetry {
  voltage_usbc: number;
  battery_v: number;
  battery_pct: number;
  current_ma: number;
  temp_c: number;
  relay_active: boolean;
  relay_countdown_ms: number;
  uptime_seconds: number;
  gpio_states: Record<string, GpioPinState>;
}

export interface OledDisplayState {
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  icon: 'idle' | 'scanning' | 'verifying' | 'vault' | 'unlocked' | 'locked' | 'denied';
  subText?: string;
}

export interface VaultPacket {
  id: string;
  timestamp: string;
  endpoint: string;
  tls_version: string;
  cipher_suite: string;
  token_masked: string;
  http_method: string;
  http_status: number;
  response_time_ms: number;
  uid_queried: string;
  decision: 'ACTIVE' | 'REVOKED' | 'NOT_FOUND';
  raw_response?: any;
}

export interface SystemMetrics {
  total_attempts: number;
  grants: number;
  denies: number;
  accuracy_rate: number;
  far_rate: number;
  frr_rate: number;
  average_latency_ms: number;
}

export interface SimulationPayload {
  scenario: 'FULL_GRANT' | 'SPOOF_PHOTO' | 'LBPH_MISMATCH' | 'VAULT_REVOKED' | 'CUSTOM';
  uid?: string;
  chi2_distance?: number;
  blink_verified?: boolean;
  target_user_name?: string;
}
