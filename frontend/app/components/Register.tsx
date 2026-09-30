import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/password';
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthPage,
  AuthSubmitButton,
  useRedirectAuthenticatedUser,
} from './shared/AuthPage';
import { GoogleSignInButton } from './shared/GoogleSignInButton';

export function Register() {
  const navigate = useNavigate();
  const { user, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useRedirectAuthenticatedUser(user);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setSubmitting(true);
    try {
      await register(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
        <ArrowLeft className='w-4 h-4 group-hover:-translate-x-1 transition-transform' />
        Back
      </Link>

      <h1 className='mb-8 whitespace-nowrap text-3xl font-medium tracking-tighter sm:mb-10 sm:text-4xl'>
        Create account
      </h1>

      <div className='mb-6 sm:mb-8'>
        <GoogleSignInButton label='Sign up with Google' onError={setError} />
        <AuthDivider />
      </div>

      <form className='flex flex-col gap-6 sm:gap-8' onSubmit={onSubmit} noValidate>
        <AuthField
          id='register-email'
          label='Email address'
          type='email'
          autoComplete='email'
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id='register-password'
          label={(
            <>
              Password{' '}
              <span>(min. {PASSWORD_MIN_LENGTH} characters)</span>
            </>
          )}
          type='password'
          autoComplete='new-password'
          value={password}
          onChange={setPassword}
          minLength={PASSWORD_MIN_LENGTH}
        />

        {error && <AuthError message={error} />}

        <AuthSubmitButton
          label='Create account'
          submitting={submitting}
          submittingLabel='Creating account…'
        />

        <div className='text-center'>
          <Link
            to='/login'
            className='inline-block cursor-pointer text-sm text-zinc-700 transition-[color,translate] duration-200 ease-out hover:-translate-y-0.5 hover:text-brand-lime-ink focus-visible:text-brand-lime-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-lime-ink dark:text-[#d4d4d8] dark:hover:text-brand-lime dark:focus-visible:text-brand-lime motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          >
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </AuthPage>
  );
}
