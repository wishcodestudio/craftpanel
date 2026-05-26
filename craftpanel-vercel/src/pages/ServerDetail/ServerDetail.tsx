import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetServerQuery,
  useGetFilesQuery,
  useGetActivityQuery,
  useGetPlayersQuery,
  useGetBackupsQuery,
  useGetServerStatsQuery,
  useStartServerMutation,
  useStopServerMutation,
  useRestartServerMutation,
  useKickPlayerMutation,
  useCreateFileMutation,
  useDeleteFileMutation,
  useCreateBackupMutation,
  useDeleteBackupMutation,
} from '../../store/api/craftpanelApi';
import { useAppDispatch } from '../../store/hooks';
import { showNotification } from '../../store/slices/uiSlice';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Console from '../../components/Console/Console';
import FileEditor from '../../components/FileEditor/FileEditor';
import styles from './ServerDetail.module.css';

type Tab = 'overview' | 'console' | 'files' | 'players' | 'backups' | 'activity';

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('overview');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const [confirmDeleteBackup, setConfirmDeleteBackup] = useState<string | null>(null);

  const sid = id ?? '';
  const { data: server, isLoading: srvLoading, isError: srvError } = useGetServerQuery(sid);
  const { data: files = [], isLoading: filesLoading } = useGetFilesQuery(sid);
  const { data: activity = [], isLoading: actLoading } = useGetActivityQuery(sid);
  const { data: players = [], isLoading: playersLoading } = useGetPlayersQuery(sid);
  const { data: backups = [], isLoading: backupsLoading } = useGetBackupsQuery(sid);
  const { data: stats } = useGetServerStatsQuery(sid, { pollingInterval: 5000, skip: server?.status !== 'online' });

  const [startServer, { isLoading: starting }] = useStartServerMutation();
  const [stopServer,  { isLoading: stopping }]  = useStopServerMutation();
  const [restartServer, { isLoading: restarting }] = useRestartServerMutation();
  const [kickPlayer, { isLoading: kicking }] = useKickPlayerMutation();
  const [createFile, { isLoading: creatingFile }] = useCreateFileMutation();
  const [deleteFile] = useDeleteFileMutation();
  const [createBackup, { isLoading: backingUp }] = useCreateBackupMutation();
  const [deleteBackup] = useDeleteBackupMutation();

  const controlBusy = starting || stopping || restarting;

  const doStart = async () => {
    try {
      await startServer(sid).unwrap();
      dispatch(showNotification({ message: `${server?.name} started`, type: 'success' }));
    } catch { dispatch(showNotification({ message: 'Start failed', type: 'error' })); }
  };
  const doStop = async () => {
    try {
      await stopServer(sid).unwrap();
      dispatch(showNotification({ message: `${server?.name} stopped`, type: 'info' }));
    } catch { dispatch(showNotification({ message: 'Stop failed', type: 'error' })); }
  };
  const doRestart = async () => {
    try {
      await restartServer(sid).unwrap();
      dispatch(showNotification({ message: `${server?.name} restarted`, type: 'success' }));
    } catch { dispatch(showNotification({ message: 'Restart failed', type: 'error' })); }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await createFile({ serverId: sid, name: newFileName.trim(), content: newFileContent }).unwrap();
      dispatch(showNotification({ message: 'File created', type: 'success' }));
      setNewFileName(''); setNewFileContent(''); setShowNewFile(false);
    } catch { dispatch(showNotification({ message: 'Create failed', type: 'error' })); }
  };

  const handleDeleteFile = async (path: string) => {
    try {
      await deleteFile({ serverId: sid, path }).unwrap();
      dispatch(showNotification({ message: 'File deleted', type: 'info' }));
      if (editingFile === path) setEditingFile(null);
    } catch { dispatch(showNotification({ message: 'Delete failed', type: 'error' })); }
  };

  const handleKick = async () => {
    if (!confirmKick) return;
    try {
      await kickPlayer({ serverId: sid, username: confirmKick }).unwrap();
      dispatch(showNotification({ message: `Kicked ${confirmKick}`, type: 'info' }));
      setConfirmKick(null);
    } catch { dispatch(showNotification({ message: 'Kick failed', type: 'error' })); }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup(sid).unwrap();
      dispatch(showNotification({ message: 'Backup created', type: 'success' }));
    } catch { dispatch(showNotification({ message: 'Backup failed', type: 'error' })); }
  };

  const handleDeleteBackup = async () => {
    if (!confirmDeleteBackup) return;
    try {
      await deleteBackup({ serverId: sid, backupId: confirmDeleteBackup }).unwrap();
      dispatch(showNotification({ message: 'Backup deleted', type: 'info' }));
      setConfirmDeleteBackup(null);
    } catch { dispatch(showNotification({ message: 'Delete failed', type: 'error' })); }
  };

  if (srvLoading) {
    return <div className={styles.loading}><div className={styles.spinner} /><span>Loading server...</span></div>;
  }
  if (srvError || !server) {
    return <div className={styles.error}><p>Server not found.</p><button onClick={() => navigate('/servers')}>Back</button></div>;
  }

  const isOnline = server.status === 'online';
  const isOffline = server.status === 'offline';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'console',   label: 'Console' },
    { key: 'files',     label: 'Files' },
    { key: 'players',   label: `Players${isOnline ? ` (${players.length})` : ''}` },
    { key: 'backups',   label: 'Backups' },
    { key: 'activity',  label: 'Activity' },
  ];

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/servers')}>← Servers</button>

      {/* Server header */}
      <div className={styles.serverCard}>
        <div className={styles.serverInfo}>
          <h1 className={styles.name}>{server.name}</h1>
          <div className={styles.meta}>
            <span className={styles.mono}>{server.version}</span>
            <span className={styles.mono}>{server.ip}:{server.port}</span>
            <span className={styles.mono}>RAM: {server.ram}</span>
          </div>
        </div>
        <div className={styles.controls}>
          <StatusBadge status={server.status} />
          <div className={styles.btns}>
            <button
              className={styles.startBtn}
              onClick={doStart}
              disabled={controlBusy || !isOffline}
              title="Start server"
            >
              {starting ? '...' : 'Start'}
            </button>
            <button
              className={styles.restartBtn}
              onClick={doRestart}
              disabled={controlBusy || !isOnline}
              title="Restart server"
            >
              {restarting ? '...' : 'Restart'}
            </button>
            <button
              className={styles.stopBtn}
              onClick={doStop}
              disabled={controlBusy || !isOnline}
              title="Stop server"
            >
              {stopping ? '...' : 'Stop'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.activeTab : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className={styles.overviewGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Players</span>
            <span className={styles.statValue}>{server.players}/{server.maxPlayers}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>TPS</span>
            <span className={`${styles.statValue} ${stats && stats.tps < 18 ? styles.warnVal : ''}`}>
              {stats ? stats.tps.toFixed(2) : '-'}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>CPU</span>
            <span className={styles.statValue}>{stats ? `${stats.cpu.toFixed(1)}%` : '-'}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>RAM</span>
            <span className={styles.statValue}>
              {stats ? `${stats.ramUsed.toFixed(1)}/${stats.ramTotal}G` : '-'}
            </span>
          </div>

          {/* RAM bar */}
          {stats && (
            <div className={`${styles.statCard} ${styles.wideCard}`}>
              <span className={styles.statLabel}>Memory Usage</span>
              <div className={styles.bar}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(stats.ramUsed / stats.ramTotal) * 100}%`, background: stats.ramUsed / stats.ramTotal > 0.8 ? 'var(--red)' : 'var(--accent)' }}
                />
              </div>
              <span className={styles.barLabel}>{((stats.ramUsed / stats.ramTotal) * 100).toFixed(0)}% used</span>
            </div>
          )}

          {/* CPU bar */}
          {stats && (
            <div className={`${styles.statCard} ${styles.wideCard}`}>
              <span className={styles.statLabel}>CPU Usage</span>
              <div className={styles.bar}>
                <div
                  className={styles.barFill}
                  style={{ width: `${stats.cpu}%`, background: stats.cpu > 80 ? 'var(--red)' : stats.cpu > 50 ? 'var(--amber)' : 'var(--green)' }}
                />
              </div>
              <span className={styles.barLabel}>{stats.cpu.toFixed(1)}%</span>
            </div>
          )}

          {!isOnline && (
            <div className={`${styles.statCard} ${styles.wideCard} ${styles.offlineCard}`}>
              Server is offline. Use Start button to bring it online.
            </div>
          )}
        </div>
      )}

      {/* ── Console ── */}
      {tab === 'console' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}><span>Live Console — {server.name}</span></div>
          <Console serverId={sid} status={server.status} serverName={server.name} />
        </div>
      )}

      {/* ── Files ── */}
      {tab === 'files' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>File Manager</span>
            <button className={styles.addBtn} onClick={() => setShowNewFile(v => !v)}>
              {showNewFile ? 'Cancel' : '+ New File'}
            </button>
          </div>

          {showNewFile && (
            <div className={styles.newFileForm}>
              <input
                className={styles.mono}
                placeholder="filename.txt"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
              />
              <textarea
                className={styles.mono}
                placeholder="File content..."
                value={newFileContent}
                onChange={e => setNewFileContent(e.target.value)}
                rows={4}
              />
              <button className={styles.saveBtn} onClick={handleCreateFile} disabled={creatingFile}>
                {creatingFile ? 'Creating...' : 'Create File'}
              </button>
            </div>
          )}

          {filesLoading ? <div className={styles.loadingInline}>Loading files...</div> : (
            <table className={styles.fileTable}>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th></th></tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.path} className={styles.fileRow}>
                    <td className={`${styles.mono} ${styles.fileName}`}>
                      {file.type === 'directory' ? '[dir]  ' : ''}{file.name}
                    </td>
                    <td className={styles.fileType}>{file.type}</td>
                    <td className={styles.mono}>{file.size > 0 ? `${file.size}B` : '-'}</td>
                    <td className={styles.mono}>{new Date(file.modified).toLocaleDateString()}</td>
                    <td>
                      {file.type === 'file' && (
                        <div className={styles.fileActions}>
                          <button className={styles.editFileBtn} onClick={() => setEditingFile(file.path === editingFile ? null : file.path)}>
                            {editingFile === file.path ? 'Close' : 'Edit'}
                          </button>
                          <button className={styles.deleteFileBtn} onClick={() => handleDeleteFile(file.path)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!filesLoading && files.length === 0 && <div className={styles.empty}>No files found.</div>}

          {editingFile && <FileEditor path={editingFile} onClose={() => setEditingFile(null)} />}
        </div>
      )}

      {/* ── Players ── */}
      {tab === 'players' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Online Players</span>
            <span className={styles.playerCount}>{players.length}/{server.maxPlayers}</span>
          </div>
          {!isOnline && <div className={styles.offlineNote}>Server is offline — no players</div>}
          {isOnline && (
            playersLoading ? <div className={styles.loadingInline}>Loading players...</div> : (
              <table className={styles.playerTable}>
                <thead>
                  <tr><th>Username</th><th>Gamemode</th><th>Ping</th><th>IP</th><th>Joined</th><th></th></tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.username} className={styles.playerRow}>
                      <td className={styles.playerName}>{p.username}</td>
                      <td><span className={styles.gamemode}>{p.gamemode}</span></td>
                      <td className={styles.mono}>{p.ping}ms</td>
                      <td className={styles.mono}>{p.ip}</td>
                      <td className={styles.mono}>{new Date(p.joinedAt).toLocaleTimeString()}</td>
                      <td>
                        <button className={styles.kickBtn} onClick={() => setConfirmKick(p.username)}>
                          Kick
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {isOnline && !playersLoading && players.length === 0 && (
            <div className={styles.empty}>No players online.</div>
          )}
        </div>
      )}

      {/* ── Backups ── */}
      {tab === 'backups' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Backups</span>
            <button className={styles.addBtn} onClick={handleCreateBackup} disabled={backingUp}>
              {backingUp ? 'Creating backup...' : '+ Create Backup'}
            </button>
          </div>
          {backupsLoading ? <div className={styles.loadingInline}>Loading backups...</div> : (
            <table className={styles.backupTable}>
              <thead>
                <tr><th>Name</th><th>Size</th><th>Status</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} className={styles.backupRow}>
                    <td className={styles.mono}>{b.name}</td>
                    <td className={styles.mono}>{b.size}</td>
                    <td><span className={`${styles.backupStatus} ${styles[b.status]}`}>{b.status}</span></td>
                    <td className={styles.mono}>{new Date(b.createdAt).toLocaleString()}</td>
                    <td>
                      <button className={styles.deleteFileBtn} onClick={() => setConfirmDeleteBackup(b.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!backupsLoading && backups.length === 0 && <div className={styles.empty}>No backups yet.</div>}
        </div>
      )}

      {/* ── Activity ── */}
      {tab === 'activity' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}><span>Activity — {server.name}</span></div>
          {actLoading ? <div className={styles.loadingInline}>Loading...</div> : (
            <div className={styles.actList}>
              {activity.map(e => (
                <div key={e.id} className={styles.actRow}>
                  <span className={`${styles.actAction} ${styles.mono}`}>{e.action}</span>
                  <span className={styles.actDetail}>{e.detail}</span>
                  <span className={styles.actMeta}>{e.username} · {new Date(e.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {activity.length === 0 && <div className={styles.empty}>No activity yet.</div>}
            </div>
          )}
        </div>
      )}

      {/* Kick confirm */}
      {confirmKick && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <h3>Kick Player</h3>
            <p>Kick <strong>{confirmKick}</strong> from the server?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmKick(null)}>Cancel</button>
              <button className={styles.confirmActionBtn} onClick={handleKick} disabled={kicking}>
                {kicking ? '...' : 'Kick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete backup confirm */}
      {confirmDeleteBackup && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <h3>Delete Backup</h3>
            <p>Delete this backup? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDeleteBackup(null)}>Cancel</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDeleteBackup}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
