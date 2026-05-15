import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const STATUS_META = {
  running:    { cls: 'badge-green',  label: '● RUNNING'    },
  stopped:    { cls: 'badge-red',    label: '● STOPPED'    },
  starting:   { cls: 'badge-amber',  label: '◌ STARTING'   },
  stopping:   { cls: 'badge-amber',  label: '◌ STOPPING'   },
  restarting: { cls: 'badge-amber',  label: '↺ RESTARTING' },
};

function CtrlBtn({ onClick, disabled, rgb, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 12px',
        borderRadius: 6,
        border: `1px solid ${disabled ? 'transparent' : `rgba(${rgb},0.3)`}`,
        background: disabled ? 'transparent' : `rgba(${rgb},0.1)`,
        color: disabled ? 'var(--text3)' : `rgb(${rgb})`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  );
}

export default function Terminal({ serverId, socket, serverName }) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const fitRef       = useRef(null);
  const inputRef     = useRef(null);

  const [status,   setStatus]   = useState('stopped');
  const [cmd,      setCmd]      = useState('');
  const [history,  setHistory]  = useState([]);
  const [histIdx,  setHistIdx]  = useState(-1);

  // ── xterm setup (output-only, no raw stdin capture) ──────────────────────
  useEffect(() => {
    if (!containerRef.current || !socket || !serverId) return;

    const term = new XTerm({
      disableStdin: true,          // input goes through our bar, not xterm
      theme: {
        background: '#0c0e14',
        foreground: '#e8eaf6',
        cursor: '#7c6af7',
        cursorAccent: '#0c0e14',
        selectionBackground: 'rgba(124,106,247,0.3)',
        black: '#0c0e14',   brightBlack: '#5b6490',
        red: '#f87171',     brightRed: '#f87171',
        green: '#4ade80',   brightGreen: '#4ade80',
        yellow: '#fbbf24',  brightYellow: '#fbbf24',
        blue: '#60a5fa',    brightBlue: '#60a5fa',
        magenta: '#a78bfa', brightMagenta: '#a78bfa',
        cyan: '#22d3ee',    brightCyan: '#22d3ee',
        white: '#e8eaf6',   brightWhite: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.55,
      cursorBlink: false,
      allowTransparency: true,
      scrollback: 8000,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current  = fit;

    const onOutput     = ({ data })           => term.write(data);
    const onReady      = ({ status: s })      => { if (s) setStatus(s); };
    const onSrvStatus  = ({ serverId: sid, status: s }) => { if (sid === serverId) setStatus(s); };
    const onError      = ({ message })        => term.writeln(`\r\n\x1b[31m${message}\x1b[0m`);

    socket.on('terminal:output',  onOutput);
    socket.on('terminal:ready',   onReady);
    socket.on('server:status',    onSrvStatus);
    socket.on('terminal:error',   onError);

    socket.emit('terminal:connect', { serverId });

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(containerRef.current);

    // Focus the text input so user can type immediately
    setTimeout(() => inputRef.current?.focus(), 100);

    return () => {
      socket.emit('terminal:disconnect', { serverId });
      socket.off('terminal:output',  onOutput);
      socket.off('terminal:ready',   onReady);
      socket.off('server:status',    onSrvStatus);
      socket.off('terminal:error',   onError);
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [socket, serverId]);

  // ── Send a command ────────────────────────────────────────────────────────
  const sendCmd = useCallback(() => {
    const line = cmd.trim();
    if (!line || !socket) return;

    // Echo the command into the output pane (so it's visible in context)
    termRef.current?.write(`\x1b[32m❯\x1b[0m \x1b[97m${line}\x1b[0m\r\n`);

    socket.emit('terminal:command', { serverId, cmd: line });

    setHistory((prev) => (prev[0] === line ? prev : [line, ...prev.slice(0, 49)]));
    setHistIdx(-1);
    setCmd('');
  }, [cmd, socket, serverId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      sendCmd();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistIdx((prev) => {
        const next = Math.min(prev + 1, history.length - 1);
        if (next >= 0) setCmd(history[next]);
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistIdx((prev) => {
        const next = prev - 1;
        setCmd(next < 0 ? '' : history[next] ?? '');
        return Math.max(next, -1);
      });
    }
  }, [sendCmd, history]);

  const st       = STATUS_META[status] ?? STATUS_META.stopped;
  const isRun    = status === 'running';
  const isStopped = status === 'stopped';
  const inTransit = !isRun && !isStopped;

  return (
    <div
      style={{ background: 'var(--bg0)', border: '1px solid var(--border)', borderRadius: 12,
               overflow: 'hidden', height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Header ── */}
      <div style={{ padding: '9px 14px', background: 'var(--bg1)', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace' }}>
          {serverName || 'Server'} — Console
        </span>

        <span className={`badge ${st.cls}`} style={{ marginLeft: 'auto' }}>{st.label}</span>

        <CtrlBtn onClick={() => { setStatus('starting'); socket?.emit('server:start', { serverId }); }}
                 disabled={isRun || inTransit} rgb="74,222,128">▶ Start</CtrlBtn>
        <CtrlBtn onClick={() => { setStatus('restarting'); socket?.emit('server:restart', { serverId }); }}
                 disabled={!isRun} rgb="251,191,36">↺ Restart</CtrlBtn>
        <CtrlBtn onClick={() => { setStatus('stopping'); socket?.emit('server:stop', { serverId }); }}
                 disabled={!isRun} rgb="248,113,113">■ Stop</CtrlBtn>
      </div>

      {/* ── xterm output pane ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, padding: '6px 4px 2px', overflow: 'hidden', minHeight: 0 }}
      />

      {/* ── Command input bar ── */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg1)',
                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Prompt glyph */}
        <span style={{ color: isRun ? 'var(--accent)' : 'var(--text3)',
                        fontFamily: 'JetBrains Mono,monospace', fontSize: 14,
                        fontWeight: 700, userSelect: 'none', transition: 'color .2s' }}>
          ❯
        </span>

        <input
          ref={inputRef}
          value={cmd}
          onChange={(e) => { setCmd(e.target.value); setHistIdx(-1); }}
          onKeyDown={handleKeyDown}
          disabled={!isRun}
          placeholder={
            isRun    ? 'Type a command and press Enter  (↑↓ for history)' :
            inTransit ? 'Waiting for server…' :
                        'Server stopped — click ▶ Start'
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: isRun ? 'var(--text1)' : 'var(--text3)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            caretColor: 'var(--accent)',
          }}
        />

        {/* History hint */}
        {history.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace',
                          whiteSpace: 'nowrap', userSelect: 'none' }}>
            {histIdx >= 0 ? `${histIdx + 1}/${history.length}` : `${history.length} cmds`}
          </span>
        )}

        <button
          onClick={sendCmd}
          disabled={!isRun || !cmd.trim()}
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: isRun && cmd.trim() ? 'rgba(124,106,247,0.4)' : 'transparent',
            background:   isRun && cmd.trim() ? 'rgba(124,106,247,0.12)' : 'transparent',
            color:        isRun && cmd.trim() ? 'var(--accent)' : 'var(--text3)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            cursor: isRun && cmd.trim() ? 'pointer' : 'not-allowed',
            transition: 'all .15s',
            whiteSpace: 'nowrap',
          }}
        >
          Send ↵
        </button>
      </div>
    </div>
  );
}
