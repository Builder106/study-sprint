// Lightweight client-side password rules used by registration and the
// change-password flow. Compensating control for the Pro-tier
// "leaked password protection" (HaveIBeenPwned) feature that isn't available
// on the free plan — these checks just steer users away from the most-guessed
// passwords. They're trivially bypassable; the real safety net is server-side
// (Supabase Auth's own minimums + the project's "Require current password"
// toggle for updates).

// Case-insensitive prefix matches against the top guesses in every public
// password dump. Prefix (not exact) so that "password1", "password123",
// "qwerty123", "admin2024" etc. all get rejected with a single entry.
const COMMON_PREFIXES = [
  "password",
  "123456",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
];

export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (/^\d+$/.test(password)) {
    return "Password can't be all numbers — mix in letters or symbols.";
  }
  const lower = password.toLowerCase();
  for (const prefix of COMMON_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return "That password is too common — try something less guessable.";
    }
  }
  return null;
}
