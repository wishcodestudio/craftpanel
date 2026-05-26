import { useState } from 'react';
import { useGetActivityQuery, useGetServersQuery } from '../../store/api/craftpanelApi';
import styles from './Activity.module.css';

const ACTION_COLORS: Record<string, string> = {
  SERVER_START: 'green',
  SERVER_STOP: 'amber',
  FILE_EDIT: 'blue',
  FILE_DELETE: 'red',
  RCON_COMMAND: 'purple',
};

export default function Activity() {
  const [filterServer, setFilterServer] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const { data: activity = [], isLoading, isError } = useGetActivityQuery();
  const { data: servers = [] } = useGetServersQuery();

  const filtered = activity.filter(entry => {
    if (filterServer && entry.serverId !== filterServer) return false;
    if (filterAction && !entry.action.includes(filterAction.toUpperCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading activity...</span>
      </div>
    );
  }

  if (isError) {
    return <div className={styles.error}>Failed to load activity log.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.heading}>Activity Log</h1>
        <div className={styles.filters}>
          <select value={filterServer} onChange={e => setFilterServer(e.target.value)} className={styles.filterSelect}>
            <option value="">All Servers</option>
            {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            placeholder="Filter by action..."
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className={styles.filterInput}
          />
        </div>
      </div>

      <div className={styles.panel}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No activity found.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Server</th>
                <th>User</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className={styles.row}>
                  <td className={styles.mono}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`${styles.actionBadge} ${styles[ACTION_COLORS[entry.action] ?? 'default']}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td>{entry.serverName}</td>
                  <td className={styles.mono}>{entry.username}</td>
                  <td className={styles.detail}>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.count}>
        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        {(filterServer || filterAction) && ` (filtered from ${activity.length})`}
      </div>
    </div>
  );
}
