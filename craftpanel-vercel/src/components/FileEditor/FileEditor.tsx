import { useState, useEffect } from 'react';
import { useGetFileContentQuery, useWriteFileContentMutation } from '../../store/api/craftpanelApi';
import { useAppDispatch } from '../../store/hooks';
import { showNotification } from '../../store/slices/uiSlice';
import styles from './FileEditor.module.css';

interface Props { path: string; onClose: () => void; }

export default function FileEditor({ path, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError } = useGetFileContentQuery(path);
  const [writeFile, { isLoading: saving }] = useWriteFileContentMutation();
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) { setContent(data.content); setDirty(false); }
  }, [data]);

  const handleSave = async () => {
    try {
      await writeFile({ path, content }).unwrap();
      setDirty(false);
      dispatch(showNotification({ message: `Saved ${path}`, type: 'success' }));
    } catch {
      dispatch(showNotification({ message: 'Save failed', type: 'error' }));
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.filename}>{path}</span>
        <div className={styles.actions}>
          {dirty && <span className={styles.unsaved}>unsaved changes</span>}
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      {isLoading && <div className={styles.loading}>Loading file...</div>}
      {isError && <div className={styles.error}>Failed to load file content.</div>}
      {!isLoading && !isError && (
        <textarea
          className={styles.textarea}
          value={content}
          onChange={e => { setContent(e.target.value); setDirty(true); }}
          spellCheck={false}
        />
      )}
    </div>
  );
}
