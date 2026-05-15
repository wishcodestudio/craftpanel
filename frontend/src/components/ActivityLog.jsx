import { useEffect, useState } from 'react';
import api from '../lib/api';

const ACTION_ICON = {
  logged_in: '🔑',
  edited_file: '📝',
  ran_command: '⌨️',
  ran_dangerous_command: '⚠️',
  ai_analyzed: '🤖',
  ai_applied_fix: '✅',
};

export default function ActivityLog({ serverId, onViewAI }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/activity', { params: { serverId, limit: 100 } })
      .then((r) => setActivity(r.data.data))
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, [serverId]);

  function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }

  function renderDetail(a) {
    if (a.action === 'ai_analyzed') {
      try {
        const data = JSON.parse(a.detail);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Analyzed: {data.errorText?.substring(0, 50)}...
            </span>
            <button
              className="send-ai-btn"
              onClick={() => onViewAI(data)}
            >
              View Suggestions
            </button>
          </div>
        );
      } catch (e) {
        return <div className="activity-meta">{a.detail}</div>;
      }
    }
    return <div className="activity-meta">{a.detail}</div>;
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header"><span className="panel-title">All Activity</span></div>
        <div style={{ padding: 20, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">All Activity</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{activity.length} events</span>
      </div>
      {activity.length === 0 ? (
        <div className="empty-state" style={{ height: 300 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-text">No activity recorded yet</div>
        </div>
      ) : activity.map((a) => (
        <div className="activity-item" key={a.id}>
          <div style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
            {ACTION_ICON[a.action] || '●'}
          </div>
          <div style={{ flex: 1 }}>
            <div className="activity-action">{a.action.replace(/_/g, ' ')}</div>
            <div className="activity-meta">
              {a.user_name || a.username || 'System'}
              {a.server_name ? ` · ${a.server_name}` : ''}
            </div>
            {renderDetail(a)}
          </div>
          <div className="activity-time">{formatTime(a.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
