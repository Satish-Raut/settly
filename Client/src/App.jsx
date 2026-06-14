import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useSelector } from 'react-redux';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ImportWizard from './pages/ImportWizard';
import NotFound from './pages/NotFound';

// ─── Protected Route Wrapper ──────────────────────────────────────────────────
// Redirects unauthenticated users to /login while preserving the target URL.
const ProtectedRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// ─── Router Definition ─────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Auth />,
  },
  {
    path: '/signup',
    element: <Auth />,
  },
  // Protected routes — all children require authentication
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/import',
        element: <ImportWizard />,
      },
    ],
  },
  // 404 catch-all
  {
    path: '*',
    element: <NotFound />,
  },
]);

// ─── App Root ─────────────────────────────────────────────────────────────────
const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
