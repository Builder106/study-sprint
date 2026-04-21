import { Link } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function TopNav({ right }: { right?: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <header className="px-8 py-6 flex justify-between items-center border-b border-white/10 sticky top-0 bg-[#0a0a0a] z-20">
      <Link
        to={user ? "/dashboard" : "/"}
        className="font-medium text-lg tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="w-4 h-4 bg-[#ccff00] rounded-full"></div>
        StudySprint
      </Link>

      <div className="flex gap-4 items-center">
        {right}
        {user && (
          <button
            onClick={logout}
            className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-50 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
