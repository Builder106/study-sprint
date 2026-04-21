import { Navigate } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-500 flex items-center justify-center">
        <div className="text-xs font-bold uppercase tracking-widest">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
