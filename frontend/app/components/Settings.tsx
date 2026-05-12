import { Link } from "react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/password";
import { TopNav } from "./shared/TopNav";

export function Settings() {
  const { user, hasPasswordIdentity, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must differ from your current password.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-[#ccff00] selection:text-black">
      <TopNav />

      <main className="max-w-2xl mx-auto px-8 py-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-[#ccff00] mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>

        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ccff00] mb-4">
          <KeyRound className="w-4 h-4" />
          Account
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tighter mb-16">
          Settings.
        </h1>

        <section
          aria-labelledby="account-heading"
          className="border-t border-zinc-200 dark:border-white/10 pt-10 mb-16"
        >
          <h2
            id="account-heading"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-6"
          >
            Account
          </h2>
          <div className="flex justify-between items-baseline gap-6">
            <div className="text-sm text-zinc-500 font-light">Email</div>
            <div className="text-sm text-zinc-900 dark:text-zinc-50 font-medium break-all text-right">
              {user?.email}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="password-heading"
          className="border-t border-zinc-200 dark:border-white/10 pt-10"
        >
          <h2
            id="password-heading"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-6"
          >
            Change password
          </h2>

          {!hasPasswordIdentity ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light max-w-md">
              You signed in with Google, so there's no password on this account.
              Manage your password in your Google Account settings.
            </p>
          ) : (
            <form
              className="flex flex-col gap-8 max-w-md"
              onSubmit={onSubmit}
              noValidate
            >
              <div className="space-y-3">
                <label
                  htmlFor="current-password"
                  className="block text-xs uppercase tracking-widest text-zinc-500 font-medium"
                >
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-white/20 px-0 py-3 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-700 focus:outline-none focus:border-[#ccff00] transition-colors rounded-none"
                />
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="new-password"
                  className="block text-xs uppercase tracking-widest text-zinc-500 font-medium"
                >
                  New password{" "}
                  <span className="text-zinc-400 dark:text-zinc-700">
                    (min. {PASSWORD_MIN_LENGTH} characters)
                  </span>
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-white/20 px-0 py-3 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-700 focus:outline-none focus:border-[#ccff00] transition-colors rounded-none"
                />
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="confirm-password"
                  className="block text-xs uppercase tracking-widest text-zinc-500 font-medium"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-white/20 px-0 py-3 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-700 focus:outline-none focus:border-[#ccff00] transition-colors rounded-none"
                />
              </div>

              {error && (
                <div className="text-xs text-red-400 font-medium" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="self-start bg-[#ccff00] text-black h-12 px-8 rounded-full text-sm font-medium hover:bg-[#b3e600] transition-colors disabled:opacity-50"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
