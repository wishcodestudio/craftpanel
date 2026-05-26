export type ServerStatus = 'online' | 'offline' | 'starting' | 'stopping';
export type UserRole = 'admin' | 'operator';
export type FileType = 'file' | 'directory';
export type AISeverity = 'low' | 'medium' | 'high' | 'critical';
export type BackupStatus = 'complete' | 'in_progress' | 'failed';
export type GameMode = 'survival' | 'creative' | 'adventure' | 'spectator';

export interface Server {
  id: string;
  groupId: string;
  name: string;
  version: string;
  status: ServerStatus;
  ip: string;
  port: number;
  rconPort: number;
  players: number;
  maxPlayers: number;
  ram: string;
  createdAt: string;
}

export interface ServerStats {
  serverId: string;
  cpu: number;
  ramUsed: number;
  ramTotal: number;
  tps: number;
  uptime: number;
  timestamp: string;
}

export interface ServerGroup {
  id: string;
  name: string;
}

export interface ActivityEntry {
  id: string;
  serverId: string;
  serverName: string;
  userId: string;
  username: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: FileType;
  size: number;
  modified: string;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface Player {
  username: string;
  uuid: string;
  joinedAt: string;
  ip: string;
  ping: number;
  gamemode: GameMode;
}

export interface Backup {
  id: string;
  serverId: string;
  name: string;
  size: string;
  createdAt: string;
  status: BackupStatus;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface AppUser extends User {
  createdAt: string;
  groupIds: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateServerPayload {
  name: string;
  version: string;
  ip: string;
  port: number;
  rconPort: number;
  maxPlayers: number;
  ram: string;
  groupId: string;
}

export type UpdateServerPayload = Partial<CreateServerPayload> & { id: string };

export interface CreateUserPayload {
  username: string;
  name: string;
  password: string;
  role: UserRole;
  groupIds: string[];
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'password'>> & {
  id: string;
  password?: string;
};

export interface AIFix {
  type: 'jvm' | 'config' | 'plugin' | 'rcon' | 'file' | 'system';
  description: string;
  action?: string;
  file?: string;
  key?: string;
  value?: string;
}

export interface AIAnalysis {
  summary: string;
  severity: AISeverity;
  rootCause: string;
  fixes: AIFix[];
  prevention: string;
  confidence: number;
}

export interface ConsoleCommandResult {
  command: string;
  output: string;
  timestamp: string;
}
