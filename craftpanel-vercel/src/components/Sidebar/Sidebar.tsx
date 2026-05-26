import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentUser, selectSidebarOpen, selectServerStats } from '../../store/selectors';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', tag: '[D]' },
  { to: '/servers',   label: 'Servers',   tag: '[S]' },
  { to: '/activity',  label: 'Activity',  tag: '[A]' },
  { to: '/ai',        label: 'AI Assist', tag: '[AI]' },
  { to: '/users',     label: 'Users',     tag: '[U]' },
] as const;

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const open = useAppSelector(selectSidebarOpen);
  const stats = useAppSelector(selectServerStats);

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        {open && <span className={styles.logo}>CraftPanel</span>}
        <button className={styles.toggle} onClick={() => dispatch(toggleSidebar())} aria-label="Toggle sidebar">
          {open ? '«' : '»'}
        </button>
      </div>

      {open && (
        <div className={styles.statsRow}>
          <span className={styles.onlineDot} />
          <span className={styles.statsText}>{stats.online}/{stats.total} online · {stats.totalPlayers} players</span>
        </div>
      )}

      <nav className={styles.nav}>
        {NAV.map(({ to, label, tag }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''} ${to === '/ai' ? styles.aiItem : ''}`}
            title={open ? undefined : label}
          >
            <span className={styles.icon}>{tag}</span>
            {open && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        {open && user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>{user.role}</span>
          </div>
        )}
        <button
          className={styles.logoutBtn}
          onClick={() => { dispatch(logout()); navigate('/login'); }}
          title="Logout"
        >
          {open ? 'Logout' : '[x]'}
        </button>
      </div>
    </aside>
  );
}
