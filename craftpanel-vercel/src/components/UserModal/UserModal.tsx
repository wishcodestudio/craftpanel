import { useState, useEffect, type FormEvent } from 'react';
import type { AppUser, CreateUserPayload, UserRole } from '../../types';
import { useGetGroupsQuery } from '../../store/api/craftpanelApi';
import styles from './UserModal.module.css';

interface Props {
  user?: AppUser;
  onSubmit: (payload: CreateUserPayload) => void;
  onClose: () => void;
  loading?: boolean;
}

const DEFAULTS: CreateUserPayload = { username: '', name: '', password: '', role: 'operator', groupIds: [] };

export default function UserModal({ user, onSubmit, onClose, loading }: Props) {
  const { data: groups = [] } = useGetGroupsQuery();
  const [form, setForm] = useState<CreateUserPayload>(DEFAULTS);

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, name: user.name, password: '', role: user.role, groupIds: user.groupIds });
    }
  }, [user]);

  const set = <K extends keyof CreateUserPayload>(k: K, v: CreateUserPayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleGroup = (gid: string) =>
    setForm(f => ({
      ...f,
      groupIds: f.groupIds.includes(gid) ? f.groupIds.filter(g => g !== gid) : [...f.groupIds, gid],
    }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{user ? 'Edit User' : 'Add User'}</h2>
          <button className={styles.close} onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <label>Username
              <input value={form.username} onChange={e => set('username', e.target.value)} required placeholder="username" disabled={!!user} />
            </label>
            <label>Display Name
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Full Name" />
            </label>
          </div>

          <label>Password {user && <span className={styles.hint}>(leave blank to keep current)</span>}
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required={!user} placeholder="••••••••" autoComplete="new-password" />
          </label>

          <label>Role
            <select value={form.role} onChange={e => set('role', e.target.value as UserRole)}>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className={styles.groups}>
            <span className={styles.groupLabel}>Server Groups</span>
            <div className={styles.groupList}>
              {groups.map(g => (
                <label key={g.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.groupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : user ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
