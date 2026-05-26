import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  sidebarOpen: boolean;
  notification: Notification | null;
}

const initialState: UIState = {
  sidebarOpen: true,
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    showNotification(state, action: PayloadAction<Notification>) {
      state.notification = action.payload;
    },
    clearNotification(state) {
      state.notification = null;
    },
  },
});

export const { toggleSidebar, showNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
