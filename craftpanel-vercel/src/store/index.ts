import { configureStore } from '@reduxjs/toolkit';
import { craftpanelApi } from './api/craftpanelApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [craftpanelApi.reducerPath]: craftpanelApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(craftpanelApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
