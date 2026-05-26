import { useState, useEffect, useRef, useCallback } from 'react';
import type { ServerStatus } from '../../types';
import { useRunCommandMutation } from '../../store/api/craftpanelApi';
import styles from './Console.module.css';

interface LogLine { id: string; ts: string; level: 'INFO' | 'WARN' | 'ERROR'; msg: string; }

const STARTUP = [
  { level: 'INFO' as const, msg: 'Starting CraftPanel server process...' },
  { level: 'INFO' as const, msg: 'Loading libraries, please wait...' },
  { level: 'INFO' as const, msg: 'Detected Java 17.0.9, JAVA_HOME: /usr/lib/jvm/java-17' },
  { level: 'INFO' as const, msg: 'Default game type: SURVIVAL' },
  { level: 'INFO' as const, msg: 'Generating keypair' },
  { level: 'INFO' as const, msg: 'Starting Minecraft server version 1.21.1' },
  { level: 'INFO' as const, msg: 'Preparing spawn area for dimension minecraft:overworld' },
  { level: 'INFO' as const, msg: 'Preparing start region for dimension minecraft:overworld' },
  { level: 'INFO' as const, msg: 'Preparing spawn area: 16%' },
  { level: 'INFO' as const, msg: 'Preparing spawn area: 55%' },
  { level: 'INFO' as const, msg: 'Preparing spawn area: 100%' },
  { level: 'INFO' as const, msg: 'Time elapsed: 3872 ms' },
  { level: 'INFO' as const, msg: 'Done (3.872s)! For help, type "help"' },
];

const RUNNING: { level: 'INFO' | 'WARN' | 'ERROR'; msg: string }[] = [
  { level: 'INFO', msg: 'Saving the game (this may take a moment!)' },
  { level: 'INFO', msg: 'Saved the game' },
  { level: 'INFO', msg: 'Steve joined the game' },
  { level: 'INFO', msg: 'Alex[/10.0.0.6:52341] logged in with entity id 14 at (128.5, 64.0, -200.3)' },
  { level: 'INFO', msg: 'Steve lost connection: Disconnected' },
  { level: 'WARN', msg: "Can't keep up! Is the server overloaded? Running 2003ms or 40 ticks behind" },
  { level: 'INFO', msg: 'UUID of player Steve is 069a79f4-44e9-4726-a5be-fca90e38aaf5' },
  { level: 'INFO', msg: 'Running auto-save...' },
  { level: 'INFO', msg: '[PLAYER Steve]: Hello server!' },
  { level: 'INFO', msg: 'Chunk GC freed 128 chunks' },
  { level: 'WARN', msg: 'Nether/End is missing/not loaded — skipping dimension saving' },
  { level: 'INFO', msg: 'Autosave: complete' },
];

const SHUTDOWN = [
  { level: 'INFO' as const, msg: 'Stopping the server' },
  { level: 'INFO' as const, msg: 'Stopping server' },
  { level: 'INFO' as const, msg: 'Saving players' },
  { level: 'INFO' as const, msg: 'Saving worlds' },
  { level: 'INFO' as const, msg: 'Saving chunks for level "ServerLevel[world]"/minecraft:overworld' },
  { level: 'INFO' as const, msg: 'ThreadedAnvilChunkStorage (world): All chunks are saved' },
  { level: 'INFO' as const, msg: 'Saving chunks for level "ServerLevel[DIM-1]"/minecraft:the_nether' },
  { level: 'INFO' as const, msg: 'ThreadedAnvilChunkStorage (DIM-1): All chunks are saved' },
  { level: 'INFO' as const, msg: 'Server stopped' },
];

function ts() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}

interface Props { serverId: string; status: ServerStatus; serverName: string; }

export default function Console({ serverId, status, serverName }: Props) {
  const [lines, setLines] = useState<LogLine[]>([
    { id: '0', ts: ts(), level: 'INFO', msg: `Attached to ${serverName} console` },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [prevStatus, setPrevStatus] = useState<ServerStatus>(status);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [runCommand, { isLoading: running }] = useRunCommandMutation();

  const addLines = useCallback((entries: typeof STARTUP) => {
    entries.forEach((e, i) => {
      setTimeout(() => {
        setLines(prev => [...prev, { id: String(Date.now() + i), ts: ts(), level: e.level, msg: e.msg }]);
      }, i * 180);
    });
  }, []);

  // React to server status transitions
  useEffect(() => {
    if (status === prevStatus) return;
    if (status === 'starting') addLines(STARTUP);
    if (status === 'stopping') addLines(SHUTDOWN);
    if (status === 'online' && prevStatus === 'starting') {
      setTimeout(() => setLines(prev => [...prev, { id: String(Date.now()), ts: ts(), level: 'INFO', msg: 'Server is now accepting connections.' }]), STARTUP.length * 180 + 200);
    }
    if (status === 'offline' && prevStatus !== 'offline') {
      setTimeout(() => setLines(prev => [...prev, { id: String(Date.now()), ts: ts(), level: 'INFO', msg: '--- Process exited ---' }]), SHUTDOWN.length * 180 + 200);
    }
    setPrevStatus(status);
  }, [status, prevStatus, addLines]);

  // Periodic log events when online
  useEffect(() => {
    if (status !== 'online') return;
    const interval = setInterval(() => {
      const e = RUNNING[Math.floor(Math.random() * RUNNING.length)];
      setLines(prev => [...prev, { id: String(Date.now()), ts: ts(), level: e.level, msg: e.msg }]);
    }, 4000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [status]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  const sendCommand = async () => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    setLines(prev => [...prev, { id: String(Date.now()), ts: ts(), level: 'INFO', msg: `> ${cmd}` }]);
    try {
      const res = await runCommand({ serverId, command: cmd }).unwrap();
      setLines(prev => [...prev, { id: String(Date.now() + 1), ts: ts(), level: 'INFO', msg: res.output }]);
    } catch {
      setLines(prev => [...prev, { id: String(Date.now() + 1), ts: ts(), level: 'ERROR', msg: 'Command failed — server may be offline' }]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { sendCommand(); return; }
    if (e.key === 'ArrowUp') {
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setInput(history[next] ?? '');
    }
    if (e.key === 'ArrowDown') {
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? '' : history[next]);
    }
  };

  return (
    <div className={styles.console}>
      <div className={styles.log}>
        {lines.map(line => (
          <div key={line.id} className={`${styles.line} ${styles[line.level.toLowerCase()]}`}>
            <span className={styles.ts}>[{line.ts}]</span>
            <span className={styles.level}>[{line.level}]</span>
            <span className={styles.msg}>{line.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <span className={styles.prompt}>{'>'}</span>
        <input
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={status === 'online' ? 'Type command... (Enter to send, ↑↓ history)' : 'Server offline'}
          disabled={status !== 'online' || running}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className={styles.sendBtn}
          onClick={sendCommand}
          disabled={status !== 'online' || running || !input.trim()}
        >
          {running ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
