export interface ScenarioDefinition {
  id: string;
  type: 'grant' | 'warn' | 'deny' | 'revoke';
  title: string;
  badge: string;
  summary: string;
  actionText: string;
  runningText: string;
  successText: string;
  technicalFlow: string;
  nominalMs?: number;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'FULL_GRANT',
    type: 'grant',
    title: 'Acceso exitoso',
    badge: '187 ms',
    summary: 'RFID + rostro + Vault OK. Abre el relé 5 s.',
    actionText: 'Probar acceso',
    runningText: 'Probando acceso...',
    successText: 'Acceso probado',
    technicalFlow: 'READ_RFID (12.5ms) → BIOMETRIC_VER (88.5ms, χ² nominal ≤ 45.0, parpadeo OK) → VAULT_AUTH (78.0ms, HTTP 200) → GRANT (GPIO14 5000ms).',
    nominalMs: 187.0
  },
  {
    id: 'SPOOF_PHOTO',
    type: 'warn',
    title: 'Foto impresa',
    badge: 'Anti-spoof',
    summary: 'Falla parpadeo anti-spoofing en cámara.',
    actionText: 'Probar foto impresa',
    runningText: 'Probando foto...',
    successText: 'Foto probada',
    technicalFlow: 'Pasa lectura RFID pero falla en BIOMETRIC_VER: falta de transición de parpadeo entre cuadros N y N+3 (foto estática) → DENY.',
    nominalMs: 101.2
  },
  {
    id: 'LBPH_MISMATCH',
    type: 'deny',
    title: 'Rostro desconocido',
    badge: 'χ² = 68.90',
    summary: 'Distancia χ² supera el umbral (68.90 > 45.0).',
    actionText: 'Probar rostro desconocido',
    runningText: 'Probando rostro...',
    successText: 'Rostro probado',
    technicalFlow: 'Pasa lectura RFID pero la distancia Chi-cuadrado calculada por el OV2640 supera el umbral normativo (68.90 > 45.0) → DENY.',
    nominalMs: 102.5
  },
  {
    id: 'VAULT_REVOKED',
    type: 'revoke',
    title: 'Tarjeta revocada',
    badge: 'Vault 403',
    summary: 'Credencial bloqueada en Vault (HTTP 403).',
    actionText: 'Probar tarjeta revocada',
    runningText: 'Probando revocada...',
    successText: 'Revocada probada',
    technicalFlow: 'Pasa RFID y biometría, pero la consulta TLS 1.3 a HashiCorp Vault (:8200 KV2) responde 403 Forbidden por revocación → DENY.',
    nominalMs: 178.5
  }
];
