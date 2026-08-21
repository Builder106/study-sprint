import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth';
import { ThemeMenu } from './shared/ThemeMenu';

/** Temporary landing page used while the public-facing design is redesigned. */
export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className='min-h-screen bg-white text-zinc-950 dark:bg-[#0a0a0a] dark:text-zinc-50'>
      <header className='border-b border-zinc-200 dark:border-white/10'>
        <div className='mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-8'>
          <Link to='/' className='text-sm font-semibold tracking-tight'>
            StudySprint
          </Link>
          <div className='flex items-center gap-2'>
            <ThemeMenu />
            <Link
              to='/login'
              className='inline-flex min-h-11 items-center px-3 text-sm text-zinc-600 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526d00] dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className='mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-4 py-16 sm:px-8'>
        <section className='max-w-2xl'>
          <p className='mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#526d00] dark:text-[#ccff00]'>
            Landing page placeholder
          </p>
          <h1 className='max-w-xl text-4xl font-medium tracking-tight text-balance sm:text-6xl'>
            StudySprint is getting a new look.
          </h1>
          <p className='mt-6 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400'>
            The study timer, goals, analytics, and community tools are still here. The public
            landing page is being redesigned.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link
              to='/register'
              className='inline-flex min-h-12 items-center gap-2 bg-[#ccff00] px-5 text-sm font-medium text-black hover:bg-[#b3e600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526d00]'
            >
              Create an account <ArrowRight className='h-4 w-4' aria-hidden='true' />
            </Link>
            <Link
              to='/login'
              className='inline-flex min-h-12 items-center border border-zinc-300 px-5 text-sm font-medium hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526d00] dark:border-white/20 dark:hover:border-white/60'
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
