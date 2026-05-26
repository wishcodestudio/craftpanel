import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetServerQuery,
  useGetFilesQuery,
  useGetActivityQuery,
  useCreateFileMutation,
  useDeleteFileMutation,
} from '../../store/api/craftpanelApi';
import { useAppDispatch } from '../../store/hooks';
import { showNotification } from '../../store/slices/uiSlice';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './ServerDetail.module.css';

type Tab = 'files' | 'activity';

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('files');
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const { data: server, isLoading: srvLoading, isError: srvError } = useGetServerQuery(id ?? '');
  const { data: files = [], isLoading: filesLoading } = useGetFilesQuery(id ?? '');
  const { data: activity = [], isLoading: actLoading } = useGetActivityQuery(id ?? '');
  const [createFile, { isLoading: creating }] = useCreateFileMutation();
  const [deleteFile] = useDeleteFileMutation();

  const handleCreateFile = async () => {
    if (!id || !newFileName.trim()) return;
    try {
      await createFile({ serverId: id, name: newFileName.trim(), content: newFileContent }).unwrap();
      dispatch(showNotification({ message: 'File created', type: 'success' }));
      setNewFileName('');
      setNewFileContent('');
      setShowNewFile(false);
    } catch {
      dispatch(showNotification({ message: 'Failed to create file', type: 'error' }));
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!id) return;
    try {
      await deleteFile({ serverId: id, path }).unwrap();
      dispatch(showNotification({ message: 'File deleted', type: 'info' }));
    } catch {
      dispatch(showNotification({ message: 'Failed to delete file', type: 'error' }));
    }
  };

  if (srvLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading server...</span>
      </div>
    );
  }

  if (srvError || !server) {
    return (
      <div className={styles.error}>
        <p>Server not found.</p>
        <button onClick={() => navigate('/servers')}>Back to Servers</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/servers')}>← Servers</button>

      <div className={styles.serverHeader}>
        <div className={styles.serverInfo}>
          <h1 className={styles.name}>{server.name}</h1>
          <div className={styles.meta}>
            <span className={styles.mono}>{server.version}</span>
            <span className={styles.mono}>{server.ip}:{server.port}</span>
            <span className={styles.mono}>RAM: {server.ram}</span>
          </div>
        </div>
        <div className={styles.statusGroup}>
          <StatusBadge status={server.status} />
          {server.status === 'online' && (
            <span className={styles.players}>{server.players}/{server.maxPlayers} players</span>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'files' ? styles.activeTab : ''}`}
          onClick={() => setTab('files')}
        >Files</button>
        <button
          className={`${styles.tab} ${tab === 'activity' ? styles.activeTab : ''}`}
          onClick={() => setTab('activity')}
        >Activity Log</button>
      </div>

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
                placeholder="filename.txt"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                className={styles.mono}
              />
              <textarea
                placeholder="File content..."
                value={newFileContent}
                onChange={e => setNewFileContent(e.target.value)}
                rows={4}
                className={styles.mono}
              />
              <button className={styles.saveBtn} onClick={handleCreateFile} disabled={creating}>
                {creating ? 'Creating...' : 'Create File'}
              </button>
            </div>
          )}

          {filesLoading ? (
            <div className={styles.loadingInline}>Loading files...</div>
          ) : (
            <table className={styles.fileTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.path} className={styles.fileRow}>
                    <td className={`${styles.mono} ${styles.fileName}`}>
                      {file.type === 'directory' ? '[dir] ' : ''}{file.name}
                    </td>
                    <td className={styles.fileType}>{file.type}</td>
                    <td className={styles.mono}>{file.size > 0 ? `${file.size}B` : '-'}</td>
                    <td className={styles.mono}>{new Date(file.modified).toLocaleDateString()}</td>
                    <td>
                      {file.type === 'file' && (
                        <button
                          className={styles.deleteFileBtn}
                          onClick={() => handleDeleteFile(file.path)}
                        >Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!filesLoading && files.length === 0 && (
            <div className={styles.empty}>No files found.</div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Activity Log — {server.name}</span>
          </div>
          {actLoading ? (
            <div className={styles.loadingInline}>Loading activity...</div>
          ) : (
            <div className={styles.actList}>
              {activity.map(entry => (
                <div key={entry.id} className={styles.actRow}>
                  <span className={`${styles.actAction} ${styles.mono}`}>{entry.action}</span>
                  <span className={styles.actDetail}>{entry.detail}</span>
                  <span className={styles.actMeta}>{entry.username} · {new Date(entry.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {activity.length === 0 && <div className={styles.empty}>No activity yet.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
