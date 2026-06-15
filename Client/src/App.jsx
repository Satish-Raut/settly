import React, { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentUser, fetchAllUsers } from './store/slices/authSlice';
import { fetchGroups } from './store/slices/groupsSlice';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import ImportWizard from './pages/ImportWizard';
import Profile from './pages/Profile';
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
        path: '/groups',
        element: <Groups />,
      },
      {
        path: '/import',
        element: <ImportWizard />,
      },
      {
        path: '/profile',
        element: <Profile />,
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
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
      dispatch(fetchGroups());
      dispatch(fetchAllUsers());
    }
  }, [token, dispatch]);

  return <RouterProvider router={router} />;
};

export default App;
