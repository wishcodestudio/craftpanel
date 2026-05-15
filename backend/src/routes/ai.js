const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { analyzeError } = require('../services/aiService');
const { sendCommand } = require('../services/rconClient');
const serverProcess = require('../services/serverProcess');
const fileManager = require('../services/fileManager');
const router = express.Router();

router.use(requireAuth);

async function getServer(userId, groupIds, serverId) {
  const res = await db.query(
    `SELECT s.id, s.dir_path, s.ip, s.rcon_port, s.rcon_password, s.group_id, s.version FROM servers s WHERE s.id = $1`,
    [serverId]
  );
  const sv = res.rows[0];
  if (!sv) throw Object.assign(new Error('Server not found'), { status: 404 });
  if (!groupIds?.includes(sv.group_id)) throw Object.assign(new Error('Permission Denied'), { status: 403 });
  return sv;
}

// ── Action executors ─────────────────────────────────────────────────────────

function escRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function execConfig(dirPath, action) {
  const target = path.resolve(dirPath, action.file.replace(/\//g, path.sep));

  // Safety: stay within server dir
  if (!target.startsWith(path.resolve(dirPath))) {
    throw new Error(`Path traversal blocked: ${action.file}`);
  }

  if (!fs.existsSync(target)) throw new Error(`File not found: ${action.file}`);

  const original = fs.readFileSync(target, 'utf8');
  // Backup before touching
  fs.writeFileSync(target + '.bak', original);

  const re = new RegExp(`^([ \\t]*${escRe(action.key)}[ \\t]*[:=][ \\t]*).*$`, 'm');
  let updated;
  if (re.test(original)) {
    // Preserve the separator style (= for .properties, : for .yml)
    updated = original.replace(re, (_, prefix) => `${prefix}${action.value}`);
  } else {
    // Key doesn't exist — append it
    updated = original.trimEnd() + `\n${action.key}=${action.value}\n`;
  }

  if (updated === original) return { changed: false };
  fs.writeFileSync(target, updated, 'utf8');
  return { changed: true, file: action.file, key: action.key, value: action.value };
}

function execJvm(dirPath, action) {
  const candidates = ['run.bat', 'start.bat', 'run.sh', 'start.sh'];
  let target = null;
  for (const f of candidates) {
    const p = path.join(dirPath, f);
    if (fs.existsSync(p)) { target = p; break; }
  }
  if (!target) throw new Error('No run.bat / run.sh found in server directory');

  const original = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target + '.bak', original);

  const re = new RegExp(`-${escRe(action.flag)}\\S+`, 'g');
  if (!re.test(original)) throw new Error(`Flag -${action.flag} not found in ${path.basename(target)}`);

  const updated = original.replace(new RegExp(`-${escRe(action.flag)}\\S+`, 'g'), `-${action.flag}${action.value}`);
  fs.writeFileSync(target, updated, 'utf8');
  return { changed: true, file: path.basename(target), flag: action.flag, value: action.value };
}

async function execRcon(sv, action) {
  try {
    const out = await sendCommand(sv.ip || '127.0.0.1', sv.rcon_port, sv.rcon_password, action.command, 5000);
    return { ran: action.command, output: out || '(no output)' };
  } catch (e) {
    // Fallback: If RCON is refused but server is running locally, try stdin
    const status = serverProcess.getStatus(sv.id);
    if (status === 'running' || status === 'starting') {
      const res = serverProcess.sendLine(sv.id, action.command);
      if (res.ok) {
        return { 
          ran: action.command, 
          output: '(RCON failed, sent via server console)', 
          warning: `RCON failed: ${e.message}. Command sent to stdin instead.` 
        };
      }
    }
    throw e;
  }
}

function execFile(dirPath, action) {
  const target = path.resolve(dirPath, action.file.replace(/\//g, path.sep));
  if (!target.startsWith(path.resolve(dirPath))) {
    throw new Error(`Path traversal blocked: ${action.file}`);
  }

  if (fs.existsSync(target)) {
    const original = fs.readFileSync(target, 'utf8');
    fs.writeFileSync(target + '.bak', original);
  } else {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }

  fs.writeFileSync(target, action.content, 'utf8');
  return { changed: true, file: action.file, method: 'overwrite' };
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.post('/analyze', async (req, res) => {
  const { serverId, errorText } = req.body || {};
  if (!serverId || !errorText?.trim()) {
    return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId and errorText required' } });
  }
  try {
    const sv = await getServer(req.user.userId, req.user.groupIds, serverId);
    
    // Gather server context for better AI analysis
    const serverStatus = serverProcess.getStatus(serverId);
    let rconEnabled = 'unknown';
    try {
      const props = fileManager.readFile(sv.dir_path, '/server.properties');
      rconEnabled = props.includes('enable-rcon=true');
    } catch {}

    const result = await analyzeError(errorText, {
      server_status: serverStatus,
      rcon_enabled: rconEnabled,
      server_version: sv.version
    });
    
    // Save full result to activity log for later retrieval
    await db.query(
      `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1,$2,'ai_analyzed',$3)`,
      [req.user.userId, serverId, JSON.stringify({ errorText, result })]
    ).catch((e) => console.error('Log failed:', e));

    res.json({ data: result });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

router.post('/apply', async (req, res) => {
  const { serverId, fix } = req.body || {};
  if (!serverId || !fix) {
    return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId and fix required' } });
  }

  let sv;
  try {
    sv = await getServer(req.user.userId, req.user.groupIds, serverId);
  } catch (e) {
    return res.status(e.status || 500).json({ error: { message: e.message } });
  }

  const results = [];

  for (const action of (fix.actions || [])) {
      try {
        let detail;
        if (action.type === 'config') {
          detail = execConfig(sv.dir_path, action);
        } else if (action.type === 'file') {
          detail = execFile(sv.dir_path, action);
        } else if (action.type === 'jvm') {
          detail = execJvm(sv.dir_path, action);
        } else if (action.type === 'rcon') {
          detail = await execRcon(sv, action);
        } else {
          detail = { skipped: true, reason: `Unknown action type: ${action.type}` };
        }
        results.push({ action, status: 'ok', detail });
      } catch (e) {
      results.push({ action, status: 'error', error: e.message });
    }
  }

  const anyOk = results.some((r) => r.status === 'ok');
  await db.query(
    `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1,$2,'ai_applied_fix',$3)`,
    [req.user.userId, serverId, fix.title]
  ).catch(() => {});

  res.json({ data: { success: anyOk, results } });
});

module.exports = router;
