import { useState } from 'react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetGroupsQuery,
} from '../../store/api/craftpanelApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showNotification } from '../../store/slices/uiSlice';
import { selectCurrentUser } from '../../store/selectors';
import type { AppUser, CreateUserPayload } from '../../types';
import UserModal from '../../components/UserModal/UserModal';
import styles from './Users.module.css';

export default function Users() {
  const dispatch = useAppDispatch();
  const me = useAppSelector(selectCurrentUser);
  const { data: users = [], isLoading, isError } = useGetUsersQuery();
  const { data: groups = [] } = useGetGroupsQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);

  const groupName = (gid: string) => groups.find(g => g.id === gid)?.name ?? gid;

  const handleCreate = async (payload: CreateUserPayload) => {
    try {
      await createUser(payload).unwrap();
      dispatch(showNotification({ message: 'User created', type: 'success' }));
      setShowModal(false);
    } catch {
      dispatch(showNotification({ message: 'Failed to create user', type: 'error' }));
    }
  };

  const handleUpdate = async (payload: CreateUserPayload) => {
    if (!editTarget) return;
    try {
      await updateUser({ id: editTarget.id, ...payload }).unwrap();
      dispatch(showNotification({ message: 'User updated', type: 'success' }));
      setEditTarget(undefined);
    } catch {
      dispatch(showNotification({ message: 'Failed to update user', type: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteUser(confirmDelete.id).unwrap();
      dispatch(showNotification({ message: `Deleted ${confirmDelete.username}`, type: 'info' }));
      setConfirmDelete(null);
    } catch {
      dispatch(showNotification({ message: 'Failed to delete user', type: 'error' }));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading users...</span>
      </div>
    );
  }

  if (isError) return <div className={styles.error}>Failed to load users.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.heading}>User Management</h1>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ Add User</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Groups</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={styles.row}>
                <td className={styles.mono}>{user.username}</td>
                <td>{user.name}</td>
                <td>
                  <span className={`${styles.roleBadge} ${styles[user.role]}`}>{user.role}</span>
                </td>
                <td>
                  <div className={styles.groups}>
                    {user.groupIds.map(gid => (
                      <span key={gid} className={styles.groupTag}>{groupName(gid)}</span>
                    ))}
                    {user.groupIds.length === 0 && <span className={styles.noGroup}>none</span>}
                  </div>
                </td>
                <td className={styles.mono}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => setEditTarget(user)}>Edit</button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDelete(user)}
                      disabled={user.id === me?.id}
                      title={user.id === me?.id ? 'Cannot delete yourself' : undefined}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className={styles.empty}>No users found.</div>}
      </div>

      {(showModal || editTarget) && (
        <UserModal
          user={editTarget}
          onSubmit={editTarget ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
          loading={creating || updating}
        />
      )}

      {confirmDelete && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <h3>Delete User</h3>
            <p>Delete <strong>{confirmDelete.username}</strong>? This action cannot be undone.</p>
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
