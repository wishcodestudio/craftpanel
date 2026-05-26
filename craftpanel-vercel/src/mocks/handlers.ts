import { http, HttpResponse, delay } from 'msw';
import {
  mockServers, mockGroups, mockActivity, mockFiles,
  fileContentStore, mockPlayers, mockBackups, mockUsers,
} from './data';
import type { Server, ActivityEntry, FileEntry, Player, Backup, AppUser, AIAnalysis } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

// ── Mutable in-memory state ────────────────────────────────────────────────
let servers = [...mockServers];
let activities = [...mockActivity];
const fileStore: Record<string, FileEntry[]> = Object.fromEntries(
  Object.entries(mockFiles).map(([k, v]) => [k, [...v]])
);
const playerStore: Record<string, Player[]> = Object.fromEntries(
  Object.entries(mockPlayers).map(([k, v]) => [k, [...v]])
);
const backupStore: Record<string, Backup[]> = Object.fromEntries(
  Object.entries(mockBackups).map(([k, v]) => [k, [...v]])
);
let users = [...mockUsers];

let _id = 100;
const uid = () => String(++_id);

// ── AI pattern-matched analysis ───────────────────────────────────────────
function analyzeLog(log: string): AIAnalysis {
  const lower = log.toLowerCase();

  if (lower.includes('outofmemoryerror') || lower.includes('java heap space') || lower.includes('gc overhead')) {
    return {
      summary: 'Java OutOfMemoryError — JVM heap exhausted',
      severity: 'critical',
      rootCause: 'The JVM maximum heap (-Xmx) is too small for current load. The garbage collector is spending more than 98% of its time reclaiming memory.',
      fixes: [
        { type: 'jvm', description: 'Increase max heap allocation', action: '-Xmx6G -Xms4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200' },
        { type: 'config', description: 'Reduce view-distance to lower memory pressure', file: 'server.properties', key: 'view-distance', value: '8' },
        { type: 'config', description: 'Reduce simulation-distance', file: 'server.properties', key: 'simulation-distance', value: '8' },
        { type: 'plugin', description: 'Audit plugins for memory leaks — check WorldEdit, WorldGuard region counts' },
      ],
      prevention: 'Set up JVM monitoring with -verbose:gc and alert when heap usage exceeds 80%. Consider upgrading to Paper/Purpur for better memory management.',
      confidence: 97,
    };
  }

  if (lower.includes('ticking entity') || lower.includes('ticking block entity') || lower.includes('entity is not in whitelist') || lower.includes('nullpointerexception')) {
    return {
      summary: 'Entity/block entity crash — likely a corrupt entity or plugin conflict',
      severity: 'high',
      rootCause: 'A ticking entity or block entity threw an unhandled exception. This is often caused by a corrupt entity saved in the world file or an incompatible plugin version.',
      fixes: [
        { type: 'rcon', description: 'Kill all entities in the affected area', action: 'execute in minecraft:overworld run kill @e[type=!player,distance=..50]' },
        { type: 'plugin', description: 'Update or disable the plugin responsible for the entity type shown in the stack trace' },
        { type: 'file', description: 'Use NBT Explorer to remove corrupt entities from region files', file: 'world/region/r.X.Z.mca' },
      ],
      prevention: 'Use Paper fork for its entity tick watchdog. Set entity-activation-range values to reduce tick load on distant entities.',
      confidence: 88,
    };
  }

  if (lower.includes('can\'t keep up') || lower.includes("can't keep up") || lower.includes('tps') || lower.includes('lag') || lower.includes('behind')) {
    return {
      summary: 'Server TPS degradation — tick loop falling behind',
      severity: 'medium',
      rootCause: 'The server is processing more work per tick than the 20 TPS target allows (50ms/tick). Common causes: excessive entity count, chunk loading storms, or inefficient plugins.',
      fixes: [
        { type: 'config', description: 'Reduce entity spawn rates', file: 'spigot.yml', key: 'mob-spawn-range', value: '4' },
        { type: 'config', description: 'Enable async chunk loading (Paper)', file: 'paper.yml', key: 'async-chunks.enable', value: 'true' },
        { type: 'config', description: 'Reduce max-tick-time to force entity timeout', file: 'server.properties', key: 'max-tick-time', value: '60000' },
        { type: 'rcon', description: 'Check entity counts per chunk', action: 'paper entity list' },
        { type: 'jvm', description: 'Use Aikar JVM flags for G1GC tuning', action: '-Xmx8G -Xms8G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC' },
      ],
      prevention: 'Install Spark profiler to identify the exact hotspot. Set up TPS monitoring and alert below 18 TPS.',
      confidence: 82,
    };
  }

  if (lower.includes('connection refused') || lower.includes('failed to bind') || lower.includes('address already in use')) {
    return {
      summary: 'Port binding failure — server cannot open network socket',
      severity: 'high',
      rootCause: 'The configured port is already occupied by another process, or the server lacks permission to bind to the port.',
      fixes: [
        { type: 'system', description: 'Find the process using port 25565', action: 'netstat -tulnp | grep 25565' },
        { type: 'config', description: 'Change server port to an available one', file: 'server.properties', key: 'server-port', value: '25566' },
        { type: 'system', description: 'Ensure port is open in firewall', action: 'ufw allow 25565/tcp' },
      ],
      prevention: 'Use a process manager (systemd/pm2) to prevent duplicate server instances from starting.',
      confidence: 95,
    };
  }

  if (lower.includes('plugin') || lower.includes('classnotfound') || lower.includes('nosuchmethoderror')) {
    return {
      summary: 'Plugin compatibility error — class or method missing',
      severity: 'high',
      rootCause: 'A plugin was compiled for a different server API version. This causes ClassNotFoundException or NoSuchMethodError at runtime.',
      fixes: [
        { type: 'plugin', description: 'Download the correct plugin version for your server (check plugin page for 1.21.x compatibility)' },
        { type: 'plugin', description: 'Check plugin.yml for api-version field and ensure it matches your server' },
        { type: 'file', description: 'Move suspect plugin out of plugins/ to isolate the issue', file: 'plugins/SuspectPlugin.jar' },
      ],
      prevention: 'Test plugin updates on a staging server before applying to production. Subscribe to plugin update notifications.',
      confidence: 79,
    };
  }

  if (lower.includes('world corruption') || lower.includes('corrupt') || lower.includes('invalid chunk') || lower.includes('corrupted')) {
    return {
      summary: 'World data corruption detected',
      severity: 'critical',
      rootCause: 'Region files contain invalid or corrupted chunk data. This can happen after ungraceful shutdowns (power loss, OOM kill) or disk I/O errors.',
      fixes: [
        { type: 'rcon', description: 'Force save all chunks before any action', action: 'save-all flush' },
        { type: 'system', description: 'Run MCAselector to detect and delete corrupt chunks', action: 'java -jar mcaselector.jar --mode delete --world world/ --output corrupt_chunks.csv' },
        { type: 'file', description: 'Restore from the most recent clean backup', file: 'backups/' },
      ],
      prevention: 'Use UPS for server hardware. Enable noatime on server filesystem. Implement automated hourly backups with rsync.',
      confidence: 91,
    };
  }

  // Generic fallback
  return {
    summary: 'General server log analysis — multiple potential issues detected',
    severity: 'low',
    rootCause: 'The log does not match a known critical error pattern. This may be informational output or a non-critical warning worth monitoring.',
    fixes: [
      { type: 'config', description: 'Review server.properties for recommended settings for your version' },
      { type: 'jvm', description: 'Apply Aikar\'s recommended JVM flags for stability', action: '-Xmx4G -Xms4G -XX:+UseG1GC -XX:G1HeapRegionSize=8M' },
      { type: 'plugin', description: 'Ensure all plugins are updated to their latest stable release' },
    ],
    prevention: 'Set up regular log monitoring with grep alerts for ERROR and WARN patterns. Review weekly.',
    confidence: 45,
  };
}

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(600);
    const body = await request.json() as { username: string; password: string };
    if (body.username === 'admin' && body.password === 'admin') {
      return HttpResponse.json({
        token: 'mock-jwt-token-craftpanel',
        user: { id: 'u1', username: 'admin', name: 'Administrator', role: 'admin' },
      });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  // ── Groups ────────────────────────────────────────────────────────────────
  http.get(`${BASE}/groups`, async () => {
    await delay(150);
    return HttpResponse.json(mockGroups);
  }),

  // ── Servers ───────────────────────────────────────────────────────────────
  http.get(`${BASE}/servers`, async () => {
    await delay(300);
    return HttpResponse.json(servers);
  }),

  http.get(`${BASE}/servers/:id`, async ({ params }) => {
    await delay(200);
    const found = servers.find(s => s.id === params.id);
    if (!found) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${BASE}/servers`, async ({ request }) => {
    await delay(500);
    const body = await request.json() as Omit<Server, 'id' | 'status' | 'players' | 'createdAt'>;
    const created: Server = { ...body, id: uid(), status: 'offline', players: 0, createdAt: new Date().toISOString() };
    servers = [...servers, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${BASE}/servers/:id`, async ({ request, params }) => {
    await delay(400);
    const body = await request.json() as Partial<Server>;
    const idx = servers.findIndex(s => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    servers = servers.map((s, i) => (i === idx ? { ...s, ...body } : s));
    return HttpResponse.json(servers.find(s => s.id === params.id));
  }),

  http.delete(`${BASE}/servers/:id`, async ({ params }) => {
    await delay(300);
    if (!servers.find(s => s.id === params.id))
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    servers = servers.filter(s => s.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Server Controls ───────────────────────────────────────────────────────
  http.post(`${BASE}/servers/:id/start`, async ({ params }) => {
    await delay(2500);
    const idx = servers.findIndex(s => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    const online = Math.floor(Math.random() * 5) + 1;
    servers = servers.map((s, i) => i === idx ? { ...s, status: 'online', players: online } : s);
    return HttpResponse.json(servers[idx]);
  }),

  http.post(`${BASE}/servers/:id/stop`, async ({ params }) => {
    await delay(1800);
    const idx = servers.findIndex(s => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    servers = servers.map((s, i) => i === idx ? { ...s, status: 'offline', players: 0 } : s);
    return HttpResponse.json(servers[idx]);
  }),

  http.post(`${BASE}/servers/:id/restart`, async ({ params }) => {
    await delay(4000);
    const idx = servers.findIndex(s => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    const online = Math.floor(Math.random() * 5) + 1;
    servers = servers.map((s, i) => i === idx ? { ...s, status: 'online', players: online } : s);
    return HttpResponse.json(servers[idx]);
  }),

  // ── Server Stats ──────────────────────────────────────────────────────────
  http.get(`${BASE}/servers/:id/stats`, async ({ params }) => {
    await delay(100);
    const server = servers.find(s => s.id === params.id);
    const online = server?.status === 'online';
    return HttpResponse.json({
      serverId: params.id,
      cpu: online ? Math.random() * 40 + 10 : 0,
      ramUsed: online ? Math.random() * 2 + 1 : 0,
      ramTotal: 4,
      tps: online ? Math.random() * 1.5 + 18.5 : 0,
      uptime: online ? Math.floor(Math.random() * 86400) : 0,
      timestamp: new Date().toISOString(),
    });
  }),

  // ── Players ───────────────────────────────────────────────────────────────
  http.get(`${BASE}/servers/:id/players`, async ({ params }) => {
    await delay(200);
    const server = servers.find(s => s.id === params.id);
    if (server?.status !== 'online') return HttpResponse.json([]);
    return HttpResponse.json(playerStore[params.id as string] ?? []);
  }),

  http.post(`${BASE}/servers/:id/kick`, async ({ request, params }) => {
    await delay(300);
    const body = await request.json() as { username: string; reason?: string };
    const sid = params.id as string;
    playerStore[sid] = (playerStore[sid] ?? []).filter(p => p.username !== body.username);
    return HttpResponse.json({ success: true, message: `Kicked ${body.username}` });
  }),

  // ── Console command ───────────────────────────────────────────────────────
  http.post(`${BASE}/servers/:id/command`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as { command: string };
    const cmd = body.command.trim().toLowerCase().split(' ')[0];
    const responses: Record<string, string> = {
      list: 'There are 2 of a max of 50 players online: Steve, Alex',
      tps: 'TPS from last 1m, 5m, 15m: 19.87, 19.93, 19.95',
      help: 'For help, see https://minecraft.wiki/w/Commands. Type /help <command> for details.',
      time: 'The time is 6000',
      weather: 'Weather changed to clear.',
      gamemode: 'Set own game mode to Survival Mode',
      save: 'Saved the game.',
      difficulty: 'The difficulty has been set to Normal',
      seed: 'Seed: [8765432198765432]',
      version: 'This server is running CraftBukkit version git-Paper-1.21.1 (MC: 1.21.1)',
    };
    const output = responses[cmd] ?? `Unknown command. Type "/help" for a list of commands.`;
    return HttpResponse.json({ command: body.command, output, timestamp: new Date().toISOString() });
  }),

  // ── Backups ───────────────────────────────────────────────────────────────
  http.get(`${BASE}/servers/:id/backups`, async ({ params }) => {
    await delay(300);
    return HttpResponse.json(backupStore[params.id as string] ?? []);
  }),

  http.post(`${BASE}/servers/:id/backups`, async ({ params }) => {
    await delay(1500);
    const sid = params.id as string;
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backup: Backup = {
      id: uid(), serverId: sid,
      name: `manual-${date}`, size: '256 MB',
      createdAt: new Date().toISOString(), status: 'complete',
    };
    backupStore[sid] = [...(backupStore[sid] ?? []), backup];
    return HttpResponse.json(backup, { status: 201 });
  }),

  http.delete(`${BASE}/servers/:id/backups/:backupId`, async ({ params }) => {
    await delay(400);
    const sid = params.id as string;
    backupStore[sid] = (backupStore[sid] ?? []).filter(b => b.id !== params.backupId);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Activity ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/activity`, async ({ request }) => {
    await delay(300);
    const serverId = new URL(request.url).searchParams.get('serverId');
    const result = serverId ? activities.filter(a => a.serverId === serverId) : activities;
    return HttpResponse.json(
      [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }),

  http.post(`${BASE}/activity`, async ({ request }) => {
    await delay(150);
    const body = await request.json() as Omit<ActivityEntry, 'id' | 'createdAt'>;
    const entry: ActivityEntry = { ...body, id: uid(), createdAt: new Date().toISOString() };
    activities = [entry, ...activities];
    return HttpResponse.json(entry, { status: 201 });
  }),

  // ── Files ─────────────────────────────────────────────────────────────────
  http.get(`${BASE}/files`, async ({ request }) => {
    await delay(250);
    const serverId = new URL(request.url).searchParams.get('serverId') ?? '';
    return HttpResponse.json(fileStore[serverId] ?? []);
  }),

  http.get(`${BASE}/files/content`, async ({ request }) => {
    await delay(200);
    const path = new URL(request.url).searchParams.get('path') ?? '';
    const content = fileContentStore[path] ?? `# ${path}\n`;
    return HttpResponse.json({ path, content });
  }),

  http.put(`${BASE}/files/content`, async ({ request }) => {
    await delay(350);
    const body = await request.json() as { path: string; content: string };
    fileContentStore[body.path] = body.content;
    // update size in fileStore
    for (const files of Object.values(fileStore)) {
      const f = files.find(x => x.path === body.path);
      if (f) { f.size = body.content.length; f.modified = new Date().toISOString(); }
    }
    return HttpResponse.json({ path: body.path, content: body.content });
  }),

  http.post(`${BASE}/files`, async ({ request }) => {
    await delay(400);
    const body = await request.json() as { serverId: string; name: string; content: string };
    const file: FileEntry = {
      name: body.name, path: body.name, type: 'file',
      size: body.content.length, modified: new Date().toISOString(),
    };
    fileStore[body.serverId] = [...(fileStore[body.serverId] ?? []), file];
    fileContentStore[body.name] = body.content;
    return HttpResponse.json(file, { status: 201 });
  }),

  http.delete(`${BASE}/files`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId') ?? '';
    const path = url.searchParams.get('path') ?? '';
    fileStore[serverId] = (fileStore[serverId] ?? []).filter(f => f.path !== path);
    delete fileContentStore[path];
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Users ─────────────────────────────────────────────────────────────────
  http.get(`${BASE}/users`, async () => {
    await delay(250);
    return HttpResponse.json(users);
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    await delay(500);
    const body = await request.json() as Omit<AppUser, 'id' | 'createdAt'>;
    const created: AppUser = { ...body, id: uid(), createdAt: new Date().toISOString() };
    users = [...users, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(`${BASE}/users/:id`, async ({ request, params }) => {
    await delay(400);
    const body = await request.json() as Partial<AppUser>;
    const idx = users.findIndex(u => u.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    users = users.map((u, i) => (i === idx ? { ...u, ...body } : u));
    return HttpResponse.json(users[idx]);
  }),

  http.delete(`${BASE}/users/:id`, async ({ params }) => {
    await delay(300);
    if (!users.find(u => u.id === params.id))
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    users = users.filter(u => u.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── AI Diagnostics ────────────────────────────────────────────────────────
  http.post(`${BASE}/ai/analyze`, async ({ request }) => {
    // Simulate AI "thinking" time
    await delay(2200);
    const body = await request.json() as { log: string; serverId?: string };
    const analysis: AIAnalysis = analyzeLog(body.log);
    return HttpResponse.json(analysis);
  }),
];
