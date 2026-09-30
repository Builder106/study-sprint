import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from './LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to='/' replace />;
  return <>{children}</>;
}
