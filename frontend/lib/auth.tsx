import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  hasPasswordIdentity: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(supaUser: SupabaseUser | null | undefined): User | null {
  if (!supaUser) return null;
  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    created_at: supaUser.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPasswordIdentity, setHasPasswordIdentity] = useState(false);

  useEffect(() => {
    const syncIdentity = (supaUser: SupabaseUser | null | undefined) => {
      setHasPasswordIdentity(
        !!supaUser?.identities?.some((i) => i.provider === "email"),
      );
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(toUser(session?.user));
      syncIdentity(session?.user);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user));
      syncIdentity(session?.user);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const register = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  };

  // Redirects the browser to Google's consent screen; the user lands back on
  // /dashboard after Supabase exchanges the code for a session and the
  // onAuthStateChange listener picks it up.
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // The project has "Require current password when updating" enabled in
  // Supabase Auth, so the SDK forwards the current password to GoTrue's
  // PUT /user endpoint via the `current_password` field. GoTrue returns
  // "New password should be different from the old password." on a no-op
  // and "Current password is incorrect." on a mismatch — we normalize both.
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("current password") || msg.includes("invalid")) {
        throw new Error("Current password is incorrect.");
      }
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasPasswordIdentity,
        login,
        register,
        loginWithGoogle,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
