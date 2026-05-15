import { useState, useEffect, useCallback } from 'react';
import api from './lib/api';
import { getSocket, disconnectSocket } from './lib/socket';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileManager from './components/FileManager';
import Terminal from './components/Terminal';
import AIDiagnostics from './components/AIDiagnostics';
import ActivityLog from './components/ActivityLog';

const NAV = [
  { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
  { id: 'files', icon: '📁', label: 'File Manager' },
  { id: 'terminal', icon: '>_', label: 'Terminal' },
  { id: 'ai', icon: '🤖', label: 'AI Diagnostics' },
  { id: 'activity', icon: '📋', label: 'Activity Log' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [servers, setServers] = useState([]);
  const [serverId, setServerId] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [aiPrefill, setAiPrefill] = useState('');
  const [aiHistoryResult, setAiHistoryResult] = useState(null);
  const [socket, setSocket] = useState(null);
  const [stats, setStats] = useState({});

  const handleLogin = useCallback((data) => {
    const { token, user: u, groups: g } = data;
    sessionStorage.setItem('cp_token', token);
    setUser(u);
    setGroups(g);
    const allServers = g.flatMap((gr) => (gr.servers || []).map((s) => ({ ...s, groupId: gr.id })));
    setServers(allServers);
    if (allServers.length) setServerId((prev) => prev || allServers[0].id);
    const sock = getSocket(token);
    setSocket(sock);
  }, []);

  // Restore session on page load / refresh — no re-login needed
  useEffect(() => {
    const token = sessionStorage.getItem('cp_token');
    if (!token) return;
    api.get('/auth/me')
      .then(({ data }) => handleLogin(data))
      .catch(() => sessionStorage.removeItem('cp_token'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('cp_token');
    disconnectSocket();
    setUser(null);
    setGroups([]);
    setServers([]);
    setServerId(null);
    setSocket(null);
    setStats({});
  }, []);

  useEffect(() => {
    if (!serverId) return;
    const fetchStats = () => {
      api.get(`/servers/${serverId}/stats`).then((r) => setStats(r.data.data)).catch(() => {});
    };
    fetchStats();
    const t = setInterval(fetchStats, 10000);
    return () => clearInterval(t);
  }, [serverId]);

  const sendToAI = (msg) => {
    setAiPrefill(msg);
    setAiHistoryResult(null);
    setPage('ai');
  };

  const showAIHistory = (historyData) => {
    setAiPrefill(historyData.errorText || '');
    setAiHistoryResult(historyData.result || null);
    setPage('ai');
  };

  const currentServer = servers.find((s) => s.id === serverId);

  const pageMeta = {
    dashboard: { title: 'Dashboard', sub: currentServer ? `Monitoring ${currentServer.name}` : '' },
    files: { title: 'File Manager', sub: currentServer ? `${currentServer.name} · Full directory access` : '' },
    terminal: { title: 'Terminal', sub: currentServer ? `${currentServer.name} · Console` : '' },
    ai: { title: 'AI Diagnostics', sub: currentServer ? `${currentServer.name} · Powered by Claude` : '' },
    activity: { title: 'Activity Log', sub: 'All admin actions across your servers' },
  }[page];

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const sv = stats;
  const ramBadge = sv.ram > 70
    ? <span className="badge badge-amber">RAM {sv.ram}%</span>
    : <span className="badge badge-green">RAM {sv.ram ?? '—'}%</span>;
  const statusBadge = sv.status === 'online'
    ? <span className="badge badge-green">● ONLINE</span>
    : sv.status === 'starting'
    ? <span className="badge badge-amber">◌ STARTING</span>
    : null;

  return (
    <div className="app">
      <Sidebar
        user={user}
        servers={servers}
        serverId={serverId}
        onServerSelect={setServerId}
        page={page}
        onPageChange={setPage}
        nav={NAV}
        onLogout={handleLogout}
      />
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">{pageMeta.title}</div>
            <div className="page-sub">{pageMeta.sub}</div>
          </div>
          <div className="topbar-right">
            {statusBadge}
            {sv.players !== undefined && <span className="badge badge-green">{sv.players} online</span>}
            {sv.tps !== undefined && <span className={`badge ${sv.tps >= 19 ? 'badge-green' : 'badge-amber'}`}>TPS {sv.tps}</span>}
            {sv.ram !== undefined && ramBadge}
          </div>
        </div>
        <div className="content">
          {page === 'dashboard' && <Dashboard serverId={serverId} socket={socket} stats={sv} onSendToAI={sendToAI} />}
          {page === 'files' && <FileManager serverId={serverId} />}
          {page === 'terminal' && <Terminal serverId={serverId} socket={socket} serverName={currentServer?.name} />}
          {page === 'ai' && (
            <AIDiagnostics
              serverId={serverId}
              prefillText={aiPrefill}
              historyResult={aiHistoryResult}
              serverName={currentServer?.name}
            />
          )}
          {page === 'activity' && <ActivityLog serverId={serverId} onViewAI={showAIHistory} />}
        </div>
      </div>
    </div>
  );
}
