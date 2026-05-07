import { useState } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  label?: string;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({ label = "Continue with Google", onError }: Props) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      // signInWithOAuth redirects the browser away, so we don't expect to
      // re-render after this. Only reset busy if it returns (i.e. errored).
      await loginWithGoogle();
    } catch (err) {
      setBusy(false);
      onError?.(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full h-14 rounded-full text-sm font-medium flex items-center justify-center gap-3 border border-zinc-300 dark:border-white/20 bg-white dark:bg-transparent text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      <GoogleMark />
      {busy ? "Redirecting…" : label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
