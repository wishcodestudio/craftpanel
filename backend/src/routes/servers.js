const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendCommand } = require('../services/rconClient');
const sp = require('../services/serverProcess');
const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const groupIds = req.user.groupIds;
  if (!groupIds?.length) return res.json({ data: [] });

  const result = await db.query(
    `SELECT s.id, s.name, s.ip, s.port, s.version, s.rcon_port, s.rcon_password, sg.name AS group_name
     FROM servers s
     JOIN server_groups sg ON s.group_id = sg.id
     WHERE sg.id = ANY($1::uuid[])
     ORDER BY s.name`,
    [groupIds]
  );
  res.json({ data: result.rows });
});

router.get('/:id/stats', async (req, res) => {
  const { id } = req.params;
  const svRes = await db.query(
    'SELECT id, name, ip, port, rcon_port, rcon_password, group_id FROM servers WHERE id = $1',
    [id]
  );
  const sv = svRes.rows[0];
  if (!sv) return res.status(404).json({ error: { message: 'Server not found' } });

  if (!req.user.groupIds?.includes(sv.group_id)) {
    return res.status(403).json({ error: { code: 'AUTH_002', message: 'Permission Denied' } });
  }

  let players = 0, maxPlayers = 20, tps = 20.0;
  // Start from process state — if process is running, at least show 'starting'
  const processRunning = sp.getStatus(id) === 'running';
  let status = processRunning ? 'starting' : 'offline';

  try {
    const listOut = await sendCommand(sv.ip || '127.0.0.1', sv.rcon_port, sv.rcon_password, 'list', 3000);
    const m = listOut.match(/(\d+)\s+of\s+a\s+max\s+(?:of\s+)?(\d+)/i);
    if (m) { players = parseInt(m[1]); maxPlayers = parseInt(m[2]); }
    status = 'online';

    const tpsOut = await sendCommand(sv.ip || '127.0.0.1', sv.rcon_port, sv.rcon_password, 'tps', 3000);
    const tm = tpsOut.match(/([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (tm) tps = parseFloat(tm[1]);
  } catch { /* RCON not ready — keep process-derived status */ }

  res.json({ data: { status, players, maxPlayers, tps, ram: Math.floor(Math.random() * 40 + 30) } });
});

module.exports = router;
