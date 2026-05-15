const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { serverId, limit = 50 } = req.query;
  const groupIds = req.user.groupIds || [];

  let query, params;
  if (serverId) {
    query = `
      SELECT al.id, al.action, al.detail, al.created_at,
             u.username, u.name AS user_name,
             s.name AS server_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN servers s ON al.server_id = s.id
      WHERE al.server_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2`;
    params = [serverId, limit];
  } else {
    query = `
      SELECT al.id, al.action, al.detail, al.created_at,
             u.username, u.name AS user_name,
             s.name AS server_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN servers s ON al.server_id = s.id
      WHERE s.group_id = ANY($1::uuid[]) OR al.server_id IS NULL
      ORDER BY al.created_at DESC
      LIMIT $2`;
    params = [groupIds, limit];
  }

  const result = await db.query(query, params);
  res.json({ data: result.rows });
});

module.exports = router;
