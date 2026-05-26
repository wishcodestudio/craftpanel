import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { craftpanelApi } from './api/craftpanelApi';

// RTK Query result selectors
const selectServersQueryResult = craftpanelApi.endpoints.getServers.select();

const selectAllServers = createSelector(
  (state: RootState) => selectServersQueryResult(state),
  (result) => result.data ?? []
);

export const selectOnlineServers = createSelector(
  selectAllServers,
  (servers) => servers.filter((s) => s.status === 'online')
);

export const selectOfflineServers = createSelector(
  selectAllServers,
  (servers) => servers.filter((s) => s.status === 'offline')
);

export const selectTotalPlayers = createSelector(
  selectOnlineServers,
  (online) => online.reduce((sum, s) => sum + s.players, 0)
);

export const selectServerStats = createSelector(
  selectAllServers,
  selectOnlineServers,
  selectTotalPlayers,
  (all, online, totalPlayers) => ({
    total: all.length,
    online: online.length,
    offline: all.length - online.length,
    totalPlayers,
  })
);

export const selectServersByGroup = createSelector(
  selectAllServers,
  (_state: RootState, groupId: string) => groupId,
  (servers, groupId) => servers.filter((s) => s.groupId === groupId)
);

// Auth selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectToken = (state: RootState) => state.auth.token;

// UI selectors
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectNotification = (state: RootState) => state.ui.notification;
