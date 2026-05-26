export type ServerStatus = 'online' | 'offline' | 'starting' | 'stopping';
export type UserRole = 'admin' | 'operator';
export type FileType = 'file' | 'directory';

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

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
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
