const db = require('../db');
const sp = require('../services/serverProcess');
const { sendCommand } = require('../services/rconClient');

// Cache server row (for RCON details) per socket+server
const serverCache = new Map(); // `${socket.id}:${serverId}` → sv

function setupTerminalSocket(io, socket) {
  const watching = new Set();

  async function resolveServer(serverId) {
    const r = await db.query(
      'SELECT id, name, dir_path, ip, rcon_port, rcon_password, group_id FROM servers WHERE id = $1',
      [serverId]
    ).catch(() => null);
    const sv = r?.rows[0];
    if (!sv || !socket.data.groupIds?.includes(sv.group_id)) return null;
    return sv;
  }

  // ── terminal:connect ──────────────────────────────────────────────────────
  socket.on('terminal:connect', async ({ serverId }) => {
    if (watching.has(serverId)) return;

    const sv = await resolveServer(serverId);
    if (!sv) { socket.emit('terminal:error', { message: 'Access denied' }); return; }

    serverCache.set(`${socket.id}:${serverId}`, sv);
    socket.join(`sv:${serverId}`);
    watching.add(serverId);

    const { backfill, status } = sp.subscribe(serverId, socket.id, (type, payload) => {
      if (type === 'output') socket.emit('terminal:output', { data: payload });
      else if (type === 'status') socket.emit('server:status', { serverId, status: payload });
    });

    if (backfill) socket.emit('terminal:output', { data: backfill });
    socket.emit('terminal:ready', { name: sv.name, status });

    if (status === 'stopped') {
      socket.emit('terminal:output', {
        data: '\x1b[33m[Server is stopped — click ▶ Start to launch it]\x1b[0m\r\n',
      });
    }
  });

  // ── terminal:command — complete line from the input bar ───────────────────
  socket.on('terminal:command', async ({ serverId, cmd }) => {
    if (!cmd?.trim()) return;

    // Strip leading slash — Minecraft console doesn't use it
    const line = cmd.trim().replace(/^\//, '');
    const sv   = serverCache.get(`${socket.id}:${serverId}`);
    let sent   = false;

    // Try RCON first (most reliable — bypasses cmd.exe stdin issues)
    if (sv?.rcon_password) {
      try {
        const out = await sendCommand(sv.ip || '127.0.0.1', sv.rcon_port, sv.rcon_password, line, 3000);
        if (out?.trim()) {
          socket.emit('terminal:output', { data: `\x1b[90m${out}\x1b[0m\r\n` });
        }
        sent = true;
      } catch { /* RCON not up yet — fall through */ }
    }

    // Fall back to process stdin / PTY
    if (!sent) {
      const res = sp.sendLine(serverId, line);
      if (!res.ok) {
        socket.emit('terminal:output', {
          data: `\x1b[31m[Cannot send: ${res.error}]\x1b[0m\r\n`,
        });
      }
      sent = res.ok;
    }

    if (sent) {
      db.query(
        `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1,$2,'ran_command',$3)`,
        [socket.data.userId, serverId, line]
      ).catch(() => {});
    }
  });

  // ── server:start ──────────────────────────────────────────────────────────
  socket.on('server:start', async ({ serverId }) => {
    const sv = await resolveServer(serverId);
    if (!sv) return;

    const res = sp.start(serverId, sv.dir_path);
    if (!res.ok) {
      socket.emit('terminal:output', { data: `\r\n\x1b[31m[Start failed: ${res.error}]\x1b[0m\r\n` });
      socket.emit('server:status', { serverId, status: 'stopped' });
    } else {
      socket.emit('terminal:output', { data: `\r\n\x1b[32m[Launching via ${res.script}…]\x1b[0m\r\n` });
      io.to(`sv:${serverId}`).emit('server:status', { serverId, status: 'running' });
      db.query(
        `INSERT INTO activity_log (user_id, server_id, action) VALUES ($1,$2,'started_server')`,
        [socket.data.userId, serverId]
      ).catch(() => {});
    }
  });

  // ── server:stop ───────────────────────────────────────────────────────────
  socket.on('server:stop', async ({ serverId }) => {
    const sv = await resolveServer(serverId);
    if (!sv) return;

    const res = sp.stop(serverId);
    if (res.ok) {
      io.to(`sv:${serverId}`).emit('server:status', { serverId, status: 'stopping' });
      db.query(
        `INSERT INTO activity_log (user_id, server_id, action) VALUES ($1,$2,'stopped_server')`,
        [socket.data.userId, serverId]
      ).catch(() => {});
    }
  });

  // ── server:restart ────────────────────────────────────────────────────────
  socket.on('server:restart', async ({ serverId }) => {
    const sv = await resolveServer(serverId);
    if (!sv) return;

    sp.restart(serverId, sv.dir_path);
    io.to(`sv:${serverId}`).emit('server:status', { serverId, status: 'restarting' });
    db.query(
      `INSERT INTO activity_log (user_id, server_id, action) VALUES ($1,$2,'restarted_server')`,
      [socket.data.userId, serverId]
    ).catch(() => {});
  });

  socket.on('terminal:resize', () => {});

  // ── cleanup ───────────────────────────────────────────────────────────────
  socket.on('terminal:disconnect', ({ serverId }) => {
    sp.unsubscribe(serverId, socket.id);
    watching.delete(serverId);
    serverCache.delete(`${socket.id}:${serverId}`);
    socket.leave(`sv:${serverId}`);
  });

  socket.on('disconnect', () => {
    for (const serverId of watching) {
      sp.unsubscribe(serverId, socket.id);
      serverCache.delete(`${socket.id}:${serverId}`);
    }
    watching.clear();
  });
}

module.exports = { setupTerminalSocket };
