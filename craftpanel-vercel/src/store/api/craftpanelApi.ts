import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  Server, ServerGroup, ServerStats, ActivityEntry, FileEntry, FileContent,
  Player, Backup, AppUser, AuthResponse, LoginCredentials,
  CreateServerPayload, UpdateServerPayload,
  CreateUserPayload, UpdateUserPayload,
  AIAnalysis, ConsoleCommandResult,
} from '../../types';

export const craftpanelApi = createApi({
  reducerPath: 'craftpanelApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Server', 'Activity', 'File', 'Group', 'Player', 'Backup', 'AppUser'],
  endpoints: (builder) => ({
    // ── Auth ────────────────────────────────────────────────────────────────
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (creds) => ({ url: '/auth/login', method: 'POST', body: creds }),
    }),

    // ── Groups ───────────────────────────────────────────────────────────────
    getGroups: builder.query<ServerGroup[], void>({
      query: () => '/groups',
      providesTags: ['Group'],
    }),

    // ── Servers — full CRUD ──────────────────────────────────────────────────
    getServers: builder.query<Server[], void>({
      query: () => '/servers',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Server' as const, id })), { type: 'Server', id: 'LIST' }]
          : [{ type: 'Server', id: 'LIST' }],
    }),

    getServer: builder.query<Server, string>({
      query: (id) => `/servers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Server', id }],
    }),

    createServer: builder.mutation<Server, CreateServerPayload>({
      query: (body) => ({ url: '/servers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Server', id: 'LIST' }],
    }),

    updateServer: builder.mutation<Server, UpdateServerPayload>({
      query: ({ id, ...body }) => ({ url: `/servers/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Server', id }, { type: 'Server', id: 'LIST' }],
    }),

    deleteServer: builder.mutation<void, string>({
      query: (id) => ({ url: `/servers/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Server', id }, { type: 'Server', id: 'LIST' }],
    }),

    // ── Server Controls (with optimistic status updates) ────────────────────
    startServer: builder.mutation<Server, string>({
      query: (id) => ({ url: `/servers/${id}/start`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Server', id }, { type: 'Server', id: 'LIST' }],
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          craftpanelApi.util.updateQueryData('getServer', id, (draft) => { draft.status = 'starting'; })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),

    stopServer: builder.mutation<Server, string>({
      query: (id) => ({ url: `/servers/${id}/stop`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Server', id }, { type: 'Server', id: 'LIST' }],
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          craftpanelApi.util.updateQueryData('getServer', id, (draft) => { draft.status = 'stopping'; })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),

    restartServer: builder.mutation<Server, string>({
      query: (id) => ({ url: `/servers/${id}/restart`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Server', id }, { type: 'Server', id: 'LIST' }],
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          craftpanelApi.util.updateQueryData('getServer', id, (draft) => { draft.status = 'stopping'; })
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),

    // ── Stats ────────────────────────────────────────────────────────────────
    getServerStats: builder.query<ServerStats, string>({
      query: (id) => `/servers/${id}/stats`,
    }),

    // ── Players ──────────────────────────────────────────────────────────────
    getPlayers: builder.query<Player[], string>({
      query: (id) => `/servers/${id}/players`,
      providesTags: [{ type: 'Player', id: 'LIST' }],
    }),

    kickPlayer: builder.mutation<{ success: boolean; message: string }, { serverId: string; username: string; reason?: string }>({
      query: ({ serverId, ...body }) => ({ url: `/servers/${serverId}/kick`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
    }),

    // ── Console ───────────────────────────────────────────────────────────────
    runCommand: builder.mutation<ConsoleCommandResult, { serverId: string; command: string }>({
      query: ({ serverId, command }) => ({ url: `/servers/${serverId}/command`, method: 'POST', body: { command } }),
    }),

    // ── Backups ───────────────────────────────────────────────────────────────
    getBackups: builder.query<Backup[], string>({
      query: (id) => `/servers/${id}/backups`,
      providesTags: [{ type: 'Backup', id: 'LIST' }],
    }),

    createBackup: builder.mutation<Backup, string>({
      query: (id) => ({ url: `/servers/${id}/backups`, method: 'POST' }),
      invalidatesTags: [{ type: 'Backup', id: 'LIST' }],
    }),

    deleteBackup: builder.mutation<void, { serverId: string; backupId: string }>({
      query: ({ serverId, backupId }) => ({ url: `/servers/${serverId}/backups/${backupId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Backup', id: 'LIST' }],
    }),

    // ── Activity ─────────────────────────────────────────────────────────────
    getActivity: builder.query<ActivityEntry[], string | void>({
      query: (serverId) => (serverId ? `/activity?serverId=${serverId}` : '/activity'),
      providesTags: [{ type: 'Activity', id: 'LIST' }],
    }),

    createActivity: builder.mutation<ActivityEntry, Omit<ActivityEntry, 'id' | 'createdAt'>>({
      query: (body) => ({ url: '/activity', method: 'POST', body }),
      invalidatesTags: [{ type: 'Activity', id: 'LIST' }],
    }),

    // ── Files ─────────────────────────────────────────────────────────────────
    getFiles: builder.query<FileEntry[], string>({
      query: (serverId) => `/files?serverId=${serverId}`,
      providesTags: [{ type: 'File', id: 'LIST' }],
    }),

    getFileContent: builder.query<FileContent, string>({
      query: (path) => `/files/content?path=${encodeURIComponent(path)}`,
    }),

    writeFileContent: builder.mutation<FileContent, { path: string; content: string }>({
      query: (body) => ({ url: '/files/content', method: 'PUT', body }),
      invalidatesTags: [{ type: 'File', id: 'LIST' }],
    }),

    createFile: builder.mutation<FileEntry, { serverId: string; name: string; content: string }>({
      query: (body) => ({ url: '/files', method: 'POST', body }),
      invalidatesTags: [{ type: 'File', id: 'LIST' }],
    }),

    deleteFile: builder.mutation<void, { serverId: string; path: string }>({
      query: ({ serverId, path }) => ({
        url: `/files?serverId=${serverId}&path=${encodeURIComponent(path)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'File', id: 'LIST' }],
    }),

    // ── Users ─────────────────────────────────────────────────────────────────
    getUsers: builder.query<AppUser[], void>({
      query: () => '/users',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'AppUser' as const, id })), { type: 'AppUser', id: 'LIST' }]
          : [{ type: 'AppUser', id: 'LIST' }],
    }),

    createUser: builder.mutation<AppUser, CreateUserPayload>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'AppUser', id: 'LIST' }],
    }),

    updateUser: builder.mutation<AppUser, UpdateUserPayload>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AppUser', id }, { type: 'AppUser', id: 'LIST' }],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'AppUser', id }, { type: 'AppUser', id: 'LIST' }],
    }),

    // ── AI ────────────────────────────────────────────────────────────────────
    analyzeLog: builder.mutation<AIAnalysis, { log: string; serverId?: string }>({
      query: (body) => ({ url: '/ai/analyze', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetGroupsQuery,
  useGetServersQuery,
  useGetServerQuery,
  useCreateServerMutation,
  useUpdateServerMutation,
  useDeleteServerMutation,
  useStartServerMutation,
  useStopServerMutation,
  useRestartServerMutation,
  useGetServerStatsQuery,
  useGetPlayersQuery,
  useKickPlayerMutation,
  useRunCommandMutation,
  useGetBackupsQuery,
  useCreateBackupMutation,
  useDeleteBackupMutation,
  useGetActivityQuery,
  useCreateActivityMutation,
  useGetFilesQuery,
  useGetFileContentQuery,
  useWriteFileContentMutation,
  useCreateFileMutation,
  useDeleteFileMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useAnalyzeLogMutation,
} = craftpanelApi;
