import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { LogoMark } from './shared/Logo';
import { ThemeMenu } from './shared/ThemeMenu';
import { BatteryBolt } from './shared/BatteryBolt';
import { FeatureIcon } from './shared/FeatureIcon';

const REPO_URL = 'https://github.com/Builder106/study-sprint';

const CHARGE_BEATS: ReadonlyArray<{
  chargePct: number;
  name: string;
  note: string;
}> = [
  {
    chargePct: 25,
    name: 'Study adds charge',
    note: 'Every focused minute logged today adds charge. Two hours reaches the daily +20 cap.',
  },
  {
    chargePct: 45,
    name: 'Idle days draw it down',
    note: 'Charge drains by 8 points each day, whether or not you open the app.',
  },
  {
    chargePct: 70,
    name: 'Stay above empty',
    note: 'Each day above zero extends your run and unlocks charge-based achievements.',
  },
  {
    chargePct: 100,
    name: 'Reach full charge',
    note: 'A full battery earns the Full Charge achievement. There are no shortcuts.',
  },
];

const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  span: 'wide' | 'unit';
  icon: 'timer' | 'syllabus' | 'rooms' | 'analytics' | 'achievements' | 'source';
}> = [
  {
    title: 'A timer that knows what you are working on',
    body:
      'Stopwatch or Pomodoro, with phase labels and ambient focus sounds. Every session is tagged to a goal and a subject, then folded straight into your charge and XP.',
    span: 'wide',
    icon: 'timer',
  },
  {
    title: 'Syllabus import',
    body:
      'Paste a syllabus and get goals and deadlines back, instead of typing the whole term in by hand.',
    span: 'unit',
    icon: 'syllabus',
  },
  {
    title: 'Study rooms',
    body: 'Sit in a room with other people working. Nobody talks. That is the point.',
    span: 'unit',
    icon: 'rooms',
  },
  {
    title: 'Analytics that answer a real question',
    body:
      'Where the hours went, by subject. Which hours of the day you actually focus in. Your current charge and longest run above empty. It is one Postgres call, analytics_summary, rendered with Recharts.',
    span: 'wide',
    icon: 'analytics',
  },
  {
    title: 'A leaderboard you can opt into',
    body:
      'Charge runs and hours, compared across everyone who chose to make their profile public. Your page lives at /u/your-username, or nowhere at all.',
    span: 'wide',
    icon: 'achievements',
  },
  {
    title: 'A reason to keep the circuit live',
    body:
      'Charged Up, Never Empty, and Full Charge turn steady study into something you can see.',
    span: 'wide',
    icon: 'achievements',
  },
  {
    title: 'Open source, MIT',
    body:
      'Read the schema, the row-level security policies, the tests. Then run your own copy of it.',
    span: 'wide',
    icon: 'source',
  },
];

const SPAN_CLASS = {
  wide: 'ss-bento__wide',
  unit: '',
} as const;

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className='flex min-h-screen flex-col bg-white font-sans text-zinc-900 selection:bg-[var(--brand-lime)] selection:text-black dark:bg-[#0a0a0a] dark:text-zinc-50'>
      {
        /* Nav — N7 brutal slab: heavy bottom rule, tracked uppercase, no radius,
          no shadow. The section links are same-page anchors, so they are the
          items that drop at narrow widths; both CTAs survive. */
      }
      <header className='flex items-center gap-4 border-b-[length:var(--rule-slab)] border-zinc-900 px-[var(--page-gutter)] py-4 dark:border-white/25'>
        <Link
          to='/'
          className='flex min-h-11 items-center gap-2 text-lg font-semibold tracking-[0.04em] whitespace-nowrap uppercase'
        >
          <LogoMark size={26} />
          StudySprint
        </Link>

        <nav aria-label='Primary' className='ml-auto hidden md:block'>
          <ul className='flex items-center gap-7'>
            <li>
              <a
                href='#stages'
                className='text-sm font-semibold tracking-[0.08em] whitespace-nowrap uppercase text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
              >
                How charging works
              </a>
            </li>
            <li>
              <a
                href='#features'
                className='text-sm font-semibold tracking-[0.08em] whitespace-nowrap uppercase text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
              >
                Features
              </a>
            </li>
            <li>
              <a
                href={REPO_URL}
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm font-semibold tracking-[0.08em] whitespace-nowrap uppercase text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
              >
                Source
              </a>
            </li>
          </ul>
        </nav>

        <div className='ml-auto flex items-center gap-2 md:ml-0'>
          <ThemeMenu />
          <Link
            to='/login'
            className='grid h-11 place-items-center px-3 text-sm font-semibold tracking-[0.08em] whitespace-nowrap uppercase text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
          >
            Sign in
          </Link>
          <Link
            to='/register'
            className='grid h-11 place-items-center bg-[var(--brand-lime)] px-5 text-sm font-semibold tracking-[0.08em] whitespace-nowrap uppercase text-black transition-colors hover:bg-[var(--brand-lime-hover)]'
          >
            Start free
          </Link>
        </div>
      </header>

      <main className='flex-1'>
        {
          /* Hero — H2 split diptych, 7fr / 5fr. The proof column renders the
            same battery component the signed-in app uses. */
        }
        <section className='mx-auto grid w-full max-w-6xl items-center gap-12 px-[var(--page-gutter)] pt-[var(--section-gap-tight)] pb-[var(--section-gap)] lg:grid-cols-[7fr_5fr] lg:gap-20'>
          <div>
            <h1
              className='ss-display ss-reveal text-5xl leading-[1.05] font-medium tracking-tighter sm:text-6xl lg:text-7xl'
              style={{ '--i': 0 } as React.CSSProperties}
            >
              Your study time holds a charge.
            </h1>
            <p
              className='ss-reveal mt-8 max-w-xl text-lg leading-relaxed font-light text-zinc-600 dark:text-zinc-400'
              style={{ '--i': 1 } as React.CSSProperties}
            >
              Start a timer, tag it to a goal, and build charge from the work you were going to do
              anyway. It fades when you step away, so progress stays tied to a real habit.
            </p>
            <div
              className='ss-reveal mt-10 flex flex-wrap items-center gap-x-8 gap-y-4'
              style={{ '--i': 2 } as React.CSSProperties}
            >
              <Link
                to='/register'
                className='flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--brand-lime)] px-8 text-sm font-medium whitespace-nowrap text-black transition-colors hover:bg-[var(--brand-lime-hover)]'
              >
                Start free <ArrowRight className='h-4 w-4' />
              </Link>
              <a
                href='#stages'
                className='flex min-h-11 items-center text-sm font-medium whitespace-nowrap text-zinc-600 underline decoration-zinc-300 underline-offset-[6px] transition-colors hover:text-zinc-900 hover:decoration-[var(--brand-lime)] dark:text-zinc-400 dark:decoration-white/20 dark:hover:text-zinc-50'
              >
                See how it charges
              </a>
            </div>
          </div>

          <div
            className='ss-reveal flex justify-center lg:justify-end'
            style={{ '--i': 3 } as React.CSSProperties}
          >
            {
              /* The charge plane gives the right column the same visual weight as the copy. */
            }
            <div className='ss-hero-charge grid place-items-center rounded-full p-10 sm:p-14'>
              {
                /* The bolt repeats the nearby copy, so it is decorative here. */
              }
              <div aria-hidden='true' className='text-zinc-900 dark:text-zinc-50'>
                <BatteryBolt chargePct={100} size={340} />
              </div>
            </div>
          </div>
        </section>

        {
          /* Charge mechanics shown as a concrete sequence. */
        }
        <section
          id='stages'
          className='scroll-mt-20 border-t border-zinc-200 py-[var(--section-gap)] dark:border-white/10'
        >
          <div className='mx-auto w-full max-w-6xl px-[var(--page-gutter)]'>
            <h2 className='ss-display max-w-2xl text-3xl font-medium tracking-tighter sm:text-4xl'>
              Charge responds to what you do.
            </h2>
            <p className='mt-5 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400'>
              Log focused time to add charge. Keep it above empty to build a durable study rhythm.
            </p>

            <ol className='mt-16'>
              {CHARGE_BEATS.map(({ chargePct, name, note }, i) => (
                <li key={name} className='ss-stage grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-8'>
                  <div className='ss-stage-marker flex flex-col items-center text-zinc-900 dark:text-zinc-50'>
                    <div
                      aria-hidden='true'
                      className='ss-stage-dot bg-white py-2 dark:bg-[#0a0a0a]'
                    >
                      <BatteryBolt chargePct={chargePct} size={88} />
                    </div>
                  </div>

                  <div className='ss-stage-body pb-14'>
                    <h3 className='ss-display flex flex-wrap items-baseline gap-x-3 text-2xl font-medium tracking-tighter sm:text-3xl'>
                      <span className='tabular-nums text-zinc-500'>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{name}</span>
                      <span className='text-base font-normal tracking-normal tabular-nums text-[var(--brand-lime-ink)] dark:text-[var(--brand-lime)]'>
                        {chargePct}%
                      </span>
                    </h3>
                    <p className='mt-3 max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400'>
                      {note}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {
          /* Features — F1 bento. Asymmetric spans on purpose; a uniform
            three-column icon-card grid is the tell this avoids. */
        }
        <section
          id='features'
          className='scroll-mt-20 border-t border-zinc-200 py-[var(--section-gap-wide)] dark:border-white/10'
        >
          <div className='mx-auto w-full max-w-6xl px-[var(--page-gutter)]'>
            <h2 className='ss-display max-w-2xl text-3xl font-medium tracking-tighter sm:text-4xl'>
              What is actually in it.
            </h2>

            <div className='ss-bento mt-14'>
              {FEATURES.map(({ title, body, span, icon }) => (
                <article
                  key={title}
                  className={`ss-tile flex flex-col p-7 ${SPAN_CLASS[span]}`}
                >
                  <div className='ss-feature-icon text-[var(--brand-lime-ink)] dark:text-[var(--brand-lime)]'>
                    <FeatureIcon name={icon} size={58} />
                  </div>
                  <h3 className='ss-display mt-5 text-xl font-medium tracking-tighter sm:text-2xl'>
                    {title}
                  </h3>
                  <p className='mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400'>
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {
          /* Closing CTA — one button, per the macrostructure's global
            "start at stage 1" foot. */
        }
        <section className='border-t border-zinc-200 py-[var(--section-gap-tight)] dark:border-white/10'>
          <div className='mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-[var(--page-gutter)]'>
            <p className='ss-display text-3xl font-medium tracking-tighter sm:text-4xl'>
              Your next session can start the charge.
            </p>
            <Link
              to='/register'
              className='flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--brand-lime)] px-8 text-sm font-medium whitespace-nowrap text-black transition-colors hover:bg-[var(--brand-lime-hover)]'
            >
              Start free <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        </section>
      </main>

      {
        /* Footer — Ft5 statement: one closing sentence, then a meta row.
          Separators are thin vertical rules, never middle dots. */
      }
      <footer className='border-t-[length:var(--rule-slab)] border-zinc-900 py-14 dark:border-white/25'>
        <div className='mx-auto w-full max-w-6xl px-[var(--page-gutter)]'>
          <p className='ss-display max-w-2xl text-2xl leading-snug font-medium tracking-tighter sm:text-3xl'>
            Focus. Track. Grow.
          </p>

          {
            /* -mx-2 pulls the row back onto the page rail: the links carry px-2
              purely to reach a 44 px tap target, and that padding should not
              push the first item off the alignment everything else shares. */
          }
          <div className='mt-10 -mx-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400'>
            <span className='px-2 whitespace-nowrap'>StudySprint</span>
            <span aria-hidden='true' className='h-4 w-px bg-zinc-300 dark:bg-white/15' />
            <Link
              to='/privacy'
              className='flex min-h-11 items-center px-2 whitespace-nowrap transition-colors hover:text-zinc-900 dark:hover:text-zinc-50'
            >
              Privacy
            </Link>
            <span aria-hidden='true' className='h-4 w-px bg-zinc-300 dark:bg-white/15' />
            <Link
              to='/terms'
              className='flex min-h-11 items-center px-2 whitespace-nowrap transition-colors hover:text-zinc-900 dark:hover:text-zinc-50'
            >
              Terms
            </Link>
            <span aria-hidden='true' className='h-4 w-px bg-zinc-300 dark:bg-white/15' />
            <a
              href={REPO_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='flex min-h-11 items-center px-2 whitespace-nowrap transition-colors hover:text-zinc-900 dark:hover:text-zinc-50'
            >
              Source
            </a>
            <span aria-hidden='true' className='h-4 w-px bg-zinc-300 dark:bg-white/15' />
            <span className='px-2 whitespace-nowrap'>MIT licensed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
