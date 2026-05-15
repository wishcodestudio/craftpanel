import { useState, useEffect, useRef, useCallback } from "react";

// ── Fonts ──────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@400;500;600;700;800&display=swap";
document.head.appendChild(fontLink);

// ── Mock Data ──────────────────────────────────────────────────────────────
const USERS = {
  admin: { password: "admin123", name: "SnowOwner", role: "owner", servers: ["sv-1", "sv-2"] },
  staff1: { password: "staff123", name: "RedMod", role: "admin", servers: ["sv-1"] },
};

const SERVERS = {
  "sv-1": { name: "SurvivalCraft", ip: "127.0.0.1:25565", version: "Paper 1.20.4", status: "online", ram: 72, tps: 19.8, players: 14, maxPlayers: 50 },
  "sv-2": { name: "CreativeHub", ip: "127.0.0.1:25566", version: "Paper 1.20.4", status: "online", ram: 31, tps: 20.0, players: 3, maxPlayers: 30 },
};

const MOCK_LOGS = [
  { id: 1, time: "12:01:03", level: "INFO", msg: "[Server thread] Starting minecraft server version 1.20.4" },
  { id: 2, time: "12:01:04", level: "INFO", msg: "[Server thread] Loading properties" },
  { id: 3, time: "12:01:05", level: "INFO", msg: "[Server thread] Default game type: SURVIVAL" },
  { id: 4, time: "12:01:06", level: "WARN", msg: "[Server thread] Can't keep up! Is the server overloaded?" },
  { id: 5, time: "12:01:07", level: "ERROR", msg: "[Server thread] java.lang.OutOfMemoryError: Java heap space" },
  { id: 6, time: "12:01:07", level: "ERROR", msg: "  at net.minecraft.server.MinecraftServer.tickChildren(MinecraftServer.java:1371)" },
  { id: 7, time: "12:01:08", level: "INFO", msg: "[EssentialsX] Enabling EssentialsX v2.20.1" },
  { id: 8, time: "12:01:09", level: "INFO", msg: "[WorldGuard] Loading WorldGuard v7.0.9" },
  { id: 9, time: "12:01:10", level: "WARN", msg: "[ProtocolLib] Version (5.1.0) of ProtocolLib is not tested with Paper 1.20.4" },
  { id: 10, time: "12:01:11", level: "INFO", msg: "[LuckPerms] Loading LuckPerms v5.4.102" },
  { id: 11, time: "12:01:12", level: "ERROR", msg: "[SkriptPlugin] Could not load 'plugins/Skript/scripts/myscript.sk': NullPointerException" },
  { id: 12, time: "12:01:13", level: "INFO", msg: "[Server thread] Done (4.321s)! For help, type help" },
];

const MOCK_FILES = {
  "/": [
    { name: "server.properties", type: "file", size: "4.2 KB", modified: "2h ago" },
    { name: "bukkit.yml", type: "file", size: "1.8 KB", modified: "1d ago" },
    { name: "spigot.yml", type: "file", size: "6.1 KB", modified: "3d ago" },
    { name: "paper.yml", type: "file", size: "12.4 KB", modified: "3d ago" },
    { name: "plugins", type: "dir", modified: "30m ago" },
    { name: "world", type: "dir", modified: "5m ago" },
    { name: "logs", type: "dir", modified: "1m ago" },
    { name: "eula.txt", type: "file", size: "0.2 KB", modified: "7d ago" },
  ],
  "/plugins": [
    { name: "EssentialsX-2.20.1.jar", type: "file", size: "1.2 MB", modified: "5d ago" },
    { name: "WorldGuard-7.0.9.jar", type: "file", size: "890 KB", modified: "5d ago" },
    { name: "LuckPerms-Bukkit-5.4.102.jar", type: "file", size: "2.1 MB", modified: "2d ago" },
    { name: "Skript-2.7.3.jar", type: "file", size: "3.4 MB", modified: "1d ago" },
    { name: "EssentialsX", type: "dir", modified: "2h ago" },
    { name: "LuckPerms", type: "dir", modified: "1d ago" },
  ],
  "/plugins/EssentialsX": [
    { name: "config.yml", type: "file", size: "28.4 KB", modified: "2h ago" },
    { name: "messages_en.properties", type: "file", size: "14.2 KB", modified: "5d ago" },
    { name: "userdata", type: "dir", modified: "5m ago" },
  ],
};

const FILE_CONTENTS = {
  "server.properties": `#Minecraft server properties
#Mon Jan 15 12:00:00 UTC 2024
enable-jmx-monitoring=false
rcon.port=25575
level-seed=
gamemode=survival
enable-command-block=false
enable-query=false
generator-settings={}
enforce-secure-profile=true
level-name=world
motd=\\u00A7aSurvivalCraft \\u00A77| 1.20.4
query.port=25565
pvp=true
generate-structures=true
max-chunksize=10
difficulty=easy
network-compression-threshold=256
max-tick-time=60000
require-resource-pack=false
use-native-transport=true
max-players=50
online-mode=true
enable-status=true
allow-flight=false
initial-disabled-packs=
broadcast-rcon-to-ops=true
view-distance=10
server-ip=
resource-pack-prompt=
allow-nether=true
server-port=25565
enable-rcon=true
sync-chunk-writes=true
op-permission-level=4
prevent-proxy-connections=false
hide-online-players=false
resource-pack=
entity-broadcast-range-percentage=100
simulation-distance=10
rcon.password=changeme123
player-idle-timeout=0
force-gamemode=false
rate-limit=0
hardcore=false
white-list=false
broadcast-console-to-ops=true
spawn-npcs=true
spawn-animals=true
log-ips=true
function-permission-level=2
initial-enabled-packs=vanilla
level-type=minecraft\\:normal
text-filtering-config=
spawn-monsters=true
enforce-whitelist=false
spawn-protection=16
max-world-size=29999984`,
  "bukkit.yml": `settings:
  allow-end: true
  warn-on-overload: true
  permissions-file: permissions.yml
  update-folder: update
  plugin-profiling: false
  connection-throttle: 4000
  query-plugins: true
  deprecated-verbose: default
  shutdown-message: Server closed
  minimum-api: none
  use-map-color-cache: true
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 5
  water-ambient: 20
  water-underground-creature: 5
  axolotls: 5
  ambient: 15
chunk-gc:
  period-in-ticks: 600
ticks-per:
  animal-spawns: 400
  monster-spawns: 1
  water-spawns: 1
  water-ambient-spawns: 1
  water-underground-creature-spawns: 1
  axolotl-spawns: 1
  ambient-spawns: 1
  autosave: 6000`,
  "config.yml": `# EssentialsX Configuration
# Version 2.20.1

# MUTE/BAN Messages
mute-reason: You are muted!
ban-reason: You have been banned!

# Economy
economy:
  starting-balance: 1000
  currency-symbol: "$"
  currency-symbol-suffix: false
  min-money: -10000
  max-money: 10000000000000
  trade-requires-balance: true

# Chat
chat:
  radius: 0
  format: "<{DISPLAYNAME}> {MESSAGE}"
  shout-format: "!<{DISPLAYNAME}> {MESSAGE}"

# Teleportation
teleport-safety: true
teleport-to-center: true
teleportation-cooldown: 3
teleport-delay: 0

# Homes
sethome-multiple:
  default: 3
  vip: 10
  admin: unlimited`,
};

const ACTIVITY_LOG = [
  { id: 1, user: "SnowOwner", action: "Edited server.properties", file: "/server.properties", time: "2 min ago", server: "SurvivalCraft" },
  { id: 2, user: "RedMod", action: "Ran command /tps", time: "15 min ago", server: "SurvivalCraft" },
  { id: 3, user: "SnowOwner", action: "Edited config.yml", file: "/plugins/EssentialsX/config.yml", time: "2 hr ago", server: "SurvivalCraft" },
  { id: 4, user: "SnowOwner", action: "Restarted server", time: "5 hr ago", server: "CreativeHub" },
  { id: 5, user: "RedMod", action: "Viewed logs", time: "1 day ago", server: "SurvivalCraft" },
];

// ── Styles ────────────────────────────────────────────────────────────────
const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg0: #0c0e14;
    --bg1: #13151f;
    --bg2: #1a1d2a;
    --bg3: #21263a;
    --bg4: #2a3045;
    --border: #2e3450;
    --border2: #3d4566;
    --text1: #e8eaf6;
    --text2: #9ba3c9;
    --text3: #5b6490;
    --green: #4ade80;
    --green2: #16a34a;
    --amber: #fbbf24;
    --red: #f87171;
    --blue: #60a5fa;
    --purple: #a78bfa;
    --cyan: #22d3ee;
    --accent: #7c6af7;
    --accent2: #5b4fd4;
  }
  body { font-family: 'Syne', sans-serif; background: var(--bg0); color: var(--text1); }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg1); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* Login */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg0); position: relative; overflow: hidden; }
  .login-grid { position: absolute; inset: 0; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 40px 40px; opacity: 0.3; }
  .login-card { background: var(--bg1); border: 1px solid var(--border); border-radius: 16px; padding: 48px 40px; width: 380px; position: relative; z-index: 1; }
  .login-card::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 60%; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); }
  .login-logo { font-size: 13px; font-weight: 600; letter-spacing: 3px; color: var(--text3); text-transform: uppercase; margin-bottom: 32px; }
  .login-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
  .login-sub { font-size: 14px; color: var(--text2); margin-bottom: 36px; }
  .login-label { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; display: block; }
  .login-input { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 11px 14px; color: var(--text1); font-family: 'JetBrains Mono', monospace; font-size: 14px; outline: none; transition: border-color .2s; margin-bottom: 16px; }
  .login-input:focus { border-color: var(--accent); }
  .login-btn { width: 100%; background: var(--accent); border: none; border-radius: 8px; padding: 13px; color: #fff; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .2s, transform .1s; margin-top: 8px; }
  .login-btn:hover { background: var(--accent2); }
  .login-btn:active { transform: scale(0.98); }
  .login-err { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: var(--red); margin-bottom: 16px; }

  /* App Shell */
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* Sidebar */
  .sidebar { width: 220px; flex-shrink: 0; background: var(--bg1); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .sidebar-top { padding: 20px 16px 16px; border-bottom: 1px solid var(--border); }
  .sidebar-brand { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; color: var(--text1); }
  .sidebar-brand span { color: var(--accent); }
  .sidebar-user { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 8px 10px; background: var(--bg2); border-radius: 8px; cursor: pointer; }
  .sidebar-avatar { width: 28px; height: 28px; border-radius: 6px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .sidebar-uname { font-size: 13px; font-weight: 600; }
  .sidebar-urole { font-size: 11px; color: var(--text3); }
  .sidebar-servers { padding: 16px 12px 8px; }
  .sidebar-sec { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text3); padding: 0 4px; margin-bottom: 8px; }
  .server-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background .15s; margin-bottom: 2px; }
  .server-item:hover { background: var(--bg3); }
  .server-item.active { background: var(--bg3); border: 1px solid var(--border); }
  .server-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); flex-shrink: 0; box-shadow: 0 0 6px var(--green); }
  .server-dot.off { background: var(--text3); box-shadow: none; }
  .server-name { font-size: 13px; font-weight: 600; line-height: 1.2; }
  .server-ver { font-size: 11px; color: var(--text3); }
  .sidebar-nav { padding: 8px 12px; flex: 1; overflow-y: auto; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: background .15s; font-size: 13px; font-weight: 500; color: var(--text2); margin-bottom: 2px; }
  .nav-item:hover { background: var(--bg3); color: var(--text1); }
  .nav-item.active { background: rgba(124,106,247,0.15); color: var(--accent); border: 1px solid rgba(124,106,247,0.25); }
  .nav-icon { width: 16px; text-align: center; font-size: 14px; }
  .sidebar-bottom { padding: 12px; border-top: 1px solid var(--border); }
  .logout-btn { width: 100%; background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 8px; color: var(--text3); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .logout-btn:hover { border-color: var(--red); color: var(--red); }

  /* Main */
  .main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .topbar { padding: 14px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--bg1); flex-shrink: 0; }
  .page-title { font-size: 18px; font-weight: 700; }
  .page-sub { font-size: 12px; color: var(--text3); margin-top: 1px; }
  .topbar-right { display: flex; align-items: center; gap: 10px; }
  .badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; }
  .badge-green { background: rgba(74,222,128,0.12); color: var(--green); border: 1px solid rgba(74,222,128,0.25); }
  .badge-amber { background: rgba(251,191,36,0.12); color: var(--amber); border: 1px solid rgba(251,191,36,0.25); }
  .badge-red { background: rgba(248,113,113,0.12); color: var(--red); border: 1px solid rgba(248,113,113,0.25); }
  .content { flex: 1; overflow-y: auto; padding: 24px; }

  /* Dashboard */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .stat-card { background: var(--bg1); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
  .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; }
  .stat-val { font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
  .stat-sub { font-size: 12px; color: var(--text3); margin-top: 4px; }
  .ram-bar { height: 4px; background: var(--bg3); border-radius: 2px; margin-top: 8px; }
  .ram-fill { height: 100%; border-radius: 2px; transition: width .5s; }
  .panel { background: var(--bg1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .panel-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .panel-title { font-size: 13px; font-weight: 700; letter-spacing: 0.3px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .panel-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: var(--text2); cursor: pointer; font-family: 'Syne', sans-serif; transition: all .15s; }
  .panel-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Logs */
  .log-wrap { padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; max-height: 340px; overflow-y: auto; }
  .log-line { display: flex; gap: 10px; padding: 3px 0; border-bottom: 1px solid rgba(46,52,80,0.4); }
  .log-line:last-child { border-bottom: none; }
  .log-time { color: var(--text3); flex-shrink: 0; }
  .log-level { width: 48px; flex-shrink: 0; font-weight: 600; }
  .log-level.INFO { color: var(--blue); }
  .log-level.WARN { color: var(--amber); }
  .log-level.ERROR { color: var(--red); }
  .log-msg { color: var(--text2); word-break: break-all; }
  .log-msg.error { color: var(--red); }
  .log-msg.warn { color: var(--amber); }
  .send-ai-btn { background: rgba(124,106,247,0.1); border: 1px solid rgba(124,106,247,0.25); border-radius: 4px; padding: 2px 8px; font-size: 10px; color: var(--accent); cursor: pointer; font-family: 'Syne', sans-serif; font-weight: 600; flex-shrink: 0; transition: all .15s; margin-left: auto; }
  .send-ai-btn:hover { background: rgba(124,106,247,0.2); }

  /* Activity */
  .activity-item { display: flex; align-items: center; gap: 12px; padding: 11px 18px; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
  .activity-action { font-size: 13px; font-weight: 500; }
  .activity-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .activity-time { font-size: 11px; color: var(--text3); margin-left: auto; white-space: nowrap; flex-shrink: 0; }

  /* File Manager */
  .fm-wrap { display: flex; height: calc(100vh - 120px); gap: 0; }
  .fm-tree { width: 260px; flex-shrink: 0; background: var(--bg1); border: 1px solid var(--border); border-radius: 12px 0 0 12px; overflow-y: auto; }
  .fm-main { flex: 1; background: var(--bg2); border: 1px solid var(--border); border-left: none; border-radius: 0 12px 12px 0; display: flex; flex-direction: column; overflow: hidden; }
  .fm-path { padding: 10px 16px; border-bottom: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text2); display: flex; align-items: center; gap: 4px; background: var(--bg1); }
  .fm-path-seg { cursor: pointer; color: var(--accent); transition: opacity .15s; }
  .fm-path-seg:hover { opacity: 0.7; }
  .fm-list { flex: 1; overflow-y: auto; }
  .fm-item { display: flex; align-items: center; gap: 12px; padding: 9px 16px; border-bottom: 1px solid rgba(46,52,80,0.5); cursor: pointer; transition: background .12s; }
  .fm-item:hover { background: var(--bg3); }
  .fm-item.selected { background: rgba(124,106,247,0.1); border-color: rgba(124,106,247,0.2); }
  .fm-icon { font-size: 15px; width: 18px; text-align: center; flex-shrink: 0; }
  .fm-name { font-size: 13px; font-weight: 500; flex: 1; font-family: 'JetBrains Mono', monospace; }
  .fm-size { font-size: 11px; color: var(--text3); font-family: 'JetBrains Mono', monospace; }
  .fm-mod { font-size: 11px; color: var(--text3); margin-left: 12px; }

  /* Editor */
  .editor-wrap { flex: 1; display: flex; flex-direction: column; }
  .editor-tabs { display: flex; align-items: center; border-bottom: 1px solid var(--border); background: var(--bg1); padding: 0 16px; gap: 0; }
  .editor-tab { padding: 10px 16px; font-size: 12px; font-weight: 500; font-family: 'JetBrains Mono', monospace; color: var(--text3); cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; white-space: nowrap; }
  .editor-tab.active { color: var(--text1); border-bottom-color: var(--accent); }
  .editor-tab .dot-mod { width: 6px; height: 6px; border-radius: 50%; background: var(--amber); display: inline-block; margin-left: 6px; }
  .editor-area { flex: 1; display: flex; overflow: hidden; }
  .line-nums { background: var(--bg1); padding: 16px 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text3); text-align: right; user-select: none; border-right: 1px solid var(--border); min-width: 48px; overflow: hidden; }
  .line-num { padding: 0 12px; line-height: 20px; }
  .code-area { flex: 1; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text2); line-height: 20px; overflow: auto; background: var(--bg2); outline: none; resize: none; border: none; white-space: pre; }
  .editor-footer { padding: 8px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--bg1); gap: 10px; }
  .editor-footer-left { font-size: 11px; color: var(--text3); font-family: 'JetBrains Mono', monospace; }
  .save-btn { background: var(--accent); border: none; border-radius: 6px; padding: 6px 16px; color: #fff; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s; }
  .save-btn:hover { background: var(--accent2); }
  .discard-btn { background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 6px 14px; color: var(--text3); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .discard-btn:hover { border-color: var(--red); color: var(--red); }

  /* Terminal */
  .term-wrap { background: var(--bg0); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; height: calc(100vh - 140px); display: flex; flex-direction: column; }
  .term-header { padding: 10px 16px; background: var(--bg1); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .term-dot { width: 10px; height: 10px; border-radius: 50%; }
  .term-output { flex: 1; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; overflow-y: auto; line-height: 1.6; }
  .term-line { margin-bottom: 2px; }
  .term-prompt { color: var(--green); }
  .term-cmd { color: var(--text1); }
  .term-result { color: var(--text2); }
  .term-err { color: var(--red); }
  .term-input-row { display: flex; align-items: center; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg1); gap: 10px; }
  .term-input { flex: 1; background: transparent; border: none; outline: none; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text1); }

  /* AI Diagnostics */
  .ai-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .ai-panel { background: var(--bg1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .ai-input-area { padding: 16px; }
  .ai-textarea { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text2); outline: none; resize: none; min-height: 140px; transition: border-color .2s; }
  .ai-textarea:focus { border-color: var(--accent); }
  .ai-submit-btn { background: var(--accent); border: none; border-radius: 8px; padding: 10px 20px; color: #fff; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 10px; transition: background .15s; }
  .ai-submit-btn:hover { background: var(--accent2); }
  .ai-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai-response { padding: 16px; }
  .ai-explanation { font-size: 13px; color: var(--text2); line-height: 1.7; margin-bottom: 16px; padding: 14px; background: var(--bg2); border-radius: 8px; border-left: 3px solid var(--accent); }
  .fix-option { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: all .15s; }
  .fix-option:hover { border-color: var(--accent); background: rgba(124,106,247,0.05); }
  .fix-option.selected { border-color: var(--accent); background: rgba(124,106,247,0.1); }
  .fix-num { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
  .fix-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .fix-desc { font-size: 12px; color: var(--text3); line-height: 1.5; }
  .fix-risk { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-top: 8px; }
  .risk-low { background: rgba(74,222,128,0.1); color: var(--green); }
  .risk-med { background: rgba(251,191,36,0.1); color: var(--amber); }
  .risk-high { background: rgba(248,113,113,0.1); color: var(--red); }
  .apply-btn { background: var(--accent); border: none; border-radius: 8px; padding: 10px; color: #fff; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 12px; transition: background .15s; }
  .apply-btn:hover { background: var(--accent2); }
  .ai-thinking { display: flex; align-items: center; gap: 10px; padding: 16px; color: var(--text3); font-size: 13px; }
  .thinking-dots span { animation: blink 1.2s infinite; font-size: 20px; line-height: 1; }
  .thinking-dots span:nth-child(2) { animation-delay: .2s; }
  .thinking-dots span:nth-child(3) { animation-delay: .4s; }
  @keyframes blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }

  /* Confirm Modal */
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--bg1); border: 1px solid var(--border2); border-radius: 14px; padding: 28px; width: 420px; }
  .modal-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .modal-body { font-size: 13px; color: var(--text2); line-height: 1.6; margin-bottom: 20px; }
  .modal-code { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--cyan); margin: 12px 0; }
  .modal-actions { display: flex; gap: 10px; }
  .modal-cancel { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 10px; color: var(--text2); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
  .modal-confirm { flex: 1; background: var(--accent); border: none; border-radius: 8px; padding: 10px; color: #fff; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text3); gap: 12px; padding: 40px; text-align: center; }
  .empty-icon { font-size: 40px; }
  .empty-text { font-size: 14px; }
`;

const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ── Syntax Highlight (simple) ────────────────────────────────────────────
function highlight(code, filename) {
  if (!filename) return code;
  const ext = filename.split(".").pop();
  if (!["yml", "yaml", "properties", "json"].includes(ext)) return code;

  return code
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("#"))
        return `<span style="color:var(--text3)">${line}</span>`;
      if (ext === "yml" || ext === "yaml") {
        return line.replace(
          /^(\s*)([\w-]+)(\s*:)(.*)$/,
          (_, indent, key, colon, val) => {
            const valSpan = val.trim()
              ? `<span style="color:var(--cyan)">${val}</span>`
              : val;
            return `${indent}<span style="color:var(--purple)">${key}</span><span style="color:var(--text3)">${colon}</span>${valSpan}`;
          }
        );
      }
      if (ext === "properties") {
        return line.replace(/^([^=]+)(=)(.*)$/, (_, k, eq, v) => {
          return `<span style="color:var(--purple)">${k}</span><span style="color:var(--text3)">${eq}</span><span style="color:var(--cyan)">${v}</span>`;
        });
      }
      return line;
    })
    .join("\n");
}

// ── Components ────────────────────────────────────────────────────────────

function LoginPage({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const usr = USERS[u];
    if (usr && usr.password === p) {
      onLogin({ username: u, ...usr });
    } else {
      setErr("Invalid username or password.");
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">⬡ CraftPanel</div>
        <div className="login-title">Admin Login</div>
        <div className="login-sub">Sign in to manage your Minecraft servers</div>
        {err && <div className="login-err">{err}</div>}
        <label className="login-label">Username</label>
        <input
          className="login-input"
          value={u}
          onChange={(e) => setU(e.target.value)}
          placeholder="admin"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          placeholder="••••••••"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="login-btn" onClick={submit}>Sign In →</button>
        <div style={{ marginTop: 16, fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
          Demo: admin / admin123 &nbsp;·&nbsp; staff1 / staff123
        </div>
      </div>
    </div>
  );
}

function Dashboard({ server, onSendToAI }) {
  const sv = SERVERS[server];
  const ramColor = sv.ram > 80 ? "var(--red)" : sv.ram > 60 ? "var(--amber)" : "var(--green)";

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-val" style={{ color: "var(--green)", fontSize: 20, marginTop: 4 }}>● ONLINE</div>
          <div className="stat-sub">{sv.ip}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Players</div>
          <div className="stat-val">{sv.players}<span style={{ fontSize: 16, color: "var(--text3)" }}>/{sv.maxPlayers}</span></div>
          <div className="stat-sub">currently online</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TPS</div>
          <div className="stat-val" style={{ color: sv.tps >= 19 ? "var(--green)" : "var(--amber)" }}>{sv.tps}</div>
          <div className="stat-sub">target: 20.0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RAM Usage</div>
          <div className="stat-val" style={{ color: ramColor }}>{sv.ram}<span style={{ fontSize: 16 }}>%</span></div>
          <div className="ram-bar"><div className="ram-fill" style={{ width: sv.ram + "%", background: ramColor }} /></div>
        </div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Live Console</span>
            <span className="badge badge-green">● STREAMING</span>
          </div>
          <div className="log-wrap">
            {MOCK_LOGS.map((l) => (
              <div className="log-line" key={l.id}>
                <span className="log-time">{l.time}</span>
                <span className={`log-level ${l.level}`}>{l.level}</span>
                <span className={`log-msg ${l.level === "ERROR" ? "error" : l.level === "WARN" ? "warn" : ""}`}>{l.msg}</span>
                {(l.level === "ERROR" || l.level === "WARN") && (
                  <button className="send-ai-btn" onClick={() => onSendToAI(l.msg)}>→ AI</button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Activity Log</span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>All admins</span>
          </div>
          {ACTIVITY_LOG.filter((a) => a.server === sv.name).map((a) => (
            <div className="activity-item" key={a.id}>
              <div className="activity-dot" />
              <div>
                <div className="activity-action">{a.action}</div>
                <div className="activity-meta">{a.user} {a.file ? `· ${a.file}` : ""}</div>
              </div>
              <div className="activity-time">{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FileManager({ server }) {
  const [path, setPath] = useState("/");
  const [selected, setSelected] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [editedContent, setEditedContent] = useState({});
  const [saveModal, setSaveModal] = useState(null);

  const files = MOCK_FILES[path] || [];
  const pathParts = path === "/" ? [""] : path.split("/").filter(Boolean);

  const openFile = (file) => {
    if (file.type === "dir") {
      setPath(path === "/" ? `/${file.name}` : `${path}/${file.name}`);
      return;
    }
    const content = FILE_CONTENTS[file.name] || `# ${file.name}\n# No preview available for this file type`;
    if (!openFiles.find((f) => f.name === file.name)) {
      setOpenFiles((prev) => [...prev, { ...file, content, path: path === "/" ? `/${file.name}` : `${path}/${file.name}` }]);
    }
    setActiveTab(file.name);
    setSelected(file.name);
  };

  const navigateTo = (idx) => {
    if (idx === 0) { setPath("/"); return; }
    setPath("/" + pathParts.slice(0, idx).join("/"));
  };

  const handleSave = (filename) => {
    setSaveModal(filename);
  };

  const confirmSave = () => {
    setOpenFiles((prev) =>
      prev.map((f) => f.name === saveModal ? { ...f, content: editedContent[saveModal] || f.content, modified: true } : f)
    );
    setEditedContent((prev) => { const n = { ...prev }; delete n[saveModal]; return n; });
    setSaveModal(null);
  };

  const activeFile = openFiles.find((f) => f.name === activeTab);
  const content = activeTab ? (editedContent[activeTab] ?? activeFile?.content ?? "") : "";
  const isModified = (fname) => editedContent[fname] !== undefined;
  const lines = content.split("\n");

  return (
    <div className="fm-wrap">
      {saveModal && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">Save File</div>
            <div className="modal-body">Save changes to:</div>
            <div className="modal-code">{saveModal}</div>
            <div className="modal-body">This will overwrite the file on the server.</div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setSaveModal(null)}>Cancel</button>
              <button className="modal-confirm" onClick={confirmSave}>Save File</button>
            </div>
          </div>
        </div>
      )}
      <div className="fm-tree">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--text3)" }}>
          Explorer
        </div>
        {files.map((f) => (
          <div
            key={f.name}
            className={`fm-item ${selected === f.name ? "selected" : ""}`}
            onClick={() => openFile(f)}
          >
            <span className="fm-icon">{f.type === "dir" ? "📁" : "📄"}</span>
            <span className="fm-name">{f.name}</span>
            {f.size && <span className="fm-size">{f.size}</span>}
          </div>
        ))}
      </div>
      <div className="fm-main">
        <div className="fm-path">
          <span className="fm-path-seg" onClick={() => navigateTo(0)}>~</span>
          {pathParts.filter(Boolean).map((seg, i) => (
            <span key={i}>
              <span style={{ color: "var(--text3)", margin: "0 3px" }}>/</span>
              <span className="fm-path-seg" onClick={() => navigateTo(i + 1)}>{seg}</span>
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
                  key={f.name}
                  className={`editor-tab ${activeTab === f.name ? "active" : ""}`}
                  onClick={() => setActiveTab(f.name)}
                >
                  {f.name}
                  {isModified(f.name) && <span className="dot-mod" />}
                </div>
              ))}
            </div>
            <div className="editor-area">
              <div className="line-nums">
                {lines.map((_, i) => (
                  <div className="line-num" key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                className="code-area"
                value={content}
                onChange={(e) => setEditedContent((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                spellCheck={false}
              />
            </div>
            <div className="editor-footer">
              <div className="editor-footer-left">
                {activeFile?.path} · {lines.length} lines
                {isModified(activeTab) && <span style={{ color: "var(--amber)", marginLeft: 10 }}>● Unsaved changes</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {isModified(activeTab) && (
                  <button className="discard-btn" onClick={() => setEditedContent((prev) => { const n = { ...prev }; delete n[activeTab]; return n; })}>Discard</button>
                )}
                <button className="save-btn" onClick={() => handleSave(activeTab)}>Save File</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Terminal({ server }) {
  const [lines, setLines] = useState([
    { type: "result", text: `Connected to ${SERVERS[server]?.name} via RCON` },
    { type: "result", text: 'Type a command and press Enter. Dangerous commands require confirmation.' },
    { type: "result", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [modal, setModal] = useState(null);
  const outputRef = useRef(null);

  const DANGEROUS = ["stop", "restart", "op ", "deop ", "whitelist remove", "ban "];

  const isDangerous = (cmd) => DANGEROUS.some((d) => cmd.toLowerCase().startsWith(d));

  const RESPONSES = {
    tps: "TPS from last 1m, 5m, 15m: 19.98, 19.95, 19.92",
    list: "There are 14 of a max of 50 players online.",
    plugins: "Plugins (6): EssentialsX, WorldGuard, LuckPerms, Skript, ProtocolLib, Vault",
    version: "This server is running Paper version git-Paper-196 (MC: 1.20.4)",
    help: "Available: tps, list, plugins, version, stop, restart, op, deop, say, kick, ban, whitelist",
  };

  const run = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setHistory((h) => [trimmed, ...h]);
    setHistIdx(-1);
    setLines((prev) => [...prev, { type: "cmd", text: trimmed }]);
    const key = trimmed.toLowerCase().split(" ")[0];
    const response = RESPONSES[key] || `Executed: /${trimmed}`;
    setTimeout(() => {
      setLines((prev) => [...prev, { type: "result", text: response }, { type: "result", text: "" }]);
    }, 120);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      const cmd = input.trim();
      setInput("");
      if (!cmd) return;
      if (isDangerous(cmd)) {
        setModal(cmd);
      } else {
        run(cmd);
      }
    }
    if (e.key === "ArrowUp") {
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] || "");
      e.preventDefault();
    }
    if (e.key === "ArrowDown") {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : history[idx] || "");
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  return (
    <div>
      {modal && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">⚠️ Confirm Dangerous Command</div>
            <div className="modal-body">This command may affect server availability or player permissions.</div>
            <div className="modal-code">/{modal}</div>
            <div className="modal-body">Are you sure you want to run this on <strong>{SERVERS[server]?.name}</strong>?</div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="modal-confirm" style={{ background: "var(--red)" }} onClick={() => { run(modal); setModal(null); }}>Run Anyway</button>
            </div>
          </div>
        </div>
      )}
      <div className="term-wrap">
        <div className="term-header">
          <div className="term-dot" style={{ background: "#ff5f57" }} />
          <div className="term-dot" style={{ background: "#febc2e" }} />
          <div className="term-dot" style={{ background: "#28c840" }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace" }}>
            {SERVERS[server]?.name} — RCON Terminal
          </span>
          <span className="badge badge-green" style={{ marginLeft: "auto" }}>Connected</span>
        </div>
        <div className="term-output" ref={outputRef}>
          {lines.map((l, i) => (
            <div className="term-line" key={i}>
              {l.type === "cmd" ? (
                <span><span className="term-prompt">➜ </span><span className="term-cmd">{l.text}</span></span>
              ) : l.type === "err" ? (
                <span className="term-err">{l.text}</span>
              ) : (
                <span className="term-result">{l.text}</span>
              )}
            </div>
          ))}
        </div>
        <div className="term-input-row">
          <span style={{ color: "var(--green)", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>➜</span>
          <input
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Enter command..."
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

const AI_FIXES = {
  default: {
    explanation:
      "This is a Java heap space OutOfMemoryError — your server ran out of allocated RAM. Minecraft servers need sufficient heap space to run plugins, load chunks, and handle players. The JVM tried to allocate more memory than was available in its heap.",
    fixes: [
      { title: "Increase JVM heap allocation", desc: "Modify your start script to raise -Xmx from 2G to 4G (or more). This gives the JVM more room before it crashes.", risk: "low" },
      { title: "Identify and remove heavy plugins", desc: "Run /timings report to find which plugins consume the most memory. Remove or replace offenders like Skript with heavy scripts.", risk: "low" },
      { title: "Enable garbage collection tuning", desc: "Add JVM flags: -XX:+UseG1GC -XX:MaxGCPauseMillis=200 to your start.sh. Reduces GC pauses and memory fragmentation.", risk: "med" },
    ],
  },
};

function AIDiagnostics({ server, prefillText }) {
  const [input, setInput] = useState(prefillText || "");
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [applyModal, setApplyModal] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => { if (prefillText) setInput(prefillText); }, [prefillText]);

  const analyze = () => {
    setThinking(true);
    setResult(null);
    setSelected(null);
    setTimeout(() => {
      setThinking(false);
      setResult(AI_FIXES.default);
    }, 1800);
  };

  const applyFix = (fix) => {
    setApplyModal(fix);
  };

  const confirmApply = () => {
    const fix = applyModal;
    setApplyModal(null);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setDone(fix);
    }, 1200);
  };

  return (
    <div>
      {applyModal && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-title">Apply Fix</div>
            <div className="modal-body">AI will apply the following fix to <strong>{SERVERS[server]?.name}</strong>:</div>
            <div className="modal-code">{applyModal.title}</div>
            <div className="modal-body">{applyModal.desc}</div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setApplyModal(null)}>Cancel</button>
              <button className="modal-confirm" onClick={confirmApply}>Apply Fix</button>
            </div>
          </div>
        </div>
      )}
      <div className="ai-layout">
        <div className="ai-panel">
          <div className="panel-header">
            <span className="panel-title">Error Input</span>
            <span style={{ fontSize: 11, color: "var(--accent)" }}>⬡ Claude AI</span>
          </div>
          <div className="ai-input-area">
            <textarea
              className="ai-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste a log error or describe a problem with ${SERVERS[server]?.name}...\n\nExample:\njava.lang.OutOfMemoryError: Java heap space`}
            />
            <button className="ai-submit-btn" onClick={analyze} disabled={!input.trim() || thinking}>
              {thinking ? "Analyzing…" : "Analyze with AI →"}
            </button>
          </div>
          {done && (
            <div style={{ margin: "0 16px 16px", padding: 14, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10 }}>
              <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>✓ Fix Applied</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>{done.title}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Would you like to reload plugins or restart the server?</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="panel-btn" style={{ flex: 1 }}>Reload Plugins</button>
                <button className="panel-btn" style={{ flex: 1 }}>Restart Server</button>
              </div>
            </div>
          )}
        </div>
        <div className="ai-panel">
          <div className="panel-header">
            <span className="panel-title">AI Suggestions</span>
          </div>
          {thinking && (
            <div className="ai-thinking">
              <div className="thinking-dots"><span>·</span><span>·</span><span>·</span></div>
              Analyzing error…
            </div>
          )}
          {!result && !thinking && (
            <div className="empty-state" style={{ height: 300 }}>
              <div className="empty-icon">🤖</div>
              <div className="empty-text">Paste an error and click Analyze to get AI suggestions</div>
            </div>
          )}
          {result && !thinking && (
            <div className="ai-response">
              <div className="ai-explanation">{result.explanation}</div>
              {result.fixes.map((fix, i) => (
                <div
                  key={i}
                  className={`fix-option ${selected === i ? "selected" : ""}`}
                  onClick={() => setSelected(i)}
                >
                  <div className="fix-num">Fix {i + 1}</div>
                  <div className="fix-title">{fix.title}</div>
                  <div className="fix-desc">{fix.desc}</div>
                  <div className={`fix-risk ${fix.risk === "low" ? "risk-low" : fix.risk === "med" ? "risk-med" : "risk-high"}`}>
                    {fix.risk === "low" ? "Low risk" : fix.risk === "med" ? "Medium risk" : "High risk"}
                  </div>
                </div>
              ))}
              {selected !== null && (
                <button className="apply-btn" onClick={() => applyFix(result.fixes[selected])}>
                  Apply Fix {selected + 1} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", icon: "⬡", label: "Dashboard" },
  { id: "files", icon: "📁", label: "File Manager" },
  { id: "terminal", icon: ">_", label: "Terminal" },
  { id: "ai", icon: "🤖", label: "AI Diagnostics" },
  { id: "activity", icon: "📋", label: "Activity Log" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [server, setServer] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [aiPrefill, setAiPrefill] = useState("");

  const handleLogin = (u) => {
    setUser(u);
    setServer(u.servers[0]);
  };

  const sendToAI = (msg) => {
    setAiPrefill(msg);
    setPage("ai");
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const sv = SERVERS[server];

  const pageTitle = {
    dashboard: { title: "Dashboard", sub: `Monitoring ${sv?.name}` },
    files: { title: "File Manager", sub: `${sv?.name} · Full directory access` },
    terminal: { title: "Terminal", sub: `${sv?.name} · RCON Console` },
    ai: { title: "AI Diagnostics", sub: `${sv?.name} · Powered by Claude` },
    activity: { title: "Activity Log", sub: "All admin actions across your servers" },
  }[page];

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">Craft<span>Panel</span></div>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user.name[0]}</div>
            <div>
              <div className="sidebar-uname">{user.name}</div>
              <div className="sidebar-urole">{user.role}</div>
            </div>
          </div>
        </div>
        <div className="sidebar-servers">
          <div className="sidebar-sec">Your Servers</div>
          {user.servers.map((sid) => {
            const s = SERVERS[sid];
            return (
              <div
                key={sid}
                className={`server-item ${server === sid ? "active" : ""}`}
                onClick={() => setServer(sid)}
              >
                <div className={`server-dot ${s.status !== "online" ? "off" : ""}`} />
                <div>
                  <div className="server-name">{s.name}</div>
                  <div className="server-ver">{s.version}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sidebar-nav">
          <div className="sidebar-sec">Navigation</div>
          {NAV.map((n) => (
            <div
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={() => setUser(null)}>Sign Out</button>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">{pageTitle.title}</div>
            <div className="page-sub">{pageTitle.sub}</div>
          </div>
          <div className="topbar-right">
            <span className="badge badge-green">● {sv?.players} online</span>
            <span className="badge badge-green">TPS {sv?.tps}</span>
            {sv?.ram > 70 ? <span className="badge badge-amber">RAM {sv?.ram}%</span> : <span className="badge badge-green">RAM {sv?.ram}%</span>}
          </div>
        </div>
        <div className="content">
          {page === "dashboard" && <Dashboard server={server} onSendToAI={sendToAI} />}
          {page === "files" && <FileManager server={server} />}
          {page === "terminal" && <Terminal server={server} />}
          {page === "ai" && <AIDiagnostics server={server} prefillText={aiPrefill} />}
          {page === "activity" && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">All Activity</span></div>
              {ACTIVITY_LOG.map((a) => (
                <div className="activity-item" key={a.id}>
                  <div className="activity-dot" />
                  <div>
                    <div className="activity-action">{a.action}</div>
                    <div className="activity-meta">{a.user} · {a.server} {a.file ? `· ${a.file}` : ""}</div>
                  </div>
                  <div className="activity-time">{a.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
