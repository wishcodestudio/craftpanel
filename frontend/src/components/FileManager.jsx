import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import api from '../lib/api';

export default function FileManager({ serverId }) {
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [editedContent, setEditedContent] = useState({});
  const [saveModal, setSaveModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [createModal, setCreateModal] = useState(null); // { type: 'file' | 'folder' }
  const [newName, setNewName] = useState('');

  const refreshFiles = () => {
    setLoading(true);
    api.get('/files', { params: { serverId, path } })
      .then((r) => setFiles(r.data.data.files))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!serverId) return;
    refreshFiles();
  }, [path, serverId]);

  useEffect(() => {
    setPath('/');
    setOpenFiles([]);
    setActiveTab(null);
    setEditedContent({});
    setSelected(null);
  }, [serverId]);

  const openFile = async (file) => {
    const filePath = (path === '/' ? '' : path) + '/' + file.name;
    if (file.type === 'dir') { setPath(filePath); setSelected(null); return; }
    setSelected(filePath);
    if (openFiles.find((f) => f.path === filePath)) { setActiveTab(filePath); return; }
    try {
      const r = await api.get('/files/content', { params: { serverId, path: filePath } });
      setOpenFiles((prev) => [...prev, { ...file, path: filePath, content: r.data.data.content }]);
      setActiveTab(filePath);
    } catch { /* file may not be readable */ }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const fullPath = (path === '/' ? '' : path) + '/' + newName.trim();
    try {
      if (createModal.type === 'folder') {
        await api.post('/files/folder', { serverId, path: fullPath });
      } else {
        await api.put('/files/content', { serverId, path: fullPath, content: '' });
      }
      setCreateModal(null);
      setNewName('');
      refreshFiles();
      if (createModal.type === 'file') {
        openFile({ name: newName.trim(), type: 'file' });
      }
    } catch (e) {
      alert('Creation failed: ' + (e.response?.data?.error?.message || e.message));
    }
  };

  const confirmDelete = async () => {
    const filePath = deleteModal;
    try {
      await api.delete('/files', { params: { serverId, path: filePath } });
      setDeleteModal(null);
      refreshFiles();
      // If deleted file was open, close it
      setOpenFiles((prev) => prev.filter((f) => f.path !== filePath));
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.error?.message || e.message));
    }
  };

  const confirmRestore = async (filePath) => {
    if (!window.confirm(`Restore ${filePath} from backup? This will overwrite the current file.`)) return;
    try {
      await api.post('/files/restore', { serverId, path: filePath });
      // Reload content if it's open
      if (openFiles.find((f) => f.path === filePath)) {
        const r = await api.get('/files/content', { params: { serverId, path: filePath } });
        setOpenFiles((prev) => prev.map((f) => f.path === filePath ? { ...f, content: r.data.data.content } : f));
        setEditedContent((prev) => { const n = { ...prev }; delete n[filePath]; return n; });
      }
      alert('File restored successfully');
    } catch (e) {
      alert('Restore failed: ' + (e.response?.data?.error?.message || e.message));
    }
  };

  const confirmSave = async () => {
    const filePath = saveModal;
    const content = editedContent[filePath] ?? openFiles.find((f) => f.path === filePath)?.content ?? '';
    try {
      await api.put('/files/content', { serverId, path: filePath, content });
      setOpenFiles((prev) => prev.map((f) => f.path === filePath ? { ...f, content } : f));
      setEditedContent((prev) => { const n = { ...prev }; delete n[filePath]; return n; });
      setSaveModal(null);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.error?.message || e.message));
    }
  };

  const discardChanges = () => {
    if (!activeTab) return;
    setEditedContent((prev) => { const n = { ...prev }; delete n[activeTab]; return n; });
  };

  const closeTab = (filePath, e) => {
    e.stopPropagation();
    setOpenFiles((prev) => prev.filter((f) => f.path !== filePath));
    setEditedContent((prev) => { const n = { ...prev }; delete n[filePath]; return n; });
    if (activeTab === filePath) {
      const remaining = openFiles.filter((f) => f.path !== filePath);
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  const activeFile = openFiles.find((f) => f.path === activeTab);
  const content = activeTab ? (editedContent[activeTab] ?? activeFile?.content ?? '') : '';
  const isModified = (fp) => editedContent[fp] !== undefined;

  const getLanguage = (name = '') => {
    const ext = name.split('.').pop();
    return { yml: 'yaml', yaml: 'yaml', json: 'json', js: 'javascript', properties: 'ini', sh: 'shell', toml: 'ini' }[ext] || 'plaintext';
  };

  const pathParts = path.split('/').filter(Boolean);

  return (
    <div className="fm-wrap">
      {saveModal && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">Save File</div>
            <div className="modal-body">Save changes to:</div>
            <div className="modal-code">{saveModal}</div>
            <div className="modal-body">This will overwrite the file on the server. A <code>.bak</code> backup will be created.</div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setSaveModal(null)}>Cancel</button>
              <button className="modal-confirm" onClick={confirmSave}>Save File</button>
            </div>
          </div>
        </div>
      )}

      {createModal && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">Create New {createModal.type === 'file' ? 'File' : 'Folder'}</div>
            <div className="modal-body">Enter name for the new {createModal.type}:</div>
            <input 
              className="login-input" 
              autoFocus 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              placeholder={createModal.type === 'file' ? 'example.properties' : 'plugins'}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => { setCreateModal(null); setNewName(''); }}>Cancel</button>
              <button className="modal-confirm" onClick={handleCreate}>Create {createModal.type === 'file' ? 'File' : 'Folder'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title" style={{ color: 'var(--red)' }}>Delete File / Folder</div>
            <div className="modal-body">Are you sure you want to delete:</div>
            <div className="modal-code" style={{ color: 'var(--red)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>{deleteModal}</div>
            <div className="modal-body">This action cannot be undone, though a <code>.bak</code> is kept for individual files.</div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="modal-confirm" style={{ background: 'var(--red)' }} onClick={confirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      <div className="fm-tree">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="panel-title" style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Explorer</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="send-ai-btn" style={{ padding: '2px 6px' }} onClick={() => setCreateModal({ type: 'file' })} title="New File">+</button>
            <button className="send-ai-btn" style={{ padding: '2px 6px' }} onClick={() => setCreateModal({ type: 'folder' })} title="New Folder">📁+</button>
            <button className="send-ai-btn" style={{ padding: '2px 6px' }} onClick={refreshFiles} title="Refresh">↻</button>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 16, color: 'var(--text3)', fontSize: 12 }}>Loading…</div>
        ) : files.map((f) => {
          const fp = (path === '/' ? '' : path) + '/' + f.name;
          return (
            <div
              key={f.name}
              className={`fm-item ${selected === fp ? 'selected' : ''}`}
              onClick={() => openFile(f)}
              onMouseEnter={() => setSelected(fp)}
            >
              <span className="fm-icon">{f.type === 'dir' ? '📁' : '📄'}</span>
              <span className="fm-name">{f.name}</span>
              {selected === fp && (
                <button 
                  className="btn-icon" 
                  style={{ color: 'var(--red)', opacity: 0.6, fontSize: 12 }} 
                  onClick={(e) => { e.stopPropagation(); setDeleteModal(fp); }}
                  title="Delete"
                >
                  🗑
                </button>
              )}
              {f.size && <span className="fm-size">{f.size}</span>}
            </div>
          );
        })}
      </div>

      <div className="fm-main">
        <div className="fm-path">
          <span className="fm-path-seg" onClick={() => setPath('/')}>~</span>
          {pathParts.map((seg, i) => (
            <span key={i}>
              <span style={{ color: 'var(--text3)', margin: '0 3px' }}>/</span>
              <span className="fm-path-seg" onClick={() => setPath('/' + pathParts.slice(0, i + 1).join('/'))}>{seg}</span>
            </span>
          ))}
        </div>

        {openFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-text">Select a file from the explorer to start editing</div>
          </div>
        ) : (
          <div className="editor-wrap">
            <div className="editor-tabs">
              {openFiles.map((f) => (
                <div
                  key={f.path}
                  className={`editor-tab ${activeTab === f.path ? 'active' : ''}`}
                  onClick={() => setActiveTab(f.path)}
                >
                  {f.name}
                  {isModified(f.path) && <span className="dot-mod" />}
                  <span
                    onClick={(e) => closeTab(f.path, e)}
                    style={{ marginLeft: 6, opacity: 0.5, fontSize: 10 }}
                  >✕</span>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Editor
                height="100%"
                language={getLanguage(activeFile?.name)}
                value={content}
                onChange={(val) => setEditedContent((prev) => ({ ...prev, [activeTab]: val }))}
                theme="vs-dark"
                options={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                }}
              />
            </div>

            <div className="editor-footer">
              <div className="editor-footer-left">
                {activeFile?.path} · {content.split('\n').length} lines
                {isModified(activeTab) && <span style={{ color: 'var(--amber)', marginLeft: 10 }}>● Unsaved changes</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="discard-btn"
                  style={{ border: '1px solid var(--amber)', color: 'var(--amber)' }}
                  onClick={() => confirmRestore(activeTab)}
                >
                  Restore .bak
                </button>
                {isModified(activeTab) && (
                  <button className="discard-btn" onClick={discardChanges}>Discard</button>
                )}
                <button className="save-btn" onClick={() => setSaveModal(activeTab)}>Save File</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
