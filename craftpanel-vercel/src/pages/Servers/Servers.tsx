import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetServersQuery,
  useCreateServerMutation,
  useUpdateServerMutation,
  useDeleteServerMutation,
} from '../../store/api/craftpanelApi';
import { useAppDispatch } from '../../store/hooks';
import { showNotification } from '../../store/slices/uiSlice';
import type { Server, CreateServerPayload } from '../../types';
import ServerModal from '../../components/ServerModal/ServerModal';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './Servers.module.css';

export default function Servers() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: servers = [], isLoading, isError } = useGetServersQuery();
  const [createServer, { isLoading: creating }] = useCreateServerMutation();
  const [updateServer, { isLoading: updating }] = useUpdateServerMutation();
  const [deleteServer] = useDeleteServerMutation();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Server | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Server | null>(null);

  const handleCreate = async (payload: CreateServerPayload) => {
    try {
      await createServer(payload).unwrap();
      dispatch(showNotification({ message: 'Server created', type: 'success' }));
      setShowModal(false);
    } catch {
      dispatch(showNotification({ message: 'Failed to create server', type: 'error' }));
    }
  };

  const handleUpdate = async (payload: CreateServerPayload) => {
    if (!editTarget) return;
    try {
      await updateServer({ id: editTarget.id, ...payload }).unwrap();
      dispatch(showNotification({ message: 'Server updated', type: 'success' }));
      setEditTarget(undefined);
    } catch {
      dispatch(showNotification({ message: 'Failed to update server', type: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteServer(confirmDelete.id).unwrap();
      dispatch(showNotification({ message: `Deleted ${confirmDelete.name}`, type: 'info' }));
      setConfirmDelete(null);
    } catch {
      dispatch(showNotification({ message: 'Failed to delete server', type: 'error' }));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading servers...</span>
      </div>
    );
  }

  if (isError) {
    return <div className={styles.error}>Failed to load servers.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.heading}>Servers</h1>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ Add Server</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Players</th>
              <th>RAM</th>
              <th>IP:Port</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map(server => (
              <tr key={server.id} className={styles.row}>
                <td>
                  <button className={styles.nameLink} onClick={() => navigate(`/servers/${server.id}`)}>
                    {server.name}
                  </button>
                </td>
                <td className={styles.mono}>{server.version}</td>
                <td><StatusBadge status={server.status} /></td>
                <td className={styles.mono}>
                  {server.status === 'online' ? `${server.players}/${server.maxPlayers}` : '-'}
                </td>
                <td className={styles.mono}>{server.ram}</td>
                <td className={styles.mono}>{server.ip}:{server.port}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => setEditTarget(server)}
                    >Edit</button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDelete(server)}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {servers.length === 0 && (
          <div className={styles.empty}>No servers yet. Add one to get started.</div>
        )}
      </div>

      {(showModal || editTarget) && (
        <ServerModal
          server={editTarget}
          onSubmit={editTarget ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
          loading={creating || updating}
        />
      )}

      {confirmDelete && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <h3>Delete Server</h3>
            <p>Delete <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.confirmDeleteBtn} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
