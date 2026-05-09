import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import UserManagementPage from './pages/admin/UserManagementPage';
import PropertyListPage from './pages/PropertyListPage';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Main Authenticated Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/properties" replace />} />
        <Route path="properties" element={<PropertyListPage />} />

        {/* Admin only sub-routes */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="admin/users" element={<UserManagementPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
