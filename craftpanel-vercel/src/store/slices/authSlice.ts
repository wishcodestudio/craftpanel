import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: sessionStorage.getItem('cp_token'),
  user: (() => {
    try { return JSON.parse(sessionStorage.getItem('cp_user') ?? 'null'); }
    catch { return null; }
  })(),
  isAuthenticated: !!sessionStorage.getItem('cp_token'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      sessionStorage.setItem('cp_token', action.payload.token);
      sessionStorage.setItem('cp_user', JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      sessionStorage.removeItem('cp_token');
      sessionStorage.removeItem('cp_user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
