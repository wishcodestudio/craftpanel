const chokidar = require('chokidar');
const fs = require('fs');

const watchers = new Map();

function parseLogLine(line) {
  if (!line.trim()) return null;
  // Handle [12:34:56] [Thread/LEVEL]: msg or [12:34:56] [Plugin] [LEVEL]: msg
  const m = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s+\[.*?([A-Z]+)\]:\s+(.+)$/);
  if (m) {
    let level = m[2] || 'INFO';
    const msg = m[3];
    // Fallback: If level is suspiciously long or mixed case (not INFO/WARN/ERROR), 
    // it might be a plugin name, so we check the message too.
    if (!['INFO', 'WARN', 'ERROR', 'FATAL'].includes(level)) {
      if (line.includes('[ERROR]')) level = 'ERROR';
      else if (line.includes('[WARN]')) level = 'WARN';
      else level = 'INFO';
    }
    return { time: m[1], level, msg };
  }
  const m2 = line.match(/^(\d{4}-\d{2}-\d{2}\s+)?(\d{2}:\d{2}:\d{2})\s+(INFO|WARN|ERROR|FATAL)\s+(.+)$/);
  if (m2) {
    return { time: m2[2], level: m2[3], msg: m2[4] };
  }
  
  // Generic fallback: check for keywords in the whole line
  let level = 'INFO';
  if (line.toUpperCase().includes('ERROR') || line.toUpperCase().includes('FATAL')) level = 'ERROR';
  else if (line.toUpperCase().includes('WARN')) level = 'WARN';
  
  return { time: new Date().toTimeString().slice(0, 8), level, msg: line.trim() };
}

function getLastLines(logPath, n = 200) {
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    return content.split('\n').filter(Boolean).slice(-n).map(parseLogLine).filter(Boolean);
  } catch {
    return [];
  }
}

function startWatching(serverId, logPath, onLine) {
  if (watchers.has(serverId)) return;
  let position = 0;
  try { position = fs.statSync(logPath).size; } catch {}

  const watcher = chokidar.watch(logPath, { usePolling: false, persistent: true, ignoreInitial: true });
  watcher.on('change', () => {
    try {
      const stat = fs.statSync(logPath);
      if (stat.size <= position) { position = stat.size; return; }
      const buf = Buffer.alloc(stat.size - position);
      const fd = fs.openSync(logPath, 'r');
      fs.readSync(fd, buf, 0, buf.length, position);
      fs.closeSync(fd);
      position = stat.size;
      buf.toString('utf8').split('\n').forEach((l) => {
        const parsed = parseLogLine(l);
        if (parsed) onLine(parsed);
      });
    } catch (e) {
      console.error('[logWatcher] error:', e.message);
    }
  });
  watchers.set(serverId, watcher);
}

function stopWatching(serverId) {
  const w = watchers.get(serverId);
  if (w) { w.close(); watchers.delete(serverId); }
}

module.exports = { startWatching, stopWatching, getLastLines };
