import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import { useAppSelector } from '../../store/hooks';
import { selectSidebarOpen } from '../../store/selectors';
import styles from './Layout.module.css';

export default function Layout() {
  const open = useAppSelector(selectSidebarOpen);
  return (
    <div className={`${styles.layout} ${open ? styles.expanded : styles.collapsed}`}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
