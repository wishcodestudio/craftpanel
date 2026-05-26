import type { Server, ServerGroup, ActivityEntry, FileEntry, Player, Backup, AppUser } from '../types';

export const mockGroups: ServerGroup[] = [
  { id: 'g1', name: 'Production' },
  { id: 'g2', name: 'Development' },
  { id: 'g3', name: 'Testing' },
];

export const mockServers: Server[] = [
  {
    id: 's1', groupId: 'g1', name: 'SurvivalCraft', version: '1.21.1',
    status: 'online', ip: '192.168.1.10', port: 25565, rconPort: 25575,
    players: 12, maxPlayers: 50, ram: '4G', createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 's2', groupId: 'g1', name: 'CreativeHub', version: '1.21.1',
    status: 'online', ip: '192.168.1.11', port: 25565, rconPort: 25575,
    players: 5, maxPlayers: 20, ram: '2G', createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 's3', groupId: 'g2', name: 'DevTest-1.21', version: '1.21.1',
    status: 'offline', ip: '192.168.1.20', port: 25565, rconPort: 25575,
    players: 0, maxPlayers: 10, ram: '2G', createdAt: '2024-02-01T12:00:00Z',
  },
  {
    id: 's4', groupId: 'g3', name: 'QA-Server', version: '1.20.6',
    status: 'offline', ip: '192.168.1.30', port: 25565, rconPort: 25575,
    players: 0, maxPlayers: 5, ram: '1G', createdAt: '2024-02-10T09:00:00Z',
  },
];

export const mockActivity: ActivityEntry[] = [
  {
    id: 'a1', serverId: 's1', serverName: 'SurvivalCraft', userId: 'u1', username: 'admin',
    action: 'SERVER_START', detail: 'Server started successfully', createdAt: '2024-05-26T07:00:00Z',
  },
  {
    id: 'a2', serverId: 's1', serverName: 'SurvivalCraft', userId: 'u1', username: 'admin',
    action: 'FILE_EDIT', detail: 'Edited server.properties', createdAt: '2024-05-26T07:05:00Z',
  },
  {
    id: 'a3', serverId: 's2', serverName: 'CreativeHub', userId: 'u1', username: 'admin',
    action: 'SERVER_START', detail: 'Server started successfully', createdAt: '2024-05-26T07:10:00Z',
  },
  {
    id: 'a4', serverId: 's1', serverName: 'SurvivalCraft', userId: 'u2', username: 'operator1',
    action: 'RCON_COMMAND', detail: 'Executed: say Welcome back players!', createdAt: '2024-05-26T08:00:00Z',
  },
  {
    id: 'a5', serverId: 's3', serverName: 'DevTest-1.21', userId: 'u1', username: 'admin',
    action: 'SERVER_STOP', detail: 'Server stopped gracefully', createdAt: '2024-05-25T20:00:00Z',
  },
  {
    id: 'a6', serverId: 's2', serverName: 'CreativeHub', userId: 'u1', username: 'admin',
    action: 'FILE_DELETE', detail: 'Deleted old-world-backup.zip', createdAt: '2024-05-25T15:00:00Z',
  },
];

export const mockPlayers: Record<string, Player[]> = {
  s1: [
    { username: 'Steve', uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', joinedAt: '2024-05-26T07:30:00Z', ip: '10.0.0.5', ping: 42, gamemode: 'survival' },
    { username: 'Alex', uuid: '8667ba71-b85a-4004-af54-457a9734eed7', joinedAt: '2024-05-26T07:45:00Z', ip: '10.0.0.6', ping: 18, gamemode: 'survival' },
    { username: 'Notch', uuid: '069a79f4-44e9-4726-a5be-fca90e38aa11', joinedAt: '2024-05-26T08:00:00Z', ip: '10.0.0.7', ping: 5, gamemode: 'creative' },
  ],
  s2: [
    { username: 'Herobrine', uuid: 'f84c6a84-0f5d-4b6e-9b8d-1a2b3c4d5e6f', joinedAt: '2024-05-26T07:55:00Z', ip: '10.0.0.8', ping: 31, gamemode: 'creative' },
    { username: 'CraftMaster', uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', joinedAt: '2024-05-26T08:10:00Z', ip: '10.0.0.9', ping: 24, gamemode: 'creative' },
  ],
};

export const mockBackups: Record<string, Backup[]> = {
  s1: [
    { id: 'b1', serverId: 's1', name: 'auto-2024-05-26-07-00', size: '1.2 GB', createdAt: '2024-05-26T07:00:00Z', status: 'complete' },
    { id: 'b2', serverId: 's1', name: 'auto-2024-05-25-07-00', size: '1.1 GB', createdAt: '2024-05-25T07:00:00Z', status: 'complete' },
    { id: 'b3', serverId: 's1', name: 'manual-before-update', size: '1.0 GB', createdAt: '2024-05-24T15:30:00Z', status: 'complete' },
  ],
  s2: [
    { id: 'b4', serverId: 's2', name: 'auto-2024-05-26-07-00', size: '512 MB', createdAt: '2024-05-26T07:00:00Z', status: 'complete' },
  ],
};

export const mockUsers: AppUser[] = [
  { id: 'u1', username: 'admin', name: 'Administrator', role: 'admin', createdAt: '2024-01-01T00:00:00Z', groupIds: ['g1', 'g2', 'g3'] },
  { id: 'u2', username: 'operator1', name: 'Operator One', role: 'operator', createdAt: '2024-01-10T00:00:00Z', groupIds: ['g1'] },
  { id: 'u3', username: 'devuser', name: 'Dev User', role: 'operator', createdAt: '2024-02-05T00:00:00Z', groupIds: ['g2'] },
];

export const mockFiles: Record<string, FileEntry[]> = {
  s1: [
    { name: 'server.properties', path: 'server.properties', type: 'file', size: 1024, modified: '2024-05-26T07:05:00Z' },
    { name: 'ops.json', path: 'ops.json', type: 'file', size: 256, modified: '2024-05-20T12:00:00Z' },
    { name: 'plugins', path: 'plugins', type: 'directory', size: 0, modified: '2024-05-26T07:00:00Z' },
    { name: 'world', path: 'world', type: 'directory', size: 0, modified: '2024-05-26T08:00:00Z' },
    { name: 'eula.txt', path: 'eula.txt', type: 'file', size: 128, modified: '2024-01-15T08:00:00Z' },
    { name: 'whitelist.json', path: 'whitelist.json', type: 'file', size: 64, modified: '2024-05-10T10:00:00Z' },
  ],
  s2: [
    { name: 'server.properties', path: 'server.properties', type: 'file', size: 1024, modified: '2024-05-26T07:00:00Z' },
    { name: 'ops.json', path: 'ops.json', type: 'file', size: 128, modified: '2024-05-15T10:00:00Z' },
    { name: 'plugins', path: 'plugins', type: 'directory', size: 0, modified: '2024-05-26T07:00:00Z' },
    { name: 'eula.txt', path: 'eula.txt', type: 'file', size: 128, modified: '2024-01-20T10:00:00Z' },
  ],
  s3: [
    { name: 'server.properties', path: 'server.properties', type: 'file', size: 1024, modified: '2024-02-01T12:00:00Z' },
    { name: 'eula.txt', path: 'eula.txt', type: 'file', size: 128, modified: '2024-02-01T12:00:00Z' },
  ],
};

export const mockFileContents: Record<string, string> = {
  'server.properties': `#Minecraft server properties
server-port=25565
max-players=50
online-mode=true
level-name=world
gamemode=survival
difficulty=normal
pvp=true
spawn-protection=16
view-distance=10
simulation-distance=10
max-tick-time=60000
network-compression-threshold=256
`,
  'ops.json': `[
  {
    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    "name": "Notch",
    "level": 4,
    "bypassesPlayerLimit": false
  }
]`,
  'eula.txt': `#By changing the setting below to TRUE you are indicating your agreement to our EULA.
#https://aka.ms/MinecraftEULA
eula=true`,
  'whitelist.json': `[
  {
    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    "name": "Notch"
  },
  {
    "uuid": "8667ba71-b85a-4004-af54-457a9734eed7",
    "name": "Alex"
  }
]`,
};

// Mutable content store so writes persist within session
export const fileContentStore: Record<string, string> = { ...mockFileContents };
