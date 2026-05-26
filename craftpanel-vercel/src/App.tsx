import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { selectIsAuthenticated } from './store/selectors';
import Layout from './components/Layout/Layout';
import Notification from './components/Notification/Notification';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Servers from './pages/Servers/Servers';
import ServerDetail from './pages/ServerDetail/ServerDetail';
import Activity from './pages/Activity/Activity';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAppSelector(selectIsAuthenticated);
  return auth ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Notification />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="servers" element={<Servers />} />
          <Route path="servers/:id" element={<ServerDetail />} />
          <Route path="activity" element={<Activity />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
