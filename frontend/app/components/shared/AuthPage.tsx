import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useEffect, type ChangeEvent, type ReactNode } from 'react';
import type { User } from '@/lib/types';
import { LogoMark } from './Logo';
import { ThemeMenu } from './ThemeMenu';

export function useRedirectAuthenticatedUser(user: User | null) {
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);
}

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col bg-white font-sans text-zinc-900 selection:bg-[var(--brand-lime)] selection:text-black dark:bg-[#0a0a0a] dark:text-[#fafafa]'>
      <header className='flex items-center justify-between border-b border-zinc-200 px-6 py-6 sm:px-8 dark:border-white/10'>
        <Link
          to='/'
          className='flex items-center gap-2 text-lg font-medium tracking-tight transition-opacity hover:opacity-80'
        >
          <LogoMark size={28} />
          StudySprint
        </Link>
        <ThemeMenu />
      </header>
      <main className='mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-8 sm:px-8 sm:py-10'>
        {children}
      </main>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className='mt-8 flex items-center gap-4'>
      <div className='h-px flex-1 bg-zinc-200 dark:bg-white/10' />
      <span className='text-[10px] font-bold tracking-widest text-zinc-700 uppercase dark:text-[#d4d4d8]'>
        or with email
      </span>
      <div className='h-px flex-1 bg-zinc-200 dark:bg-white/10' />
    </div>
  );
}

type AuthFieldProps = {
  id: string;
  label: ReactNode;
  type: 'email' | 'password';
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
};

export function AuthField({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  minLength,
}: AuthFieldProps) {
  return (
    <div className='space-y-3'>
      <label
        htmlFor={id}
        className='block text-xs font-medium tracking-widest text-zinc-700 uppercase dark:text-[#d4d4d8]'
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={type === 'email' ? 'name@example.com' : '••••••••'}
        className='w-full rounded-none border-b border-zinc-300 bg-transparent px-0 py-3 text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-brand-lime-ink focus:border-[var(--brand-lime)] focus:outline-none dark:border-white/20 dark:text-[#fafafa] dark:placeholder:text-zinc-700 dark:hover:border-brand-lime'
      />
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div className='text-xs font-medium text-red-400' role='alert'>{message}</div>;
}

export function AuthSubmitButton({
  submitting,
  label,
  submittingLabel,
}: {
  submitting: boolean;
  label: string;
  submittingLabel: string;
}) {
  return (
    <button
      type='submit'
      disabled={submitting}
      className='group flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--brand-lime)] text-sm font-medium whitespace-nowrap text-black transition-colors hover:bg-[var(--brand-lime-hover)] disabled:cursor-not-allowed disabled:opacity-50'
    >
      {submitting
        ? submittingLabel
        : (
          <>
            {label} <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none' />
          </>
        )}
    </button>
  );
}
