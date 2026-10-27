import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { UserRecord, AuditLog, VaultPacket, SystemMetrics } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Pre-seeded author records from technical specification
const INITIAL_USERS: UserRecord[] = [
  {
    id: 'usr-01',
    name: 'Alessandro Thiago Rosas Mirabal',
    uid: '04:A1:88:C2',
    role: 'Investigador Principal',
    status: 'ACTIVE',
    chi2_nominal: 28.45,
    last_access: '2026-10-25 21:55:12',
    created_at: '2026-10-20 08:00:00'
  },
  {
    id: 'usr-02',
    name: 'Piero Raúl Rivera Estrada',
    uid: '04:B7:31:D9',
    role: 'Arquitectura Embebida',
    status: 'ACTIVE',
    chi2_nominal: 29.10,
    last_access: '2026-10-25 21:30:40',
    created_at: '2026-10-20 08:00:00'
  },
  {
    id: 'usr-03',
    name: 'Franz José Jimenez Villalva',
    uid: '04:C9:55:E4',
    role: 'Visión Artificial LBPH',
    status: 'ACTIVE',
    chi2_nominal: 27.80,
    last_access: '2026-10-25 21:12:05',
    created_at: '2026-10-20 08:00:00'
  },
  {
    id: 'usr-04',
    name: 'Luis Angel Cotacallapa Velasquez',
    uid: '04:D2:19:F1',
    role: 'Seguridad Vault TLS',
    status: 'ACTIVE',
    chi2_nominal: 30.25,
    last_access: '2026-10-25 20:45:18',
    created_at: '2026-10-20 08:00:00'
  },
  {
    id: 'usr-05',
    name: 'Tito Condori Quispe',
    uid: '04:E6:73:A8',
    role: 'Integración Hardware',
    status: 'ACTIVE',
    chi2_nominal: 28.95,
    last_access: '2026-10-25 20:22:33',
    created_at: '2026-10-20 08:00:00'
  },
  {
    id: 'usr-06',
    name: 'Tarjeta Clonada MIFARE Classic (Ataque Diccionario)',
    uid: 'DE:AD:BE:EF',
    role: 'Intruso No Autorizado',
    status: 'REVOKED',
    chi2_nominal: 68.90,
    last_access: null,
    created_at: '2026-10-25 18:00:00'
  }
];

const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-10-25 21:55:12',
    uid: '04:A1:88:C2',
    user_name: 'Alessandro Thiago Rosas Mirabal',
    chi2_distance: 28.45,
    chi2_threshold: 45.0,
    blink_verified: true,
    decision: 'GRANT',
    reason: 'Multi-factor authentication verified (RFID + LBPH Chi2 28.45 + Vault KV2 ACTIVE)',
    latency_ms: 186.8,
    vault_http_status: 200
  },
  {
    id: 'log-002',
    timestamp: '2026-10-25 21:30:40',
    uid: '04:B7:31:D9',
    user_name: 'Piero Raúl Rivera Estrada',
    chi2_distance: 29.10,
    chi2_threshold: 45.0,
    blink_verified: true,
    decision: 'GRANT',
    reason: 'Multi-factor authentication verified (RFID + LBPH Chi2 29.10 + Vault KV2 ACTIVE)',
    latency_ms: 187.4,
    vault_http_status: 200
  },
  {
    id: 'log-003',
    timestamp: '2026-10-25 21:12:05',
    uid: '04:C9:55:E4',
    user_name: 'Franz José Jimenez Villalva',
    chi2_distance: 27.80,
    chi2_threshold: 45.0,
    blink_verified: true,
    decision: 'GRANT',
    reason: 'Multi-factor authentication verified (RFID + LBPH Chi2 27.80 + Vault KV2 ACTIVE)',
    latency_ms: 185.9,
    vault_http_status: 200
  },
  {
    id: 'log-004',
    timestamp: '2026-10-25 20:45:18',
    uid: '04:D2:19:F1',
    user_name: 'Luis Angel Cotacallapa Velasquez',
    chi2_distance: 30.25,
    chi2_threshold: 45.0,
    blink_verified: true,
    decision: 'GRANT',
    reason: 'Multi-factor authentication verified (RFID + LBPH Chi2 30.25 + Vault KV2 ACTIVE)',
    latency_ms: 188.2,
    vault_http_status: 200
  },
  {
    id: 'log-005',
    timestamp: '2026-10-25 20:22:33',
    uid: '04:E6:73:A8',
    user_name: 'Tito Condori Quispe',
    chi2_distance: 28.95,
    chi2_threshold: 45.0,
    blink_verified: true,
    decision: 'GRANT',
    reason: 'Multi-factor authentication verified (RFID + LBPH Chi2 28.95 + Vault KV2 ACTIVE)',
    latency_ms: 186.5,
    vault_http_status: 200
  },
  {
    id: 'log-006',
    timestamp: '2026-10-25 19:50:00',
    uid: 'DE:AD:BE:EF',
    user_name: 'Tarjeta Clonada MIFARE Classic (Ataque Diccionario)',
    chi2_distance: 68.90,
    chi2_threshold: 45.0,
    blink_verified: false,
    decision: 'DENY',
    reason: 'Biometric Anti-Spoofing failed: No eye blink transition detected (Static photograph suspected)',
    latency_ms: 101.2,
    vault_http_status: 403
  }
];

// In-memory fallback dataset for environments without node:sqlite
let memoryUsers: UserRecord[] = [...INITIAL_USERS];
let memoryLogs: AuditLog[] = [...INITIAL_LOGS];
let memoryVaultPackets: VaultPacket[] = [];

// SQLite instance (if supported by the Node.js runtime)
export let db: any = null;

try {
  const sqliteModule = await import('node:sqlite');
  if (sqliteModule && sqliteModule.DatabaseSync) {
    const dbPath = path.join(dataDir, 'gatekeeper.db');
    db = new sqliteModule.DatabaseSync(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        uid TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        chi2_nominal REAL NOT NULL DEFAULT 28.45,
        last_access TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        uid TEXT NOT NULL,
        user_name TEXT NOT NULL,
        chi2_distance REAL NOT NULL,
        chi2_threshold REAL NOT NULL DEFAULT 45.0,
        blink_verified INTEGER NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        latency_ms REAL NOT NULL,
        vault_http_status INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vault_packets (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        tls_version TEXT NOT NULL,
        cipher_suite TEXT NOT NULL,
        token_masked TEXT NOT NULL,
        http_method TEXT NOT NULL,
        http_status INTEGER NOT NULL,
        response_time_ms REAL NOT NULL,
        uid_queried TEXT NOT NULL,
        decision TEXT NOT NULL,
        raw_response TEXT
      );
    `);

    // Seed SQLite users if empty
    const countUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const userCountResult = countUsersStmt.get() as { count: number };

    if (userCountResult.count === 0) {
      const insertUserStmt = db.prepare(`
        INSERT INTO users (id, name, uid, role, status, chi2_nominal, last_access, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of INITIAL_USERS) {
        insertUserStmt.run(
          user.id,
          user.name,
          user.uid,
          user.role,
          user.status,
          user.chi2_nominal,
          user.last_access,
          user.created_at || new Date().toISOString()
        );
      }

      const insertLogStmt = db.prepare(`
        INSERT INTO audit_logs (id, timestamp, uid, user_name, chi2_distance, chi2_threshold, blink_verified, decision, reason, latency_ms, vault_http_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const log of INITIAL_LOGS) {
        insertLogStmt.run(
          log.id,
          log.timestamp,
          log.uid,
          log.user_name,
          log.chi2_distance,
          log.chi2_threshold,
          log.blink_verified ? 1 : 0,
          log.decision,
          log.reason,
          log.latency_ms,
          log.vault_http_status
        );
      }
    }

    console.log(':: Almacenamiento activo: SQLite Nativo (node:sqlite)');
  }
} catch {
  console.log(':: Almacenamiento activo: Modo Universal en Memoria (Node <22 compatible)');
}

export function getAllUsers(): UserRecord[] {
  if (db) {
    const stmt = db.prepare('SELECT id, name, uid, role, status, chi2_nominal, last_access, created_at FROM users ORDER BY id ASC');
    return stmt.all() as unknown as UserRecord[];
  }
  return [...memoryUsers];
}

export function getUserByUid(uid: string): UserRecord | null {
  if (db) {
    const stmt = db.prepare('SELECT id, name, uid, role, status, chi2_nominal, last_access, created_at FROM users WHERE uid = ?');
    const result = stmt.get(uid);
    return (result as unknown as UserRecord) || null;
  }
  return memoryUsers.find((u) => u.uid.toUpperCase() === uid.toUpperCase()) || null;
}

export function updateUserStatus(uid: string, status: 'ACTIVE' | 'REVOKED'): boolean {
  if (db) {
    const stmt = db.prepare('UPDATE users SET status = ? WHERE uid = ?');
    const result = stmt.run(status, uid);
    return result.changes > 0;
  }
  const u = memoryUsers.find((u) => u.uid.toUpperCase() === uid.toUpperCase());
  if (u) {
    u.status = status;
    return true;
  }
  return false;
}

export function updateLastAccess(uid: string, timestamp: string): void {
  if (db) {
    const stmt = db.prepare('UPDATE users SET last_access = ? WHERE uid = ?');
    stmt.run(timestamp, uid);
    return;
  }
  const u = memoryUsers.find((u) => u.uid.toUpperCase() === uid.toUpperCase());
  if (u) {
    u.last_access = timestamp;
  }
}

export function insertAuditLog(log: AuditLog): void {
  if (db) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, timestamp, uid, user_name, chi2_distance, chi2_threshold, blink_verified, decision, reason, latency_ms, vault_http_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      log.id,
      log.timestamp,
      log.uid,
      log.user_name,
      log.chi2_distance,
      log.chi2_threshold,
      log.blink_verified ? 1 : 0,
      log.decision,
      log.reason,
      log.latency_ms,
      log.vault_http_status
    );
    return;
  }
  memoryLogs.unshift({ ...log });
  if (memoryLogs.length > 200) {
    memoryLogs.pop();
  }
}

export function getAuditLogs(limit: number = 50): AuditLog[] {
  if (db) {
    const stmt = db.prepare(`
      SELECT id, timestamp, uid, user_name, chi2_distance, chi2_threshold, blink_verified, decision, reason, latency_ms, vault_http_status
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      ...r,
      blink_verified: Boolean(r.blink_verified)
    }));
  }
  return memoryLogs.slice(0, limit);
}

export function insertVaultPacket(packet: VaultPacket): void {
  if (db) {
    const stmt = db.prepare(`
      INSERT INTO vault_packets (id, timestamp, endpoint, tls_version, cipher_suite, token_masked, http_method, http_status, response_time_ms, uid_queried, decision, raw_response)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      packet.id,
      packet.timestamp,
      packet.endpoint,
      packet.tls_version,
      packet.cipher_suite,
      packet.token_masked,
      packet.http_method,
      packet.http_status,
      packet.response_time_ms,
      packet.uid_queried,
      packet.decision,
      packet.raw_response ? JSON.stringify(packet.raw_response) : null
    );
    return;
  }
  memoryVaultPackets.unshift({ ...packet });
  if (memoryVaultPackets.length > 100) {
    memoryVaultPackets.pop();
  }
}

export function getVaultPackets(limit: number = 20): VaultPacket[] {
  if (db) {
    const stmt = db.prepare(`
      SELECT id, timestamp, endpoint, tls_version, cipher_suite, token_masked, http_method, http_status, response_time_ms, uid_queried, decision, raw_response
      FROM vault_packets
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      ...r,
      raw_response: r.raw_response ? JSON.parse(r.raw_response) : null
    }));
  }
  return memoryVaultPackets.slice(0, limit);
}

export function getSystemMetrics(): SystemMetrics {
  let total = 0;
  let grants = 0;
  let denies = 0;
  let avgLatency = 187.0;

  if (db) {
    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN decision = 'GRANT' THEN 1 ELSE 0 END) as grants,
        SUM(CASE WHEN decision = 'DENY' THEN 1 ELSE 0 END) as denies,
        AVG(latency_ms) as avg_latency
      FROM audit_logs
    `);
    const stats = statsStmt.get() as { total: number; grants: number; denies: number; avg_latency: number | null };

    total = stats?.total || 0;
    grants = stats?.grants || 0;
    denies = stats?.denies || 0;
    avgLatency = Number((stats?.avg_latency || 187.0).toFixed(1));
  } else {
    total = memoryLogs.length;
    grants = memoryLogs.filter((l) => l.decision === 'GRANT').length;
    denies = memoryLogs.filter((l) => l.decision === 'DENY').length;
    if (total > 0) {
      const sum = memoryLogs.reduce((acc, curr) => acc + curr.latency_ms, 0);
      avgLatency = Number((sum / total).toFixed(1));
    }
  }

  return {
    total_attempts: total,
    grants,
    denies,
    accuracy_rate: 98.0,
    far_rate: 2.0,
    frr_rate: 2.0,
    average_latency_ms: avgLatency
  };
}
