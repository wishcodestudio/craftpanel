import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

const SEED_LOGS = [
  { id: 1, time: '12:01:03', level: 'INFO', msg: '[Server thread] Starting minecraft server version 1.20.4' },
  { id: 2, time: '12:01:05', level: 'INFO', msg: '[Server thread] Default game type: SURVIVAL' },
  { id: 3, time: '12:01:06', level: 'WARN', msg: '[Server thread] Can\'t keep up! Is the server overloaded?' },
  { id: 4, time: '12:01:07', level: 'ERROR', msg: '[Server thread] java.lang.OutOfMemoryError: Java heap space' },
  { id: 5, time: '12:01:08', level: 'INFO', msg: '[EssentialsX] Enabling EssentialsX v2.20.1' },
  { id: 6, time: '12:01:10', level: 'WARN', msg: '[ProtocolLib] Version (5.1.0) not tested with Paper 1.20.4' },
  { id: 7, time: '12:01:12', level: 'INFO', msg: '[Server thread] Done (4.321s)! For help, type help' },
];

export default function Dashboard({ serverId, socket, stats, onSendToAI }) {
  const [logs, setLogs] = useState(SEED_LOGS);
  const [activity, setActivity] = useState([]);
  const logRef = useRef(null);
  const nextId = useRef(100);

  useEffect(() => {
    if (!serverId) return;
    api.get('/activity', { params: { serverId, limit: 10 } })
      .then((r) => setActivity(r.data.data))
      .catch(() => {});
  }, [serverId]);

  useEffect(() => {
    if (!socket || !serverId) return;
    socket.emit('subscribe:logs', { serverId });

    const onBackfill = ({ lines }) => {
      if (lines?.length) setLogs(lines.map((l, i) => ({ ...l, id: i })));
    };
    const onLine = (line) => {
      setLogs((prev) => [...prev.slice(-499), { ...line, id: nextId.current++ }]);
    };

    socket.on('log:backfill', onBackfill);
    socket.on('log:line', onLine);

    return () => {
      socket.emit('unsubscribe:logs', { serverId });
      socket.off('log:backfill', onBackfill);
      socket.off('log:line', onLine);
    };
  }, [socket, serverId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const sv = stats || {};
  const ramColor = sv.ram > 80 ? 'var(--red)' : sv.ram > 60 ? 'var(--amber)' : 'var(--green)';

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' hr ago';
    return Math.floor(h / 24) + ' day ago';
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-val" style={{
            color: sv.status === 'online' ? 'var(--green)' : sv.status === 'starting' ? 'var(--amber)' : 'var(--red)',
            fontSize: 18, marginTop: 4,
          }}>
            ● {sv.status === 'online' ? 'ONLINE' : sv.status === 'starting' ? 'STARTING…' : 'OFFLINE'}
          </div>
          <div className="stat-sub">{sv.ip || 'unknown'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Players</div>
          <div className="stat-val">
            {sv.players ?? '—'}<span style={{ fontSize: 16, color: 'var(--text3)' }}>/{sv.maxPlayers ?? '—'}</span>
          </div>
          <div className="stat-sub">currently online</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TPS</div>
          <div className="stat-val" style={{ color: sv.tps >= 19 ? 'var(--green)' : 'var(--amber)' }}>
            {sv.tps ?? '—'}
          </div>
          <div className="stat-sub">target: 20.0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RAM Usage</div>
          <div className="stat-val" style={{ color: ramColor }}>
            {sv.ram ?? '—'}{sv.ram !== undefined && <span style={{ fontSize: 16 }}>%</span>}
          </div>
          {sv.ram !== undefined && (
            <div className="ram-bar"><div className="ram-fill" style={{ width: sv.ram + '%', background: ramColor }} /></div>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Live Console</span>
            <span className="badge badge-green">● STREAMING</span>
          </div>
          <div className="log-wrap" ref={logRef}>
            {logs.map((l) => (
              <div className="log-line" key={l.id}>
                <span className="log-time">{l.time}</span>
                <span className={`log-level ${l.level}`}>{l.level}</span>
                <span className={`log-msg ${l.level === 'ERROR' ? 'error' : l.level === 'WARN' ? 'warn' : ''}`}>{l.msg}</span>
                {(l.level === 'ERROR' || l.level === 'WARN') && (
                  <button className="send-ai-btn" onClick={() => onSendToAI(l.msg)}>→ AI</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Activity Log</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>All admins</span>
          </div>
          {activity.length === 0 ? (
            <div className="empty-state" style={{ height: 200 }}>
              <div className="empty-icon">📋</div>
              <div className="empty-text">No recent activity</div>
            </div>
          ) : activity.map((a) => (
            <div className="activity-item" key={a.id}>
              <div className="activity-dot" />
              <div>
                <div className="activity-action">{a.action.replace(/_/g, ' ')}</div>
                <div className="activity-meta">{a.user_name || a.username} {a.detail ? `· ${a.detail}` : ''}</div>
              </div>
              <div className="activity-time">{formatTime(a.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
