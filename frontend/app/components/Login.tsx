import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { LogoMark } from './shared/Logo';
import { ThemeMenu } from './shared/ThemeMenu';
import { GoogleSignInButton } from './shared/GoogleSignInButton';

/**
 * Sign-in page.
 *
 * This form previously lived on "/" inside the Landing component. It moved here
 * unchanged when "/" became a marketing page; the auth behaviour — Google
 * sign-in, email/password, redirect-to-dashboard-when-already-signed-in — is
 * carried over as-is.
 */
export function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen flex-col bg-white font-sans text-zinc-900 selection:bg-[var(--brand-lime)] selection:text-black dark:bg-[#0a0a0a] dark:text-zinc-50'>
      <header className='flex items-center justify-between border-b border-zinc-200 px-6 py-6 sm:px-8 dark:border-white/10'>
        <Link to='/' className='flex items-center gap-2 text-lg font-medium tracking-tight'>
          <LogoMark size={28} />
          StudySprint
        </Link>
        <ThemeMenu />
      </header>

      <main className='mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 sm:px-8'>
        <h1 className='mb-8 text-4xl font-medium tracking-tighter'>Sign in</h1>

        <div className='mb-8'>
          <GoogleSignInButton label='Sign in with Google' onError={setError} />
          <div className='mt-8 flex items-center gap-4'>
            <div className='h-px flex-1 bg-zinc-200 dark:bg-white/10' />
            <span className='text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-600'>
              or with email
            </span>
            <div className='h-px flex-1 bg-zinc-200 dark:bg-white/10' />
          </div>
        </div>

        <form className='flex flex-col gap-8' onSubmit={onSubmit}>
          <div className='space-y-3'>
            <label
              htmlFor='login-email'
              className='block text-xs font-medium tracking-widest text-zinc-500 uppercase'
            >
              Email address
            </label>
            <input
              id='login-email'
              type='email'
              required
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='name@example.com'
              className='w-full rounded-none border-b border-zinc-300 bg-transparent px-0 py-3 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-[var(--brand-lime)] focus:outline-none dark:border-white/20 dark:text-zinc-50 dark:placeholder:text-zinc-700'
            />
          </div>

          <div className='space-y-3'>
            <label
              htmlFor='login-password'
              className='block text-xs font-medium tracking-widest text-zinc-500 uppercase'
            >
              Password
            </label>
            <input
              id='login-password'
              type='password'
              required
              autoComplete='current-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              className='w-full rounded-none border-b border-zinc-300 bg-transparent px-0 py-3 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-[var(--brand-lime)] focus:outline-none dark:border-white/20 dark:text-zinc-50 dark:placeholder:text-zinc-700'
            />
          </div>

          {error && (
            <div className='text-xs font-medium text-red-400' role='alert'>
              {error}
            </div>
          )}

          <div className='pt-4'>
            <button
              type='submit'
              disabled={submitting}
              className='flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-lime)] text-sm font-medium whitespace-nowrap text-black transition-colors hover:bg-[var(--brand-lime-hover)] disabled:opacity-50'
            >
              {submitting
                ? (
                  'Signing in…'
                )
                : (
                  <>
                    Sign in <ArrowRight className='h-4 w-4' />
                  </>
                )}
            </button>
          </div>

          <div className='text-center'>
            <Link
              to='/register'
              className='text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300'
            >
              Create an account
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
