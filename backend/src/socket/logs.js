const path = require('path');
const db = require('../db');
const { startWatching, stopWatching, getLastLines } = require('../services/logWatcher');

const subscriptions = new Map(); // socketId:serverId -> true

function setupLogsSocket(io, socket) {
  socket.on('subscribe:logs', async ({ serverId }) => {
    const key = `${socket.id}:${serverId}`;
    if (subscriptions.has(key)) return;

    const svRes = await db.query(
      'SELECT dir_path, group_id FROM servers WHERE id = $1',
      [serverId]
    ).catch(() => null);

    const sv = svRes?.rows[0];
    if (!sv || !socket.data.groupIds?.includes(sv.group_id)) {
      socket.emit('log:error', { message: 'Access denied' });
      return;
    }

    const logPath = path.join(sv.dir_path, 'logs', 'latest.log');
    const backfill = getLastLines(logPath, 200);
    socket.emit('log:backfill', { serverId, lines: backfill });

    subscriptions.set(key, true);
    startWatching(serverId, logPath, (line) => {
      if (subscriptions.has(key)) {
        socket.emit('log:line', { serverId, ...line });
      }
    });
  });

  socket.on('unsubscribe:logs', ({ serverId }) => {
    const key = `${socket.id}:${serverId}`;
    subscriptions.delete(key);
    stopWatching(serverId);
  });

  socket.on('disconnect', () => {
    for (const key of subscriptions.keys()) {
      if (key.startsWith(socket.id + ':')) {
        const serverId = key.split(':')[1];
        subscriptions.delete(key);
        stopWatching(serverId);
      }
    }
  });
}

module.exports = { setupLogsSocket };
