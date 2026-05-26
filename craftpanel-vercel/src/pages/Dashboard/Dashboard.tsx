import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectServerStats, selectCurrentUser } from '../../store/selectors';
import { useGetServersQuery, useGetActivityQuery } from '../../store/api/craftpanelApi';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const stats = useAppSelector(selectServerStats);
  const { data: servers = [], isLoading: serversLoading, isError: serversError } = useGetServersQuery();
  const { data: activity = [], isLoading: actLoading } = useGetActivityQuery();

  if (serversLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (serversError) {
    return <div className={styles.error}>Failed to load server data. Check your connection.</div>;
  }

  const recentActivity = activity.slice(0, 5);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.welcome}>Welcome back, {user?.name}</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Servers</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statOnline}`}>
          <span className={styles.statLabel}>Online</span>
          <span className={styles.statValue}>{stats.online}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Offline</span>
          <span className={styles.statValue}>{stats.offline}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statPlayers}`}>
          <span className={styles.statLabel}>Players Online</span>
          <span className={styles.statValue}>{stats.totalPlayers}</span>
        </div>
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Servers</h2>
            <button className={styles.viewAll} onClick={() => navigate('/servers')}>View all</button>
          </div>
          <div className={styles.serverList}>
            {servers.slice(0, 4).map(server => (
              <div
                key={server.id}
                className={styles.serverRow}
                onClick={() => navigate(`/servers/${server.id}`)}
              >
                <div className={styles.serverName}>{server.name}</div>
                <div className={styles.serverMeta}>
                  <span className={styles.mono}>{server.version}</span>
                  {server.status === 'online' && (
                    <span className={styles.players}>{server.players}/{server.maxPlayers}</span>
                  )}
                  <StatusBadge status={server.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Recent Activity</h2>
            <button className={styles.viewAll} onClick={() => navigate('/activity')}>View all</button>
          </div>
          {actLoading ? (
            <div className={styles.loadingInline}>Loading...</div>
          ) : (
            <div className={styles.activityList}>
              {recentActivity.map(entry => (
                <div key={entry.id} className={styles.activityRow}>
                  <div className={styles.actAction}>{entry.action}</div>
                  <div className={styles.actDetail}>{entry.detail}</div>
                  <div className={styles.actMeta}>
                    <span>{entry.serverName}</span>
                    <span>{entry.username}</span>
                    <span className={styles.mono}>
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
