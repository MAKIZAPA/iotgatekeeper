import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gatekeeperState } from './state.js';
import {
  getAllUsers,
  getUserByUid,
  updateUserStatus,
  getAuditLogs,
  getVaultPackets,
  getSystemMetrics
} from './db.js';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;

// CORS setup for local network and dev proxies
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Setup Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

gatekeeperState.setSocketServer(io);

// ==========================================
// HASHICORP VAULT (KV2 ENGINE) REST API
// Route: /v1/secret/data/users
// ==========================================
app.get('/v1/secret/data/users', (req, res) => {
  const users = getAllUsers();
  const token = req.headers['x-vault-token'] || req.headers['authorization'] || 's.vault_guest_token';

  res.status(200).json({
    request_id: `req-${Math.random().toString(36).substring(2, 9)}`,
    lease_id: '',
    renewable: false,
    lease_duration: 2764800,
    wrap_info: null,
    warnings: null,
    auth: null,
    data: {
      data: {
        engine: 'kv-v2',
        mount_path: 'secret',
        tls_enforced: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        vault_version: '1.15.2+ent',
        total_identities: users.length,
        users: users.map(u => ({
          uid: u.uid,
          name: u.name,
          role: u.role,
          status: u.status,
          chi2_threshold: 45.0,
          allowed_perimeters: ['FIEI_PISO_2', 'LAB_SISTEMAS_EMBEBIDOS', 'GATEWAY_ESP32_S3']
        }))
      },
      metadata: {
        created_time: '2026-10-20T08:00:00.000Z',
        custom_metadata: {
          institution: 'UNFV_FIEI',
          project: 'IoT_Gatekeeper_v1.0'
        },
        deletion_time: '',
        destroyed: false,
        version: 2
      }
    }
  });
});

app.post('/v1/secret/data/users/:uid/status', (req, res) => {
  const { uid } = req.params;
  const { status } = req.body;

  if (status !== 'ACTIVE' && status !== 'REVOKED') {
    res.status(400).json({ error: 'Status must be ACTIVE or REVOKED' });
    return;
  }

  const success = updateUserStatus(uid, status);
  if (!success) {
    res.status(404).json({ error: `User with UID ${uid} not found` });
    return;
  }

  gatekeeperState.broadcastState();
  res.status(200).json({
    success: true,
    uid,
    updated_status: status,
    vault_version: 3,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// APPLICATION REST API
// ==========================================
app.get('/api/users', (_req, res) => {
  res.json({ users: getAllUsers() });
});

app.get('/api/logs', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  res.json({ logs: getAuditLogs(limit) });
});

app.get('/api/vault-packets', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  res.json({ packets: getVaultPackets(limit) });
});

app.get('/api/metrics', (_req, res) => {
  res.json({ metrics: getSystemMetrics() });
});

app.get('/api/telemetry', (_req, res) => {
  res.json({
    telemetry: gatekeeperState.telemetry,
    oled: gatekeeperState.oled,
    currentState: gatekeeperState.currentState
  });
});

app.post('/api/fsm/scenario', async (req, res) => {
  const payload = req.body;
  // Trigger asynchronously to respond fast, client listens via WebSocket
  gatekeeperState.runScenario(payload);
  res.json({
    success: true,
    message: `Scenario ${payload.scenario} initiated`,
    payload
  });
});

app.post('/api/fsm/reset', (_req, res) => {
  gatekeeperState.resetToIdle();
  res.json({ success: true, state: 'IDLE' });
});

app.post('/api/fsm/state', (req, res) => {
  const { state } = req.body;
  gatekeeperState.setManualState(state);
  res.json({ success: true, state });
});

app.post('/api/fsm/step', async (req, res) => {
  const { phase, action, uid } = req.body;
  await gatekeeperState.handleManualStep(phase, action, uid);
  res.json({ success: true, phase, action });
});

app.post('/api/relay/unlock', async (_req, res) => {
  await gatekeeperState.triggerRemoteUnlock();
  res.json({ success: true, message: 'WSS_UNLOCK_RELAY executed (GPIO14 5.0s)' });
});

app.post('/api/users/:uid/toggle', (req, res) => {
  const { uid } = req.params;
  const success = gatekeeperState.toggleUserVaultStatus(uid);
  if (!success) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const user = getUserByUid(uid);
  res.json({ success: true, user });
});

// ==========================================
// SOCKET.IO EVENT HANDLERS
// ==========================================
io.on('connection', (socket) => {
  // Emit initial full snapshot immediately
  socket.emit('state:sync', {
    currentState: gatekeeperState.currentState,
    currentScenario: gatekeeperState.currentScenario,
    activeUser: gatekeeperState.activeUser,
    activeUid: gatekeeperState.activeUid,
    activeChi2: gatekeeperState.activeChi2,
    blinkDetected: gatekeeperState.blinkDetected,
    totalLatencyMs: gatekeeperState.totalLatencyMs,
    stepDetails: gatekeeperState.stepDetails,
    telemetry: gatekeeperState.telemetry,
    oled: gatekeeperState.oled,
    metrics: getSystemMetrics(),
    users: getAllUsers(),
    recentLogs: getAuditLogs(15),
    recentVaultPackets: getVaultPackets(10)
  });

  socket.on('fsm:trigger_scenario', (payload) => {
    gatekeeperState.runScenario(payload);
  });

  socket.on('fsm:set_manual_state', (state) => {
    gatekeeperState.setManualState(state);
  });

  socket.on('fsm:manual_step', async (payload: { phase: string; action: 'start' | 'approve' | 'deny'; uid?: string }) => {
    await gatekeeperState.handleManualStep(payload.phase, payload.action, payload.uid);
  });

  socket.on('fsm:reset', () => {
    gatekeeperState.resetToIdle();
  });

  socket.on('relay:remote_unlock', () => {
    gatekeeperState.triggerRemoteUnlock();
  });

  socket.on('vault:toggle_status', (uid: string) => {
    gatekeeperState.toggleUserVaultStatus(uid);
  });

  socket.on('operator:adjust_chi2', (value: number) => {
    gatekeeperState.activeChi2 = Number(value.toFixed(2));
    gatekeeperState.broadcastState();
  });
});

// ==========================================
// STATIC FRONTEND SERVING (PRODUCTION / RENDER)
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(distPath)) {
  console.log(`:: Frontend estático montado desde: ${distPath}`);
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/v1') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`:: IoT Gatekeeper v1.0 Server activo en puerto ${PORT}`);
  console.log(`:: HashiCorp Vault KV2 Engine emulado en /v1/secret/data/users`);
  console.log(`:: WebSocket Channel listo para sincronización con frontend`);
});
