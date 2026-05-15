const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try node-pty for real pseudo-terminal (enables ANSI colors from Java)
let pty = null;
try { pty = require('node-pty'); } catch { /* falls back to child_process */ }

const MAX_CHUNKS = 800;
const PTY_COLS = 220;
const PTY_ROWS = 50;

class ServerProcessManager {
  constructor() {
    this._map = new Map(); // serverId → entry
    this._loadPersistedProcesses();
  }

  _loadPersistedProcesses() {
    const persistPath = path.resolve(process.env.TEMP || '.', '.cp_processes.json');
    if (fs.existsSync(persistPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(persistPath, 'utf8'));
        for (const [id, info] of Object.entries(data)) {
          try {
            process.kill(info.pid, 0); 
            const entry = this._entry(id);
            entry.status = 'running';
            entry.dir_path = info.dir_path;
            entry.persistedPid = info.pid;
            this._push(entry, `\r\n\x1b[36m[System: Re-attached to persistent process (PID ${info.pid})]\x1b[0m\r\n`);
          } catch { /* process died */ }
        }
      } catch {}
    }
  }

  _savePersistedProcesses() {
    const persistPath = path.resolve(process.env.TEMP || '.', '.cp_processes.json');
    const data = {};
    for (const [id, entry] of this._map.entries()) {
      const pid = entry.ptyProc?.pid || entry.proc?.pid || entry.persistedPid;
      if (pid && entry.status === 'running') {
        data[id] = { pid, dir_path: entry.dir_path };
      }
    }
    fs.writeFileSync(persistPath, JSON.stringify(data), 'utf8');
  }

  _entry(serverId) {
    if (!this._map.has(serverId)) {
      this._map.set(serverId, {
        proc: null,      // child_process handle (non-pty mode)
        ptyProc: null,   // node-pty handle
        usePty: false,
        buffer: [],      // recent output chunks
        subs: new Map(), // socketId → (type, payload) => void
        status: 'stopped',
        restartDir: null,
        dir_path: null,
        persistedPid: null,
      });
    }
    return this._map.get(serverId);
  }

  _emit(entry, type, payload) {
    for (const cb of entry.subs.values()) cb(type, payload);
  }

  _push(entry, text) {
    entry.buffer.push(text);
    if (entry.buffer.length > MAX_CHUNKS) entry.buffer.shift();
    this._emit(entry, 'output', text);
  }

  _findScript(dirPath) {
    const isWin = process.platform === 'win32';
    const order = isWin
      ? ['run.bat', 'start.bat', 'run.sh', 'start.sh']
      : ['run.sh', 'start.sh', 'run.bat', 'start.bat'];
    for (const f of order) {
      if (fs.existsSync(path.join(dirPath, f))) return f;
    }
    if (fs.existsSync(path.join(dirPath, 'server.jar'))) return '__jar__';
    return null;
  }

  _buildCmd(script) {
    if (script === '__jar__') return { cmd: 'java', args: ['-Xmx2G', '-Xms512M', '-jar', 'server.jar', 'nogui'] };
    if (script.endsWith('.bat'))  return { cmd: 'cmd.exe', args: ['/c', script] };
    return { cmd: 'bash', args: [script] };
  }

  // Write a line to the running process stdin / PTY
  _writeLine(entry, line) {
    if (entry.usePty && entry.ptyProc) {
      entry.ptyProc.write(line + '\r');
    } else if (entry.proc) {
      try { entry.proc.stdin.write(line + '\n'); } catch {}
    }
  }

  // Force-kill the process
  _kill(entry) {
    if (entry.usePty && entry.ptyProc) {
      try { entry.ptyProc.kill(); } catch {}
    } else if (entry.proc) {
      const pid = entry.proc.pid;
      if (process.platform === 'win32' && pid) {
        spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true });
      } else {
        try { entry.proc.kill('SIGKILL'); } catch {}
      }
    }
  }

  _onExit(serverId, entry, exitCode) {
    entry.proc    = null;
    entry.ptyProc = null;
    entry.persistedPid = null;
    this._push(entry, `\r\n\x1b[33m[Process exited — code ${exitCode ?? '?'}]\x1b[0m\r\n`);

    if (entry.restartDir) {
      const dir = entry.restartDir;
      entry.restartDir = null;
      setTimeout(() => this.start(serverId, dir), 2000);
      return;
    }
    entry.status = 'stopped';
    this._emit(entry, 'status', 'stopped');
    this._savePersistedProcesses();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start(serverId, dirPath) {
    if (!dirPath)                return { ok: false, error: 'No dir_path set — add it via manage.py' };
    if (!fs.existsSync(dirPath)) return { ok: false, error: `Directory not found: ${dirPath}` };

    const entry = this._entry(serverId);
    if (entry.proc || entry.ptyProc || entry.persistedPid) {
      if (entry.persistedPid) {
        try { process.kill(entry.persistedPid, 0); return { ok: false, error: 'Server is already running (persistent)' }; }
        catch { entry.persistedPid = null; }
      } else {
        return { ok: false, error: 'Server is already running' };
      }
    }

    const script = this._findScript(dirPath);
    if (!script) return { ok: false, error: `No run.bat / start.bat / run.sh / server.jar in ${dirPath}` };

    const { cmd, args } = this._buildCmd(script);
    entry.buffer = [];
    entry.status = 'running';
    entry.dir_path = dirPath;

    if (pty) {
      // ── PTY mode — full color support ──────────────────────────────────────
      let proc;
      try {
        proc = pty.spawn(cmd, args, {
          cwd: dirPath,
          cols: PTY_COLS,
          rows: PTY_ROWS,
          env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', FORCE_COLOR: '3' },
        });
      } catch (e) {
        entry.status = 'stopped';
        return { ok: false, error: e.message };
      }

      entry.ptyProc = proc;
      entry.usePty  = true;
      this._savePersistedProcesses();

      proc.onData((data) => this._push(entry, data));
      proc.onExit(({ exitCode }) => this._onExit(serverId, entry, exitCode));
    } else {
      // ── child_process fallback ──────────────────────────────────────────────
      let proc;
      try {
        proc = spawn(cmd, args, {
          cwd: dirPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '3' },
        });
      } catch (e) {
        entry.status = 'stopped';
        return { ok: false, error: e.message };
      }

      entry.proc   = proc;
      entry.usePty = false;
      this._savePersistedProcesses();

      proc.stdout.on('data', (d) => this._push(entry, d.toString()));
      proc.stderr.on('data', (d) => this._push(entry, d.toString()));
      proc.on('error', (e) => this._push(entry, `\r\n\x1b[31m[Error: ${e.message}]\x1b[0m\r\n`));
      proc.on('close', (code) => this._onExit(serverId, entry, code));
    }

    return { ok: true, script };
  }

  stop(serverId) {
    const entry = this._map.get(serverId);
    if (!entry?.proc && !entry?.ptyProc && !entry?.persistedPid) return { ok: false, error: 'Server is not running' };

    entry.status = 'stopping';
    this._emit(entry, 'status', 'stopping');

    if (entry.persistedPid && !entry.proc && !entry.ptyProc) {
      try { 
        if (process.platform === 'win32') {
          spawn('taskkill', ['/F', '/T', '/PID', String(entry.persistedPid)], { windowsHide: true });
        } else {
          process.kill(entry.persistedPid, 'SIGKILL'); 
        }
      } catch {}
      this._onExit(serverId, entry, 0);
      return { ok: true };
    }

    this._writeLine(entry, 'stop');

    // Force-kill if graceful stop takes too long
    const snapshot = { proc: entry.proc, ptyProc: entry.ptyProc };
    setTimeout(() => {
      if (entry.proc === snapshot.proc && entry.ptyProc === snapshot.ptyProc) {
        this._kill(entry);
      }
    }, 15_000);

    return { ok: true };
  }

  restart(serverId, dirPath) {
    const entry = this._entry(serverId);
    if (!entry.proc && !entry.ptyProc) return this.start(serverId, dirPath);

    entry.restartDir = dirPath;
    entry.status = 'restarting';
    this._emit(entry, 'status', 'restarting');

    this._writeLine(entry, 'stop');

    const snapshot = { proc: entry.proc, ptyProc: entry.ptyProc };
    setTimeout(() => {
      if (entry.proc === snapshot.proc && entry.ptyProc === snapshot.ptyProc) {
        this._kill(entry);
      }
    }, 15_000);

    return { ok: true };
  }

  sendLine(serverId, line) {
    const entry = this._map.get(serverId);
    if (!entry?.proc && !entry?.ptyProc) return { ok: false, error: 'Server is not running' };
    this._writeLine(entry, line);
    return { ok: true };
  }

  subscribe(serverId, socketId, callback) {
    const entry = this._entry(serverId);
    entry.subs.set(socketId, callback);
    return { backfill: entry.buffer.join(''), status: entry.status };
  }

  unsubscribe(serverId, socketId) {
    this._map.get(serverId)?.subs.delete(socketId);
  }

  getStatus(serverId) {
    return this._map.get(serverId)?.status ?? 'stopped';
  }
}

module.exports = new ServerProcessManager();
