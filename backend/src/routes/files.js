const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const fm = require('../services/fileManager');
const router = express.Router();

router.use(requireAuth);

async function resolveServerDir(userId, groupIds, serverId) {
  const res = await db.query(
    `SELECT s.dir_path, s.group_id FROM servers s WHERE s.id = $1`,
    [serverId]
  );
  const sv = res.rows[0];
  if (!sv) throw Object.assign(new Error('Server not found'), { status: 404 });
  if (!groupIds?.includes(sv.group_id)) {
    throw Object.assign(new Error('Permission Denied'), { code: 'AUTH_002', status: 403 });
  }
  return sv.dir_path;
}

router.get('/', async (req, res) => {
  const { serverId, path: filePath = '/' } = req.query;
  if (!serverId) return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId required' } });
  try {
    const dir = await resolveServerDir(req.user.userId, req.user.groupIds, serverId);
    const files = fm.listDirectory(dir, filePath);
    res.json({ data: { path: filePath, files } });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

router.get('/content', async (req, res) => {
  const { serverId, path: filePath } = req.query;
  if (!serverId || !filePath) return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId and path required' } });
  try {
    const dir = await resolveServerDir(req.user.userId, req.user.groupIds, serverId);
    const content = fm.readFile(dir, filePath);
    res.json({ data: { path: filePath, content } });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

router.put('/content', async (req, res) => {
  const { serverId, path: filePath, content } = req.body || {};
  if (!serverId || !filePath || content === undefined) {
    return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId, path and content required' } });
  }
  try {
    const dir = await resolveServerDir(req.user.userId, req.user.groupIds, serverId);
    fm.writeFile(dir, filePath, content);
    await db.query(
      `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1, $2, 'edited_file', $3)`,
      [req.user.userId, serverId, filePath]
    ).catch(() => {});
    res.json({ data: { success: true, path: filePath } });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

router.post('/folder', async (req, res) => {
  const { serverId, path: filePath } = req.body || {};
  if (!serverId || !filePath) return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId and path required' } });
  try {
    const dir = await resolveServerDir(req.user.userId, req.user.groupIds, serverId);
    fm.createNewFolder(dir, filePath);
    await db.query(
      `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1, $2, 'created_folder', $3)`,
      [req.user.userId, serverId, filePath]
    ).catch(() => {});
    res.json({ data: { success: true, path: filePath } });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

router.delete('/', async (req, res) => {
  const { serverId, path: filePath } = req.query;
  if (!serverId || !filePath) return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId and path required' } });
  try {
    const dir = await resolveServerDir(req.user.userId, req.user.groupIds, serverId);
    fm.deleteFile(dir, filePath);
    await db.query(
      `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1, $2, 'deleted_file', $3)`,
      [req.user.userId, serverId, filePath]
    ).catch(() => {});
    res.json({ data: { success: true, path: filePath } });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

router.post('/restore', async (req, res) => {
  const { serverId, path: filePath } = req.body || {};
  if (!serverId || !filePath) return res.status(400).json({ error: { code: 'VAL_001', message: 'serverId and path required' } });
  try {
    const dir = await resolveServerDir(req.user.userId, req.user.groupIds, serverId);
    fm.restoreBackup(dir, filePath);
    await db.query(
      `INSERT INTO activity_log (user_id, server_id, action, detail) VALUES ($1, $2, 'restored_file', $3)`,
      [req.user.userId, serverId, filePath]
    ).catch(() => {});
    res.json({ data: { success: true, path: filePath } });
  } catch (e) {
    res.status(e.status || 500).json({ error: { code: e.code || 'ERR', message: e.message } });
  }
});

module.exports = router;
