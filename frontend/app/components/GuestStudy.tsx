import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth';
import {
  EMPTY_GUEST_STUDY,
  GUEST_STUDY_KEY,
  type GuestStudyData,
  readGuestStudy,
} from '@/lib/guestStudy';
import { BatteryBolt } from './shared/BatteryBolt';
import { useConfirm } from './shared/ConfirmDialog';
import { Spinner } from './shared/Spinner';
import { TimerCard } from './shared/TimerCard';
import { TopNav } from './shared/TopNav';

function loadGuestStudy(): { data: GuestStudyData; error: string | null } {
  try {
    return { data: readGuestStudy(), error: null };
  } catch {
    return {
      data: EMPTY_GUEST_STUDY,
      error: 'Your saved guest data could not be read. It has not been replaced.',
    };
  }
}

export function GuestStudy({ embedded = false }: { embedded?: boolean }) {
  const { user, loading } = useAuth();
  const confirm = useConfirm();
  const [initial] = useState(loadGuestStudy);
  const [data, setData] = useState(initial.data);
  const [readError, setReadError] = useState(initial.error);
  const [storageError, setStorageError] = useState(initial.error);
  const [goalTitle, setGoalTitle] = useState('');
  const [draftMinutes, setDraftMinutes] = useState<number | null>(null);
  const [minutesInput, setMinutesInput] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (readError) return;
    try {
      localStorage.setItem(GUEST_STUDY_KEY, JSON.stringify(data));
      setStorageError(null);
      window.dispatchEvent(new Event('studysprint:guest-study'));
    } catch {
      setStorageError(
        'Browser storage is unavailable or full. New changes may not survive a refresh.',
      );
    }
  }, [data, readError]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== GUEST_STUDY_KEY) return;
      const loaded = loadGuestStudy();
      setReadError(loaded.error);
      setStorageError(loaded.error);
      if (loaded.error) return;
      setData(loaded.data);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (loading) return <Spinner label='Loading' size={20} />;
  if (user) return <Navigate to='/dashboard' replace />;

  const ContentTag = embedded ? 'div' : 'main';

  const activeGoal = data.goals.find((goal) => goal.id === data.activeGoalId) ?? null;
  const totalMinutes = data.sessions.reduce((sum, session) => sum + session.minutes, 0);
  const charge = Math.min(100, Math.floor(totalMinutes / 6));

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;
    const goal = { id: crypto.randomUUID(), title };
    setData((current) => ({
      ...current,
      goals: [...current.goals, goal],
      activeGoalId: goal.id,
    }));
    setGoalTitle('');
    setMessage(`Added ${title}.`);
  }

  function logSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = Number(minutesInput);
    if (!activeGoal || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return;
    setData((current) => ({
      ...current,
      sessions: [{
        id: crypto.randomUUID(),
        goalId: activeGoal.id,
        minutes,
        endedAt: new Date().toISOString(),
      }, ...current.sessions],
    }));
    setDraftMinutes(null);
    setMessage(`${minutes} minutes saved on this device.`);
  }

  async function clearGuestStudy() {
    const approved = await confirm({
      title: 'Clear guest study data?',
      description:
        'This permanently deletes your goals and study history from this browser and cancels any active guest timer. This cannot be undone.',
      confirmLabel: 'Clear data',
      cancelLabel: 'Keep data',
      tone: 'danger',
    });
    if (!approved) return;
    window.dispatchEvent(new Event('studysprint:guest-clear'));
    setReadError(null);
    setData(EMPTY_GUEST_STUDY);
    setDraftMinutes(null);
    setMessage('Guest study data cleared.');
  }

  return (
    <div
      className={embedded
        ? ''
        : 'min-h-screen bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-50'}
    >
      {!embedded && (
        <TopNav
          right={
            <Link to='/register' className='text-sm underline underline-offset-4'>
              Create account
            </Link>
          }
        />
      )}
      <ContentTag
        id={embedded ? 'study' : undefined}
        className='mx-auto max-w-5xl px-4 py-8 sm:px-8'
      >
        <div className='mb-8'>
          {embedded
            ? <h2 className='text-2xl font-medium tracking-tight'>Your goals and history</h2>
            : <h1 className='text-3xl font-medium tracking-tight'>Study on this device</h1>}
          <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-400'>
            Your goals and sessions stay in this browser. They do not sync to an account.
          </p>
        </div>
        {storageError && (
          <p role='alert' className='mb-6 text-sm text-red-700 dark:text-red-400'>{storageError}</p>
        )}
        <p role='status' className='sr-only'>{message}</p>

        <div className={embedded ? '' : 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]'}>
          {!embedded && (
            <section aria-labelledby='guest-focus-heading' className='min-w-0'>
              <h2 id='guest-focus-heading' className='mb-3 text-xl font-medium'>Focus</h2>
              <p className='mb-5 text-sm text-zinc-600 dark:text-zinc-400'>
                {activeGoal
                  ? `Working on: ${activeGoal.title}`
                  : 'Add a goal to log a study session.'}
              </p>
              <TimerCard
                onLogSession={(suggested) => {
                  setDraftMinutes(suggested);
                  setMinutesInput(String(Math.max(1, suggested)));
                }}
              />
              {draftMinutes !== null && (
                <form
                  onSubmit={logSession}
                  className='mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10'
                >
                  <label className='flex flex-col gap-2 text-sm'>
                    Minutes studied
                    <input
                      type='number'
                      min='1'
                      max='1440'
                      step='1'
                      required
                      value={minutesInput}
                      onChange={(event) => setMinutesInput(event.target.value)}
                      className='min-h-11 w-32 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-white/30'
                    />
                  </label>
                  <button
                    type='submit'
                    disabled={!activeGoal || !!readError}
                    className='min-h-11 rounded-md bg-[#ccff00] px-4 font-medium text-black disabled:opacity-50'
                  >
                    Save session
                  </button>
                  <button
                    type='button'
                    onClick={() => setDraftMinutes(null)}
                    className='min-h-11 px-3 underline underline-offset-4'
                  >
                    Cancel
                  </button>
                  {!activeGoal && <p className='w-full text-sm'>Add a goal before saving.</p>}
                </form>
              )}
            </section>
          )}

          <aside className='space-y-8'>
            {!embedded && (
              <section
                aria-labelledby='guest-charge-heading'
                className='rounded-xl border border-zinc-200 p-5 dark:border-white/10'
              >
                <h2 id='guest-charge-heading' className='text-xl font-medium'>Charge</h2>
                <div className='flex items-center gap-4'>
                  <BatteryBolt chargePct={charge} size={90} pulse={false} />
                  <p className='text-3xl tabular-nums'>{charge}%</p>
                </div>
                <p className='text-sm text-zinc-600 dark:text-zinc-400'>
                  {totalMinutes} minutes studied here
                </p>
              </section>
            )}

            <section aria-labelledby='guest-goals-heading'>
              <h2 id='guest-goals-heading' className='mb-3 text-xl font-medium'>Goals</h2>
              <form onSubmit={addGoal} className='flex gap-2'>
                <input
                  aria-label='New goal'
                  maxLength={120}
                  required
                  value={goalTitle}
                  onChange={(event) => setGoalTitle(event.target.value)}
                  placeholder='What will you study?'
                  className='min-h-11 min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 transition-[border-color,box-shadow] duration-200 ease-out hover:border-brand-lime-ink hover:shadow-sm dark:border-white/30 dark:hover:border-brand-lime motion-reduce:transition-none'
                />
                <button
                  type='submit'
                  disabled={!!readError}
                  className='min-h-11 rounded-md bg-brand-lime px-3 font-medium text-black transition-[background-color,box-shadow,translate] duration-200 ease-out enabled:hover:-translate-y-0.5 enabled:hover:bg-brand-lime-hover enabled:hover:shadow-md disabled:opacity-50 motion-reduce:transition-none motion-reduce:enabled:hover:translate-y-0'
                >
                  Add
                </button>
              </form>
              {data.goals.length === 0
                ? <p className='mt-3 text-sm text-zinc-600 dark:text-zinc-400'>No goals yet.</p>
                : (
                  <ul className='mt-3 space-y-2'>
                    {data.goals.map((goal) => (
                      <li key={goal.id} className='flex items-center gap-2'>
                        <button
                          type='button'
                          aria-pressed={data.activeGoalId === goal.id}
                          onClick={() =>
                            setData((current) => ({ ...current, activeGoalId: goal.id }))}
                          className='min-h-11 flex-1 rounded-md border border-zinc-300 px-3 text-left aria-pressed:border-[#526d00] dark:border-white/30 dark:aria-pressed:border-[#ccff00]'
                        >
                          {goal.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </section>
          </aside>
        </div>

        <section
          aria-labelledby='guest-history-heading'
          className='mt-12 border-t border-zinc-200 pt-6 dark:border-white/10'
        >
          <h2 id='guest-history-heading' className='text-xl font-medium'>Study history</h2>
          {data.sessions.length === 0
            ? (
              <p className='mt-3 text-sm text-zinc-600 dark:text-zinc-400'>
                No sessions saved yet.
              </p>
            )
            : (
              <ul className='mt-4 space-y-2'>
                {data.sessions.map((session) => (
                  <li
                    key={session.id}
                    className='flex flex-wrap justify-between gap-2 border-b border-zinc-200 py-3 text-sm dark:border-white/10'
                  >
                    <span>
                      {data.goals.find((goal) => goal.id === session.goalId)?.title ??
                        'Removed goal'} — {session.minutes} min
                    </span>
                    <time dateTime={session.endedAt}>
                      {new Date(session.endedAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          {(data.goals.length > 0 || data.sessions.length > 0 || readError) && (
            <button
              type='button'
              onClick={clearGuestStudy}
              className='mt-6 min-h-11 text-sm underline underline-offset-4'
            >
              Clear guest data
            </button>
          )}
        </section>
      </ContentTag>
      {!embedded && (
        <footer className='mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-8 text-sm text-zinc-600 dark:text-zinc-400'>
          <Link to='/'>Home</Link>
          <Link to='/privacy'>Privacy</Link>
          <Link to='/terms'>Terms</Link>
        </footer>
      )}
    </div>
  );
}
