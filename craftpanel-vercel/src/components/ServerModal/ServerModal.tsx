import { useState, useEffect, type FormEvent } from 'react';
import type { Server, CreateServerPayload } from '../../types';
import { useGetGroupsQuery } from '../../store/api/craftpanelApi';
import styles from './ServerModal.module.css';

interface Props {
  server?: Server;
  onSubmit: (payload: CreateServerPayload) => void;
  onClose: () => void;
  loading?: boolean;
}

const DEFAULTS: CreateServerPayload = {
  name: '', version: '1.21.1', ip: '', port: 25565,
  rconPort: 25575, maxPlayers: 20, ram: '2G', groupId: 'g1',
};

export default function ServerModal({ server, onSubmit, onClose, loading }: Props) {
  const { data: groups = [] } = useGetGroupsQuery();
  const [form, setForm] = useState<CreateServerPayload>(DEFAULTS);

  useEffect(() => {
    if (server) {
      const { id: _id, status: _s, players: _p, createdAt: _c, ...rest } = server;
      setForm(rest);
    }
  }, [server]);

  const set = (k: keyof CreateServerPayload, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{server ? 'Edit Server' : 'Add Server'}</h2>
          <button className={styles.close} onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <label>Name
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="My Server" />
            </label>
            <label>Version
              <input value={form.version} onChange={e => set('version', e.target.value)} required placeholder="1.21.1" />
            </label>
          </div>

          <div className={styles.row}>
            <label>IP / Host
              <input value={form.ip} onChange={e => set('ip', e.target.value)} required placeholder="192.168.1.10" />
            </label>
            <label>Port
              <input type="number" value={form.port} onChange={e => set('port', Number(e.target.value))} required />
            </label>
          </div>

          <div className={styles.row}>
            <label>RCON Port
              <input type="number" value={form.rconPort} onChange={e => set('rconPort', Number(e.target.value))} required />
            </label>
            <label>Max Players
              <input type="number" value={form.maxPlayers} onChange={e => set('maxPlayers', Number(e.target.value))} required min={1} />
            </label>
          </div>

          <div className={styles.row}>
            <label>RAM
              <input value={form.ram} onChange={e => set('ram', e.target.value)} placeholder="2G" required />
            </label>
            <label>Group
              <select value={form.groupId} onChange={e => set('groupId', e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : server ? 'Save Changes' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
