import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearNotification } from '../../store/slices/uiSlice';
import { selectNotification } from '../../store/selectors';
import styles from './Notification.module.css';

export default function Notification() {
  const dispatch = useAppDispatch();
  const note = useAppSelector(selectNotification);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => dispatch(clearNotification()), 3200);
    return () => clearTimeout(t);
  }, [note, dispatch]);

  if (!note) return null;

  return (
    <div className={`${styles.notification} ${styles[note.type]}`}>
      {note.message}
    </div>
  );
}
