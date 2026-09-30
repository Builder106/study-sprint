import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, Outlet, useNavigation, useParams } from 'react-router';
import { Landing } from './components/Landing';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoadingScreen } from './components/shared/LoadingScreen';

function RedirectToGoal() {
  const { id } = useParams();
  return <Navigate to={`/goal/${id}`} replace />;
}

function authenticated(Component: ComponentType) {
  return function AuthenticatedPage() {
    return <ProtectedRoute><Component /></ProtectedRoute>;
  };
}

function RouteLoading() {
  return <LoadingScreen />;
}

// HydrateFallback (below) only covers the initial hydration of a deep link.
// This covers ordinary in-app navigation to a lazy route.
function RootLayout() {
  const navigation = useNavigation();
  if (navigation.state === 'loading') return <LoadingScreen />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { index: true, Component: Landing },
      {
        path: 'guest',
        HydrateFallback: RouteLoading,
        lazy: async () => ({ Component: (await import('./components/GuestStudy')).GuestStudy }),
      },
      {
        path: 'login',
        HydrateFallback: RouteLoading,
        lazy: async () => ({ Component: (await import('./components/Login')).Login }),
      },
      // Retain /signin as an alias for direct sign-in routing.
      { path: 'signin', element: <Navigate to='/login' replace /> },
      {
        path: 'register',
        HydrateFallback: RouteLoading,
        lazy: async () => ({ Component: (await import('./components/Register')).Register }),
      },
      {
        path: 'dashboard',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/Dashboard')).Dashboard),
        }),
      },
      {
        path: 'goals/new',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/NewGoal')).NewGoal),
        }),
      },
      {
        path: 'goal/:id',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated(
            (await import('./components/GoalDetailWithPanel')).GoalDetailWithPanel,
          ),
        }),
      },
      { path: 'goal/:id/details', element: <RedirectToGoal /> },
      {
        path: 'analytics',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/Analytics')).Analytics),
        }),
      },
      {
        path: 'garden',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/Garden')).Garden),
        }),
      },
      {
        path: 'community',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/Community')).Community),
        }),
      },
      {
        path: 'rooms/:slug',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/StudyRoom')).StudyRoom),
        }),
      },
      {
        path: 'u/:username',
        HydrateFallback: RouteLoading,
        lazy: async () => ({ Component: (await import('./components/PublicProfile')).PublicProfile }),
      },
      {
        path: 'privacy',
        HydrateFallback: RouteLoading,
        lazy: async () => ({ Component: (await import('./components/Privacy')).Privacy }),
      },
      {
        path: 'terms',
        HydrateFallback: RouteLoading,
        lazy: async () => ({ Component: (await import('./components/Terms')).Terms }),
      },
      {
        path: 'settings',
        HydrateFallback: RouteLoading,
        lazy: async () => ({
          Component: authenticated((await import('./components/Settings')).Settings),
        }),
      },
    ],
  },
]);
