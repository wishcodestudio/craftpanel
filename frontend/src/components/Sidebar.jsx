export default function Sidebar({ user, servers, serverId, onServerSelect, page, onPageChange, nav, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">Craft<span>Panel</span></div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user.name || user.username)[0].toUpperCase()}</div>
          <div>
            <div className="sidebar-uname">{user.name || user.username}</div>
            <div className="sidebar-urole">{user.role}</div>
          </div>
        </div>
      </div>

      <div className="sidebar-servers">
        <div className="sidebar-sec">Your Servers</div>
        {servers.map((s) => (
          <div
            key={s.id}
            className={`server-item ${s.id === serverId ? 'active' : ''}`}
            onClick={() => onServerSelect(s.id)}
          >
            <div className="server-dot" />
            <div>
              <div className="server-name">{s.name}</div>
              <div className="server-ver">{s.version || 'Paper'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-sec">Navigation</div>
        {nav.map((n) => (
          <div
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => onPageChange(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="logout-btn" onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}
