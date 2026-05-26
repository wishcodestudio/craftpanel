import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  Server, ServerGroup, ActivityEntry, FileEntry, FileContent,
  AuthResponse, LoginCredentials, CreateServerPayload, UpdateServerPayload,
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
  tagTypes: ['Server', 'Activity', 'File', 'Group'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (creds) => ({ url: '/auth/login', method: 'POST', body: creds }),
    }),

    // Groups
    getGroups: builder.query<ServerGroup[], void>({
      query: () => '/groups',
      providesTags: ['Group'],
    }),

    // Servers — full CRUD
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

    // Activity
    getActivity: builder.query<ActivityEntry[], string | void>({
      query: (serverId) => (serverId ? `/activity?serverId=${serverId}` : '/activity'),
      providesTags: [{ type: 'Activity', id: 'LIST' }],
    }),

    createActivity: builder.mutation<ActivityEntry, Omit<ActivityEntry, 'id' | 'createdAt'>>({
      query: (body) => ({ url: '/activity', method: 'POST', body }),
      invalidatesTags: [{ type: 'Activity', id: 'LIST' }],
    }),

    // Files — CRUD (no full update; overwrite via create with same name)
    getFiles: builder.query<FileEntry[], string>({
      query: (serverId) => `/files?serverId=${serverId}`,
      providesTags: [{ type: 'File', id: 'LIST' }],
    }),

    getFileContent: builder.query<FileContent, string>({
      query: (path) => `/files/content?path=${encodeURIComponent(path)}`,
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
  useGetActivityQuery,
  useCreateActivityMutation,
  useGetFilesQuery,
  useGetFileContentQuery,
  useCreateFileMutation,
  useDeleteFileMutation,
} = craftpanelApi;
