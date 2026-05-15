const fs = require('fs');
const path = require('path');

function safePath(serverDir, requestedPath) {
  const resolved = path.resolve(serverDir, '.' + requestedPath);
  if (!resolved.startsWith(path.resolve(serverDir))) {
    throw Object.assign(new Error('Path not allowed'), { code: 'FILE_001', status: 403 });
  }
  return resolved;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatAge(mtime) {
  const diff = Date.now() - mtime;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function listDirectory(serverDir, requestedPath) {
  const resolved = safePath(serverDir, requestedPath || '/');
  let entries;
  try {
    entries = fs.readdirSync(resolved, { withFileTypes: true });
  } catch {
    throw Object.assign(new Error('Path not found'), { code: 'FILE_003', status: 404 });
  }
  return entries.map((e) => {
    const stat = (() => { try { return fs.statSync(path.join(resolved, e.name)); } catch { return null; } })();
    return {
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      size: stat && e.isFile() ? formatSize(stat.size) : null,
      modified: stat ? formatAge(stat.mtimeMs) : null,
    };
  }).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function readFile(serverDir, requestedPath) {
  const resolved = safePath(serverDir, requestedPath);
  try {
    return fs.readFileSync(resolved, 'utf8');
  } catch {
    throw Object.assign(new Error('File read failed'), { code: 'FILE_004', status: 500 });
  }
}

function writeFile(serverDir, requestedPath, content) {
  const resolved = safePath(serverDir, requestedPath);
  try {
    fs.copyFileSync(resolved, resolved + '.bak');
  } catch { /* file might not exist yet */ }
  try {
    fs.writeFileSync(resolved, content, 'utf8');
  } catch {
    throw Object.assign(new Error('File write failed'), { code: 'FILE_002', status: 500 });
  }
}

function createNewFolder(serverDir, requestedPath) {
  const resolved = safePath(serverDir, requestedPath);
  if (fs.existsSync(resolved)) throw Object.assign(new Error('Folder already exists'), { status: 400 });
  try {
    fs.mkdirSync(resolved, { recursive: true });
  } catch (e) {
    throw Object.assign(new Error('Folder creation failed: ' + e.message), { status: 500 });
  }
}

function deleteFile(serverDir, requestedPath) {
  const resolved = safePath(serverDir, requestedPath);
  if (!fs.existsSync(resolved)) throw Object.assign(new Error('File not found'), { status: 404 });
  
  try {
    // If it's a file, keep a .bak before deleting
    if (fs.statSync(resolved).isFile()) {
      fs.copyFileSync(resolved, resolved + '.bak');
    }
    fs.rmSync(resolved, { recursive: true });
  } catch (e) {
    throw Object.assign(new Error('Delete failed: ' + e.message), { status: 500 });
  }
}

function restoreBackup(serverDir, requestedPath) {
  const resolved = safePath(serverDir, requestedPath);
  const bak = resolved + '.bak';
  if (!fs.existsSync(bak)) throw Object.assign(new Error('No backup found (.bak)'), { status: 404 });

  try {
    // If original exists, rename it temporarily
    if (fs.existsSync(resolved)) {
      fs.renameSync(resolved, resolved + '.tmp');
    }
    fs.copyFileSync(bak, resolved);
    // Remove the temp if successful
    if (fs.existsSync(resolved + '.tmp')) fs.unlinkSync(resolved + '.tmp');
  } catch (e) {
    throw Object.assign(new Error('Restore failed: ' + e.message), { status: 500 });
  }
}

module.exports = { listDirectory, readFile, writeFile, deleteFile, restoreBackup };
