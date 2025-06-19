import { createHashRouter, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import ChromaPage from '../pages/ChromaPage/ChromaPage';
import LoginPage from '../pages/LoginPage/LoginPage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import NoPage from '../pages/NoPage';

export const router = createHashRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: <Navigate to="/chroma" replace />, // Redirect root to chroma page
      },
      {
        path: "/chroma",
        element: <ChromaPage />,
      },
      {
        path: "/profile",
        element: <ProfilePage />,
      },
      // Future routes can be added here:
      // {
      //   path: "/settings",
      //   element: <SettingsPage />,
      // },
      // {
      //   path: "/stats",
      //   element: <StatsPage />,
      // },
      {
        path: "*",
        element: <NoPage />,
      },
    ],
  },
  // Public login route
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
