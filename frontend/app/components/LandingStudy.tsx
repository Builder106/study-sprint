import { lazy, Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Spinner } from './shared/Spinner';

const GuestStudy = lazy(() =>
  import('./GuestStudy').then(({ GuestStudy }) => ({ default: GuestStudy }))
);

function AccountGoals() {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (!name || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.createGoal({ title: name, target_hours: 10 });
      setTitle('');
      setMessage(`Added ${name}. Choose it at the bolt to study.`);
      window.dispatchEvent(new Event('studysprint:account-goals'));
    } catch {
      setError('Could not save this goal. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id='study'
      aria-labelledby='account-goals-heading'
      className='mx-auto max-w-5xl px-4 py-8 sm:px-8'
    >
      <h2 id='account-goals-heading' className='text-2xl font-medium tracking-tight'>
        Your study goals
      </h2>
      <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-400'>
        Choose a goal at the bolt, then tap it to start a real session. Your sessions save to your
        account.
      </p>
      <form onSubmit={addGoal} className='mt-6 flex max-w-md gap-2'>
        <input
          aria-label='New account goal'
          maxLength={120}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder='What will you study?'
          className='min-h-11 min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-white/30'
        />
        <button
          type='submit'
          disabled={saving}
          className='min-h-11 rounded-md bg-[#ccff00] px-4 font-medium text-black disabled:opacity-50'
        >
          Add goal
        </button>
      </form>
      {error && <p role='alert' className='mt-3 text-sm text-red-700 dark:text-red-400'>{error}</p>}
      <p role='status' className='mt-3 text-sm'>{message}</p>
      <Link
        to='/dashboard'
        className='mt-4 inline-block min-h-11 py-3 text-sm underline underline-offset-4'
      >
        View all goals and history
      </Link>
    </section>
  );
}

export function LandingStudy() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label='Loading study options' size={20} />;
  return user
    ? <AccountGoals />
    : (
      <Suspense fallback={<Spinner label='Loading study options' size={20} />}>
        <GuestStudy embedded />
      </Suspense>
    );
}
