const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: { code: 'VAL_001', message: 'Invalid or missing parameters' } });
  }

  const userRes = await db.query(
    'SELECT id, username, password_hash, name, role FROM users WHERE username = $1',
    [username]
  ).catch(() => null);

  const user = userRes?.rows[0];
  if (!user) {
    return res.status(401).json({ error: { code: 'AUTH_001', message: 'Invalid username or password' } });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: { code: 'AUTH_001', message: 'Invalid username or password' } });
  }

  const groupsRes = await db.query(
    `SELECT sg.id, sg.name,
       json_agg(json_build_object('id', s.id, 'name', s.name, 'ip', s.ip, 'port', s.port, 'version', s.version))
         FILTER (WHERE s.id IS NOT NULL) AS servers
     FROM server_groups sg
     JOIN user_group_access uga ON sg.id = uga.group_id
     LEFT JOIN servers s ON s.group_id = sg.id
     WHERE uga.user_id = $1
     GROUP BY sg.id, sg.name`,
    [user.id]
  );

  const groups = groupsRes.rows;

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role, groupIds: groups.map((g) => g.id) },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  await db.query(
    `INSERT INTO activity_log (user_id, action) VALUES ($1, 'logged_in')`,
    [user.id]
  ).catch(() => {});

  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role }, groups });
});

// Restore session — called on page load with existing token
router.get('/me', requireAuth, async (req, res) => {
  const userRes = await db.query(
    'SELECT id, username, name, role FROM users WHERE id = $1',
    [req.user.userId]
  ).catch(() => null);
  const user = userRes?.rows[0];
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });

  const groupsRes = await db.query(
    `SELECT sg.id, sg.name,
       json_agg(json_build_object('id', s.id, 'name', s.name, 'ip', s.ip, 'port', s.port, 'version', s.version))
         FILTER (WHERE s.id IS NOT NULL) AS servers
     FROM server_groups sg
     JOIN user_group_access uga ON sg.id = uga.group_id
     LEFT JOIN servers s ON s.group_id = sg.id
     WHERE uga.user_id = $1
     GROUP BY sg.id, sg.name`,
    [user.id]
  );
  const groups = groupsRes.rows;

  // Re-issue a fresh 8h token so the timer resets on each page load
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role, groupIds: groups.map((g) => g.id) },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role }, groups });
});

module.exports = router;
