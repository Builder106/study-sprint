import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthPage,
  AuthSubmitButton,
  useRedirectAuthenticatedUser,
} from './shared/AuthPage';
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

  useRedirectAuthenticatedUser(user);

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
    <AuthPage>
      <Link
        to='/'
        className='group mb-8 inline-flex items-center gap-2 text-xs font-bold tracking-widest text-zinc-700 uppercase transition-colors hover:text-[var(--brand-lime-ink)] dark:text-[#d4d4d8] dark:hover:text-[#ccff00] sm:mb-10'
      >
        <ArrowLeft className='w-4 h-4 transition-transform group-hover:-translate-x-1' />
        Back
      </Link>

      <h1 className='mb-8 text-4xl font-medium tracking-tighter'>Sign in</h1>

      <div className='mb-8'>
        <GoogleSignInButton label='Sign in with Google' onError={setError} />
        <AuthDivider />
      </div>

      <form className='flex flex-col gap-8' onSubmit={onSubmit}>
        <AuthField
          id='login-email'
          label='Email address'
          type='email'
          autoComplete='email'
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id='login-password'
          label='Password'
          type='password'
          autoComplete='current-password'
          value={password}
          onChange={setPassword}
        />

        {error && <AuthError message={error} />}

        <div className='pt-4'>
          <AuthSubmitButton
            label='Sign in'
            submitting={submitting}
            submittingLabel='Signing in…'
          />
        </div>

        <div className='text-center'>
          <Link
            to='/register'
            className='inline-block cursor-pointer text-sm text-zinc-700 transition-[color,translate] duration-200 ease-out hover:-translate-y-0.5 hover:text-brand-lime-ink focus-visible:text-brand-lime-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-lime-ink dark:text-[#d4d4d8] dark:hover:text-brand-lime dark:focus-visible:text-brand-lime motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          >
            Create an account
          </Link>
        </div>
      </form>
    </AuthPage>
  );
}
