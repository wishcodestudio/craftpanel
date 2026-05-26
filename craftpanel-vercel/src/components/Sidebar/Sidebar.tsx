import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentUser, selectSidebarOpen } from '../../store/selectors';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '[D]' },
  { to: '/servers',   label: 'Servers',   icon: '[S]' },
  { to: '/activity',  label: 'Activity',  icon: '[A]' },
] as const;

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const open = useAppSelector(selectSidebarOpen);

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        {open && <span className={styles.logo}>CraftPanel</span>}
        <button className={styles.toggle} onClick={() => dispatch(toggleSidebar())} aria-label="Toggle sidebar">
          {open ? '«' : '»'}
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            title={open ? undefined : label}
          >
            <span className={styles.icon}>{icon}</span>
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
