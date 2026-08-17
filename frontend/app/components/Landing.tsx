import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { LogoMark } from './shared/Logo';
import { ThemeMenu } from './shared/ThemeMenu';
import { VirtualPlant } from './shared/VirtualPlant';
import type { PlantStage } from './shared/VirtualPlant';
import { FlowerPot } from './shared/FlowerPot';
import type { PotVariant } from './shared/FlowerPot';

const REPO_URL = 'https://github.com/Builder106/study-sprint';

/**
 * The six growth stages, with the thresholds they actually unlock at.
 *
 * These are not marketing numbers — they are the real thresholds documented in
 * DESIGN.md § Virtual plant container, and each row renders the same
 * VirtualPlant component the dashboard renders. If the thresholds change, this
 * list has to change with them.
 */
const STAGES: ReadonlyArray<{
  stage: PlantStage;
  name: string;
  threshold: string;
  note: string;
}> = [
  {
    stage: 'seed',
    name: 'Seed',
    threshold: '0 minutes',
    note: 'Nothing logged yet — a mound of soil and a seed sitting in it.',
  },
  {
    stage: 'sprout',
    name: 'Sprout',
    threshold: '30 minutes',
    note: 'One focus session in. A single stem, two small leaves.',
  },
  {
    stage: 'sapling',
    name: 'Sapling',
    threshold: '2 hours',
    note: 'The stem thickens enough to carry a third leaf.',
  },
  {
    stage: 'young_tree',
    name: 'Young tree',
    threshold: '5 hours',
    note: 'A solid trunk now, under three rounds of foliage.',
  },
  {
    stage: 'mature_tree',
    name: 'Mature tree',
    threshold: '10 hours',
    note: 'It starts to branch. Four dense layers of canopy.',
  },
  {
    stage: 'blooming',
    name: 'Blooming',
    threshold: '20 hours',
    note: 'Full canopy, white blossom scattered across the top.',
  },
];

const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  span: 'wide' | 'unit';
  pot: PotVariant;
}> = [
  {
    title: 'A timer that knows what you are working on',
    body:
      'Stopwatch or Pomodoro, with phase labels and ambient focus sounds. Every session is tagged to a goal and a subject, validated on the server, and folded straight into your streak and your garden — so the time you log is the time that counts.',
    span: 'wide',
    pot: 'sapling',
  },
  {
    title: 'Syllabus import',
    body:
      'Paste a syllabus and get goals and deadlines back, instead of typing the whole term in by hand.',
    span: 'unit',
    pot: 'unfurl',
  },
  {
    title: 'Study rooms',
    body: 'Sit in a room with other people working. Nobody talks. That is the point.',
    span: 'unit',
    pot: 'twin',
  },
  {
    title: 'Analytics that answer a real question',
    body:
      'Where the hours went, by subject. Which hours of the day you actually focus in. Your current streak against your longest one. It is one Postgres call — analytics_summary — rendered with Recharts.',
    span: 'wide',
    pot: 'seedling',
  },
  {
    title: 'A leaderboard you can opt into',
    body:
      'Streaks and hours, compared across everyone who chose to make their profile public. Your page lives at /u/your-username, or nowhere at all.',
    span: 'wide',
    pot: 'bloom',
  },
  {
    title: 'The whole garden',
    body:
      'Every plant you have grown, kept — and longer streaks unlock species you have not seen yet.',
    span: 'wide',
    pot: 'cluster',
  },
  {
    title: 'Open source, MIT',
    body:
      'Read the schema, the row-level security policies, the tests. Then run your own copy of it.',
    span: 'wide',
    pot: 'roots',
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
                How it grows
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
          /* Hero — H2 split diptych, 7fr / 5fr. The proof column is the real
            VirtualPlant component at its final stage, not an illustration. */
        }
        <section className='mx-auto grid w-full max-w-6xl items-center gap-12 px-[var(--page-gutter)] pt-[var(--section-gap-tight)] pb-[var(--section-gap)] lg:grid-cols-[7fr_5fr] lg:gap-20'>
          <div>
            <h1
              className='ss-display ss-reveal text-5xl leading-[1.05] font-medium tracking-tighter sm:text-6xl lg:text-7xl'
              style={{ '--i': 0 } as React.CSSProperties}
            >
              Twenty hours of studying looks like a tree.
            </h1>
            <p
              className='ss-reveal mt-8 max-w-xl text-lg leading-relaxed font-light text-zinc-600 dark:text-zinc-400'
              style={{ '--i': 1 } as React.CSSProperties}
            >
              StudySprint counts the minutes you were going to spend anyway and gives them somewhere
              to go. Start a timer, tag it to a goal, and watch the total turn into a plant that
              will not grow unless you do the work.
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
                See how it grows
              </a>
            </div>
          </div>

          <div
            className='ss-reveal flex justify-center lg:justify-end'
            style={{ '--i': 3 } as React.CSSProperties}
          >
            {
              /* ss-hero-plant: a soft plane behind the plant gives the right
                column the same visual mass as the copy block on the left,
                instead of the plant reading as a small icon in open space. */
            }
            <div className='ss-hero-plant grid place-items-center rounded-full p-10 sm:p-14'>
              {
                /* aria-hidden: the plant repeats what the headline and the stage
                  list already say in text, and VirtualPlant's own label is
                  written for the signed-in dashboard ("Your study plant"). */
              }
              <div aria-hidden='true' className='text-zinc-900 dark:text-zinc-50'>
                <VirtualPlant stage='blooming' size={340} />
              </div>
            </div>
          </div>
        </section>

        {
          /* Stages — F4 step sequence. Genuinely ordinal content, so the numeral
            is part of the heading line rather than a label stacked above it. */
        }
        <section
          id='stages'
          className='scroll-mt-20 border-t border-zinc-200 py-[var(--section-gap)] dark:border-white/10'
        >
          <div className='mx-auto w-full max-w-6xl px-[var(--page-gutter)]'>
            <h2 className='ss-display max-w-2xl text-3xl font-medium tracking-tighter sm:text-4xl'>
              Six stages, and the hours each one costs.
            </h2>
            <p className='mt-5 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400'>
              There is no way to skip ahead and no way to buy a bigger tree. The only input is
              logged, validated focus time.
            </p>

            <ol className='mt-16'>
              {STAGES.map(({ stage, name, threshold, note }, i) => (
                <li key={stage} className='ss-stage grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-8'>
                  <div className='ss-stage-marker flex flex-col items-center text-zinc-900 dark:text-zinc-50'>
                    <div
                      aria-hidden='true'
                      className='ss-stage-dot bg-white py-2 dark:bg-[#0a0a0a]'
                    >
                      <VirtualPlant stage={stage} size={88} />
                    </div>
                  </div>

                  <div className='ss-stage-body pb-14'>
                    <h3 className='ss-display flex flex-wrap items-baseline gap-x-3 text-2xl font-medium tracking-tighter sm:text-3xl'>
                      <span className='tabular-nums text-zinc-500'>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{name}</span>
                      <span className='text-base font-normal tracking-normal tabular-nums text-[var(--brand-lime-ink)] dark:text-[var(--brand-lime)]'>
                        {threshold}
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
              {FEATURES.map(({ title, body, span, pot }) => (
                <article
                  key={title}
                  className={`ss-tile flex flex-col p-7 ${SPAN_CLASS[span]}`}
                >
                  <div className='ss-planter'>
                    <FlowerPot variant={pot} size={72} />
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
              Your seed is already in the pot.
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
