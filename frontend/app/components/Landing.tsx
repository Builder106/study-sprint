import { ArrowRight, ChevronDown, Pause, Play } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatClock } from '@/lib/format';
import { GUEST_STUDY_KEY, readGuestStudy } from '@/lib/guestStudy';
import { LandingEasterEggTriggers } from '@/lib/landingEasterEggs';
import type { LandingEasterEggEffect, LandingEasterEggSnapshot } from '@/lib/landingEasterEggs';
import { LandingEasterEggs } from './LandingEasterEggs';
import { LandingEasterEggPreview } from './LandingEasterEggPreview';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { LandingStudy } from './LandingStudy';
import { ThemeMenu } from './shared/ThemeMenu';
import type { ChargeScene, ChargeSceneState } from './ChargeScene';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DURATIONS = [30, 60, 90] as const;
type Duration = typeof DURATIONS[number];
const ENTRY_DURATION_MS = 5000;

const ORBIT = { width: 900, height: 600, cx: 450, cy: 345, rx: 320, ry: 95 } as const;
const DURATION_ANGLES: Record<Duration, number> = { 30: 218, 60: 124, 90: 20 };

const BOLT_EDGE = [[553, 42], [368, 287], [488, 292], [450, 473], [637, 226], [515, 222]] as const;

function electricalArcs(count = 2 + Math.floor(Math.random() * 3), minimum = 18, spread = 32): string[] {
  return Array.from({ length: count }, () => {
    const edge = Math.floor(Math.random() * BOLT_EDGE.length);
    const [ax, ay] = BOLT_EDGE[edge];
    const [bx, by] = BOLT_EDGE[(edge + 1) % BOLT_EDGE.length];
    const span = Math.hypot(bx - ax, by - ay);
    const tx = (bx - ax) / span;
    const ty = (by - ay) / span;
    const along = 0.15 + Math.random() * 0.7;
    const x = ax + (bx - ax) * along;
    const y = ay + (by - ay) * along;
    const reach = minimum + Math.random() * spread;
    let path = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let step = 1; step <= 5; step++) {
      const distance = reach * step / 5;
      const jitter = (Math.random() - 0.5) * 13;
      path += ` L ${(x - ty * distance + tx * jitter).toFixed(1)} ${
        (y + tx * distance + ty * jitter).toFixed(1)
      }`;
    }
    return path;
  });
}

type DurationPoint = { x: number; y: number };

type GoalChoice = { id: string; title: string };
type SavedFocusTimer = {
  duration: 30 | 60 | 90;
  goalId: string;
  phase: 'running' | 'paused';
  deadline: number;
  elapsedMs: number;
};

function focusTimerKey(owner: string): string {
  return `studysprint:focus-timer:v1:${owner}`;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${
    String(date.getDate()).padStart(2, '0')
  }`;
}

function weekDates(): string[] {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return DAYS.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
}

function guestProgressSnapshot(sessions: ReturnType<typeof readGuestStudy>['sessions']): LandingEasterEggSnapshot {
  const dates = weekDates();
  const weekMinutes = dates.map((date) =>
    sessions
      .filter((session) => localDateKey(new Date(session.endedAt)) === date)
      .reduce((sum, session) => sum + session.minutes, 0)
  );
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  return { weekMinutes, charge: Math.min(100, Math.floor(totalMinutes / 6)) };
}

export function Landing() {
  const { user, loading: authLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const still = !!reducedMotion || paused;
  const [durationPoints, setDurationPoints] = useState<Record<Duration, DurationPoint> | null>(
    null,
  );
  const [goals, setGoals] = useState<GoalChoice[]>([]);
  const [goalId, setGoalId] = useState('');
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [minutes, setMinutes] = useState(0);
  const [charge, setCharge] = useState(0);
  const [week, setWeek] = useState<number[]>(Array(7).fill(0));
  const [terminalPulse, setTerminalPulse] = useState({ day: -1, sequence: 0 });
  const [expanded, setExpanded] = useState<'goal' | number | null>(null);
  const [result, setResult] = useState('');
  const [timerPhase, setTimerPhase] = useState<'idle' | 'running' | 'paused' | 'saving'>('idle');
  const [remaining, setRemaining] = useState(30 * 60);
  const [restoredOwner, setRestoredOwner] = useState('');
  const [rendererState, setRendererState] = useState<
    'loading' | 'entering' | 'ready' | 'fallback'
  >('loading');
  const [lightPosterReady, setLightPosterReady] = useState(false);
  const [darkPosterReady, setDarkPosterReady] = useState(false);
  const [arcs, setArcs] = useState<string[]>([]);
  const [idleArcs, setIdleArcs] = useState<string[]>([]);
  const [clickArcs, setClickArcs] = useState<string[]>([]);
  const [clickPulse, setClickPulse] = useState(0);
  const lastClickPulse = useRef(0);
  const [eggQueue, setEggQueue] = useState<LandingEasterEggEffect[]>([]);
  const [activeEgg, setActiveEgg] = useState<LandingEasterEggEffect | null>(null);
  const eggTriggers = useRef(new LandingEasterEggTriggers());
  const [awake, setAwake] = useState(false);
  const posterReady = resolvedTheme === 'dark' ? darkPosterReady : lightPosterReady;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const deadline = useRef(0);
  const elapsedMs = useRef(0);
  const sessionDuration = useRef<30 | 60 | 90>(30);
  const sessionGoalId = useRef('');
  const sessionUserId = useRef<string | null>(null);
  const saving = useRef(false);
  const currentUserId = useRef(user?.id ?? null);
  currentUserId.current = user?.id ?? null;
  const host = useRef<HTMLDivElement>(null);
  const goalAnchor = useRef<HTMLDivElement>(null);
  const chargeAnchor = useRef<HTMLDivElement>(null);
  const orbit = useRef<SVGSVGElement>(null);
  const goalButton = useRef<HTMLButtonElement>(null);
  const scene = useRef<ChargeScene | null>(null);
  const rendererEntryTimer = useRef<number | null>(null);
  const drag = useRef({ x: 0, y: 0, moved: false, active: false });
  const sceneState: ChargeSceneState = {
    charge,
    minutes,
    still,
    dark: resolvedTheme === 'dark',
    tilt,
  };
  const latest = useRef(sceneState);
  latest.current = sceneState;

  useLayoutEffect(() => {
    const svg = orbit.current;
    const frame = svg?.parentElement;
    if (!svg || !frame) return;

    const update = () => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const bounds = frame.getBoundingClientRect();
      const pointAt = (duration: Duration): DurationPoint => {
        const radians = DURATION_ANGLES[duration] * Math.PI / 180;
        const point = svg.createSVGPoint();
        point.x = ORBIT.cx + ORBIT.rx * Math.cos(radians);
        point.y = ORBIT.cy + ORBIT.ry * Math.sin(radians);
        const screenPoint = point.matrixTransform(matrix);
        return { x: screenPoint.x - bounds.left, y: screenPoint.y - bounds.top };
      };
      const next = {
        30: pointAt(30),
        60: pointAt(60),
        90: pointAt(90),
      };
      setDurationPoints((current) => {
        if (
          current && DURATIONS.every((value) =>
            Math.abs(current[value].x - next[value].x) < 0.1 &&
            Math.abs(current[value].y - next[value].y) < 0.1
          )
        ) return current;
        return next;
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const selectedGoal = goals.find((item) => item.id === goalId);

  function queueEggEffects(effects: LandingEasterEggEffect[]) {
    if (still || effects.length === 0) return;
    setEggQueue((queue) => [...queue, ...effects]);
  }

  function updateEggProgress(snapshot: LandingEasterEggSnapshot, baseline: boolean) {
    if (baseline) eggTriggers.current.initialize(snapshot);
  }

  function refreshGuest(baseline = true): LandingEasterEggSnapshot | null {
    try {
      const data = readGuestStudy();
      const total = data.sessions.reduce((sum, session) => sum + session.minutes, 0);
      const snapshot = guestProgressSnapshot(data.sessions);
      setGoals(data.goals);
      setGoalId((current) =>
        data.goals.some((goal) => goal.id === current)
          ? current
          : data.activeGoalId ?? data.goals[0]?.id ?? ''
      );
      setMinutes(total);
      setCharge(snapshot.charge);
      setWeek([...snapshot.weekMinutes]);
      updateEggProgress(snapshot, baseline);
      return snapshot;
    } catch {
      setResult(
        'Saved guest data could not be read. Open your guest study area below to clear it.',
      );
      return null;
    }
  }

  async function refreshAccount(baseline = true): Promise<LandingEasterEggSnapshot | null> {
    const requestedUserId = user?.id ?? null;
    try {
      const { goals: allGoals } = await api.listGoals();
      if (currentUserId.current !== requestedUserId) return null;
      const active = allGoals.filter((goal) => goal.status === 'Active');
      setGoals(active.map(({ id, title }) => ({ id, title })));
      setGoalId((current) =>
        active.some((goal) => goal.id === current) ? current : active[0]?.id ?? ''
      );
    } catch {
      setResult('Could not load account goals. Check your connection and try again.');
    }
    try {
      const summary = await api.analyticsSummary();
      if (currentUserId.current !== requestedUserId) return null;
      setCharge(summary.totals.current_charge_pct);
      setMinutes(summary.totals.minutes);
      const dates = weekDates();
      const snapshot = {
        charge: summary.totals.current_charge_pct,
        weekMinutes: dates.map((date) =>
          summary.daily.find((day) => day.date === date)?.minutes ?? 0
        ),
      } satisfies LandingEasterEggSnapshot;
      setWeek([...snapshot.weekMinutes]);
      updateEggProgress(snapshot, baseline);
      return snapshot;
    } catch {
      setResult('Could not load account charge and history. Check your connection and try again.');
      return null;
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      void refreshAccount();
      const onChange = () => {
        void refreshAccount();
      };
      window.addEventListener('studysprint:account-goals', onChange);
      return () => window.removeEventListener('studysprint:account-goals', onChange);
    }
    refreshGuest();
    const onChange = () => refreshGuest();
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUEST_STUDY_KEY) refreshGuest();
    };
    const onClear = () => {
      setGoals([]);
      setGoalId('');
      setMinutes(0);
      setCharge(0);
      setWeek(Array(7).fill(0));
      setExpanded(null);
      setTerminalPulse({ day: -1, sequence: 0 });
      setTimerPhase('idle');
      elapsedMs.current = 0;
      updateEggProgress({ weekMinutes: Array(7).fill(0), charge: 0 }, true);
      setResult('Guest study data cleared.');
    };
    window.addEventListener('studysprint:guest-study', onChange);
    window.addEventListener('studysprint:guest-clear', onClear);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('studysprint:guest-study', onChange);
      window.removeEventListener('studysprint:guest-clear', onClear);
      window.removeEventListener('storage', onStorage);
    };
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (timerPhase === 'idle') setRemaining(duration * 60);
  }, [duration, timerPhase]);

  useEffect(() => {
    if (authLoading) return;
    const owner = user?.id ?? 'guest';
    try {
      const raw = localStorage.getItem(focusTimerKey(owner));
      if (raw) {
        const saved: SavedFocusTimer = JSON.parse(raw);
        if (
          DURATIONS.includes(saved.duration) && typeof saved.goalId === 'string' &&
          (saved.phase === 'running' || saved.phase === 'paused') &&
          Number.isFinite(saved.deadline) && Number.isFinite(saved.elapsedMs) &&
          saved.elapsedMs >= 0 && saved.elapsedMs <= saved.duration * 60_000
        ) {
          sessionDuration.current = saved.duration;
          sessionGoalId.current = saved.goalId;
          sessionUserId.current = user?.id ?? null;
          deadline.current = saved.deadline;
          elapsedMs.current = saved.elapsedMs;
          setDuration(saved.duration);
          setRemaining(
            saved.phase === 'running'
              ? Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000))
              : Math.max(0, Math.ceil((saved.duration * 60_000 - saved.elapsedMs) / 1000)),
          );
          setTimerPhase(saved.phase);
          setRestoredOwner(owner);
          return;
        }
      }
    } catch {
      setResult('Could not restore the previous focus timer.');
    }
    setTimerPhase('idle');
    setRestoredOwner(owner);
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    const owner = user?.id ?? 'guest';
    if (restoredOwner !== owner) return;
    try {
      const key = focusTimerKey(owner);
      if (timerPhase === 'idle') {
        localStorage.removeItem(key);
        return;
      }
      const saved: SavedFocusTimer = {
        duration: sessionDuration.current,
        goalId: sessionGoalId.current,
        phase: timerPhase === 'running' ? 'running' : 'paused',
        deadline: deadline.current,
        elapsedMs: elapsedMs.current,
      };
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {
      setResult('Browser storage is unavailable. An active timer may reset on refresh.');
    }
  }, [timerPhase, restoredOwner, user?.id, authLoading]);

  useEffect(() => {
    let disposed = false;
    const element = host.current;
    const goalElement = goalAnchor.current;
    const chargeElement = chargeAnchor.current;
    if (!element || !goalElement || !chargeElement) return;
    void import('./ChargeScene').then(({ createChargeScene }) => {
      if (disposed) return;
      return createChargeScene(
        element,
        { goal: goalElement, charge: chargeElement },
        latest.current,
        (value) => {
          if (disposed) return;
          if (!value) {
            if (rendererEntryTimer.current !== null) {
              window.clearTimeout(rendererEntryTimer.current);
              rendererEntryTimer.current = null;
            }
            setRendererState('fallback');
            return;
          }
          if (latest.current.still) {
            setRendererState('ready');
            return;
          }
          setRendererState('entering');
          rendererEntryTimer.current = window.setTimeout(() => {
            rendererEntryTimer.current = null;
            setRendererState('ready');
          }, ENTRY_DURATION_MS);
        },
      );
    }).then((instance) => {
      if (!instance) return;
      if (disposed) instance.dispose();
      else {
        scene.current = instance;
        instance.update(latest.current);
      }
    }).catch(() => {
      if (disposed) return;
      if (rendererEntryTimer.current !== null) {
        window.clearTimeout(rendererEntryTimer.current);
        rendererEntryTimer.current = null;
      }
      setRendererState('fallback');
    });
    return () => {
      disposed = true;
      if (rendererEntryTimer.current !== null) {
        window.clearTimeout(rendererEntryTimer.current);
        rendererEntryTimer.current = null;
      }
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    if (!still || rendererState !== 'entering') return;
    if (rendererEntryTimer.current !== null) {
      window.clearTimeout(rendererEntryTimer.current);
      rendererEntryTimer.current = null;
    }
    setRendererState('ready');
  }, [rendererState, still]);

  useEffect(() => {
    const object = orbit.current?.closest<HTMLElement>('.ss-object');
    if (!object) return;
    let inView = false;
    const updateVisibility = () => {
      const visible = inView && !document.hidden;
      object.dataset.awake = String(visible);
      setAwake(visible);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(object);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (still) {
      if (eggQueue.length > 0) setEggQueue([]);
      if (activeEgg) setActiveEgg(null);
      return;
    }
    if (!awake && activeEgg) {
      if (eggQueue.length > 0) setEggQueue([]);
      setActiveEgg(null);
      return;
    }
    if (
      !awake || activeEgg || eggQueue.length === 0 ||
      !['ready', 'fallback'].includes(rendererState)
    ) return;
    setActiveEgg(eggQueue[0]);
    setEggQueue((queue) => queue.slice(1));
  }, [activeEgg, awake, eggQueue, rendererState, still]);

  useEffect(() => {
    if (rendererState !== 'entering' || still) {
      setArcs([]);
      return;
    }
    const arcTimes = [350, 600, 850, 1100, 1350, 1600, 1850];
    const timers = arcTimes.map((time) =>
      window.setTimeout(() => {
        if (document.hidden) return;
        setArcs(electricalArcs());
      }, time)
    );
    timers.push(window.setTimeout(() => setArcs([]), ENTRY_DURATION_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [rendererState, still]);

  useEffect(() => {
    if (still || !awake || timerPhase !== 'idle' || rendererState !== 'ready') {
      setIdleArcs([]);
      return;
    }
    let timer = 0;
    let clear = 0;
    const spark = () => {
      setIdleArcs(electricalArcs(1 + Math.floor(Math.random() * 2), 12, 16));
      clear = window.setTimeout(() => setIdleArcs([]), 180);
      timer = window.setTimeout(spark, 4200 + Math.random() * 2600);
    };
    timer = window.setTimeout(spark, 1800 + Math.random() * 1500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [awake, still, timerPhase, rendererState]);

  useEffect(() => {
    if (still || !awake) {
      setClickArcs([]);
      lastClickPulse.current = clickPulse;
      return;
    }
    if (clickPulse === lastClickPulse.current) return;
    lastClickPulse.current = clickPulse;
    if (!clickPulse) {
      setClickArcs([]);
      return;
    }
    const animation = host.current?.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(0.93)', offset: 0.16 },
      { transform: 'scale(1.045)', offset: 0.45 },
      { transform: 'scale(1)' },
    ], { duration: 480, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
    const timers = Array.from({ length: 5 }, (_, index) =>
      window.setTimeout(() => setClickArcs(electricalArcs(3, 22, 26)), 70 + index * 45)
    );
    timers.push(window.setTimeout(() => setClickArcs([]), 320));
    return () => {
      animation?.cancel();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [clickPulse, still, awake]);

  useEffect(() => {
    scene.current?.update(sceneState);
  });
  useEffect(() => {
    if (!still) return;
    setTilt({ x: 0, y: 0 });
  }, [still]);

  function elapsed(): number {
    const target = sessionDuration.current * 60_000;
    return timerPhase === 'running'
      ? Math.max(0, target - (deadline.current - Date.now()))
      : elapsedMs.current;
  }

  async function finishSession(automatic = false) {
    if (saving.current) return;
    const studied = automatic
      ? sessionDuration.current
      : Math.min(sessionDuration.current, Math.floor(elapsed() / 60_000));
    if (studied < 1) {
      setResult('Study for at least one minute before saving a session.');
      return;
    }
    saving.current = true;
    elapsedMs.current = Math.min(elapsed(), sessionDuration.current * 60_000);
    setTimerPhase('saving');
    setResult('Saving your session…');
    try {
      if (sessionUserId.current) {
        let saveGoalId = sessionGoalId.current;
        if (!saveGoalId) {
          const { goal } = await api.createGoal({ title: 'Focus session', target_hours: 10 });
          saveGoalId = goal.id;
          sessionGoalId.current = goal.id;
        }
        await api.createSession(saveGoalId, { duration_minutes: studied });
        const snapshot = await refreshAccount(false);
        if (snapshot) queueEggEffects(eggTriggers.current.successfulSave(snapshot));
      } else {
        const data = readGuestStudy();
        let saveGoalId = sessionGoalId.current;
        const goals = [...data.goals];
        if (!goals.some((goal) => goal.id === saveGoalId)) {
          saveGoalId = crypto.randomUUID();
          goals.push({ id: saveGoalId, title: 'Focus session' });
        }
        localStorage.setItem(
          GUEST_STUDY_KEY,
          JSON.stringify({
            goals,
            activeGoalId: saveGoalId,
            sessions: [{
              id: crypto.randomUUID(),
              goalId: saveGoalId,
              minutes: studied,
              endedAt: new Date().toISOString(),
            }, ...data.sessions],
          }),
        );
        const snapshot = refreshGuest(false);
        if (snapshot) queueEggEffects(eggTriggers.current.successfulSave(snapshot));
        window.dispatchEvent(new Event('studysprint:guest-study'));
      }
      setResult(
        `${studied} minute${studied === 1 ? '' : 's'} saved ${
          sessionUserId.current ? 'to your account' : 'on this device'
        }.`,
      );
      setTerminalPulse((pulse) => ({
        day: (new Date().getDay() + 6) % 7,
        sequence: pulse.sequence + 1,
      }));
      setTimerPhase('idle');
      elapsedMs.current = 0;
    } catch {
      setTimerPhase('paused');
      setResult('Could not save the session. Your time is still here; try Finish and save again.');
    } finally {
      saving.current = false;
    }
  }

  useEffect(() => {
    if (timerPhase !== 'running') return;
    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) void finishSession(true);
    }, 250);
    return () => clearInterval(interval);
  }, [timerPhase]);

  function activate() {
    if (authLoading || timerPhase === 'saving') return;
    queueEggEffects(eggTriggers.current.activate());
    setClickPulse((pulse) => pulse + 1);
    setResult('');
    if (timerPhase === 'running') {
      elapsedMs.current = elapsed();
      setRemaining(
        Math.max(
          0,
          Math.ceil((sessionDuration.current * 60_000 - elapsedMs.current) / 1000),
        ),
      );
      setTimerPhase('paused');
      setResult('Session paused. Tap the bolt to resume.');
      return;
    }
    if (timerPhase === 'paused') {
      deadline.current = Date.now() + sessionDuration.current * 60_000 - elapsedMs.current;
      setTimerPhase('running');
      setResult('Session resumed.');
      return;
    }
    sessionDuration.current = duration;
    sessionGoalId.current = goalId;
    sessionUserId.current = user?.id ?? null;
    elapsedMs.current = 0;
    deadline.current = Date.now() + duration * 60_000;
    setRemaining(duration * 60);
    setExpanded(null);
    setTimerPhase('running');
  }

  function cancelSession() {
    setTimerPhase('idle');
    elapsedMs.current = 0;
    setRemaining(duration * 60);
    setResult('Session cancelled. No study time was saved.');
  }

  const activeDuration = timerPhase === 'idle' ? duration : sessionDuration.current;
  const durationSeconds = activeDuration * 60;
  const sessionProgress = timerPhase === 'idle'
    ? 0
    : Math.max(0, Math.min(1, (durationSeconds - remaining) / durationSeconds));
  const durationArcOffset = duration === 30 ? -51 : duration === 60 ? -34 : 0.2;

  return (
    <div className='ss-landing' data-still={still}>
      <a className='ss-skip' href='#main'>Skip to content</a>
      <header className='ss-header'>
        <Link to='/' className='ss-wordmark' aria-label='StudySprint home'>
          <img src='/logo.svg' width='28' height='28' alt='' />StudySprint
        </Link>
        <div className='ss-utilities' role='group' aria-label='Account and display controls'>
          <ThemeMenu />
          <Link to={user ? '/dashboard' : '/login'} className='ss-signin'>
            {user ? 'Dashboard' : 'Sign in'} <ArrowRight size={16} aria-hidden='true' />
          </Link>
        </div>
      </header>
      <main
        id='main'
        className='ss-experience'
        tabIndex={-1}
        style={{ '--ss-entry-duration': `${ENTRY_DURATION_MS}ms` } as CSSProperties}
      >
        <div
          className='ss-introduction'
          data-bolt-entered={rendererState !== 'loading'}
          data-still={still}
        >
          <h1 aria-label='Focus in. Charge up.'>
            <span className='ss-focus-word' aria-hidden='true'>Focus in.</span>{' '}
            <span className='ss-charge-word' aria-hidden='true'>Charge up.</span>
          </h1>
          <p>Make time for one thing. See what it adds up to.</p>
        </div>
        <section
          className='ss-object'
          aria-label='Interactive study demo'
          data-phase={timerPhase}
          data-renderer={rendererState}
          data-poster-ready={posterReady}
          data-discharging={idleArcs.length > 0 || clickArcs.length > 0}
        >
          {activeEgg && !still && (
            <LandingEasterEggs
              effect={activeEgg}
              onComplete={() => setActiveEgg(null)}
            />
          )}
          <div className='ss-visual' aria-hidden='true'>
            <img
              className='ss-sculpture ss-sculpture-light'
              src='/landing/charge-sculpture-light.webp'
              width='1000'
              height='594'
              alt=''
              fetchPriority='high'
              onLoad={() => setLightPosterReady(true)}
            />
            <img
              className='ss-sculpture ss-sculpture-dark'
              src='/landing/charge-sculpture-dark.webp'
              width='1000'
              height='594'
              alt=''
              fetchPriority='high'
              onLoad={() => setDarkPosterReady(true)}
            />
            <svg
              className='ss-ignition'
              viewBox='0 0 1000 594'
              preserveAspectRatio='xMidYMid slice'
              aria-hidden='true'
            >
              <path
                className='ss-ignition-bevel'
                d='M 553 42 L 368 287 L 488 292 L 450 473 L 637 226 L 515 222 Z'
                pathLength='100'
              />
              <g className='ss-electric-arcs'>
                {arcs.map((path) => <path key={path} d={path} />)}
              </g>
              <g className='ss-electric-arcs ss-idle-arcs'>
                {idleArcs.map((path) => <path key={path} d={path} />)}
              </g>
              <g className='ss-electric-arcs ss-click-arcs'>
                {clickArcs.map((path) => <path key={path} d={path} />)}
              </g>
            </svg>
            <div className='ss-canvas' ref={host} />
          </div>
          {!reducedMotion && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type='button'
                  className='ss-motion-control'
                  onClick={() => setPaused((current) => !current)}
                  aria-label={paused ? 'Resume animations' : 'Pause animations'}
                >
                  {paused
                    ? <Play size={16} aria-hidden='true' />
                    : <Pause size={16} aria-hidden='true' />}
                </button>
              </TooltipTrigger>
              <TooltipContent side='bottom' sideOffset={8}>
                {paused ? 'Resume animations' : 'Pause animations'}
              </TooltipContent>
            </Tooltip>
          )}
          {(['back', 'front'] as const).map((side) => (
          <svg
            key={side}
            className={`ss-orbit ss-orbit-${side}`}
            ref={side === 'back' ? orbit : undefined}
            style={{
              clipPath: side === 'back'
                ? `inset(0 0 ${100 - ORBIT.cy / ORBIT.height * 100}% 0)`
                : `inset(${ORBIT.cy / ORBIT.height * 100}% 0 0 0)`,
            }}
            viewBox={`0 0 ${ORBIT.width} ${ORBIT.height}`}
            preserveAspectRatio='none'
            aria-hidden='true'
          >
            <ellipse
              className='ss-orbit-guide'
              cx={ORBIT.cx}
              cy={ORBIT.cy}
              rx={ORBIT.rx}
              ry={ORBIT.ry}
              pathLength='100'
            />
            <ellipse
              className='ss-duration-arc'
              cx={ORBIT.cx}
              cy={ORBIT.cy}
              rx={ORBIT.rx}
              ry={ORBIT.ry}
              pathLength='100'
              strokeDasharray='6 94'
              strokeDashoffset={durationArcOffset}
            />
            <ellipse
              className='ss-session-arc'
              cx={ORBIT.cx}
              cy={ORBIT.cy}
              rx={ORBIT.rx}
              ry={ORBIT.ry}
              pathLength='100'
              strokeDasharray={`${(sessionProgress * 100).toFixed(3)} 100`}
              strokeDashoffset={durationArcOffset}
            />
          </svg>
          ))}
          <div className='ss-goal-anchor' ref={goalAnchor}>
            {goals.length > 1
              ? (
                <button
                  type='button'
                  className='ss-goal-trigger'
                  ref={goalButton}
                  aria-expanded={expanded === 'goal'}
                  aria-controls='study-goals'
                  disabled={timerPhase !== 'idle'}
                  onClick={() => {
                    setExpanded(expanded === 'goal' ? null : 'goal');
                    setResult('');
                  }}
                >
                  <span className='ss-goal-copy'>
                    <small>Your next step</small>
                    <span className='ss-goal-value' key={goalId || 'focus'}>
                      {selectedGoal?.title ?? 'Focus session'}
                    </span>
                  </span>
                  <ChevronDown size={14} aria-hidden='true' />
                </button>
              )
              : (
                <span className='ss-goal-label'>
                  <span className='ss-goal-copy'>
                    <small>Your next step</small>
                    <span className='ss-goal-value' key={goalId || 'focus'}>
                      {selectedGoal?.title ?? 'Focus session'}
                    </span>
                  </span>
                </span>
              )}
            {expanded === 'goal' && goals.length > 1 && (
              <div
                id='study-goals'
                className='ss-goal-options'
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return;
                  setExpanded(null);
                  goalButton.current?.focus();
                }}
              >
                {goals.map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    aria-pressed={goalId === item.id}
                    onClick={() => {
                      setGoalId(item.id);
                      setExpanded(null);
                      goalButton.current?.focus();
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <fieldset className='ss-durations'>
            <legend className='sr-only'>Focus session duration</legend>
            {DURATIONS.map((value) => {
              const point = durationPoints?.[value];
              return (
                <label
                  key={value}
                  data-duration={value}
                  data-orbit-angle={DURATION_ANGLES[value]}
                  style={point ? { left: point.x, top: point.y } : undefined}
                >
                  <input
                    type='radio'
                    name='duration'
                    value={value}
                    checked={duration === value}
                    disabled={timerPhase !== 'idle'}
                    onChange={(event) => {
                      setDuration(value);
                      setResult('');
                      queueEggEffects(
                        eggTriggers.current.selectDuration(
                          value,
                          event.nativeEvent.timeStamp,
                          `${value}:${event.nativeEvent.timeStamp}`,
                        ),
                      );
                    }}
                  />
                  <span className='ss-duration-copy'>
                    {value} <small>min</small>
                  </span>
                  <i className='ss-duration-stem' aria-hidden='true' />
                </label>
              );
            })}
          </fieldset>
          <button
            type='button'
            className='ss-bolt-target'
            data-testid='landing-bolt'
            aria-label={timerPhase === 'running'
              ? 'Pause focus timer'
              : timerPhase === 'paused'
              ? 'Resume focus timer'
              : timerPhase === 'saving'
              ? 'Saving study session'
              : `Start a ${duration} minute focus timer`}
            aria-describedby='focus-help'
            aria-disabled={timerPhase === 'saving' || authLoading}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              drag.current = { x: event.clientX, y: event.clientY, active: true, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!drag.current.active) return;
              const x = event.clientX - drag.current.x;
              const y = event.clientY - drag.current.y;
              if (Math.hypot(x, y) > 8) drag.current.moved = true;
              if (!still && drag.current.moved) {
                setTilt({
                  x: Math.max(-10, Math.min(10, x / 8)),
                  y: Math.max(-6, Math.min(6, -y / 8)),
                });
              }
            }}
            onPointerUp={() => {
              drag.current.active = false;
              setTilt({ x: 0, y: 0 });
            }}
            onPointerCancel={() => {
              drag.current.active = false;
              drag.current.moved = true;
              setTilt({ x: 0, y: 0 });
            }}
            onClick={(event) => {
              if (event.detail === 0 || !drag.current.moved) activate();
            }}
          >
            <span className='sr-only'>Focus timer</span>
          </button>
          <div className='ss-charge-anchor' ref={chargeAnchor}>
            <span className='ss-charge-number'>
              {charge}
              <small>%</small>
            </span>
            <span>charge</span>
            {timerPhase !== 'idle' && (
              <span className='ss-timer-reading'>
                <span className='ss-bolt-countdown' aria-hidden='true'>{formatClock(remaining)}</span>
                {timerPhase === 'paused' && (
                  <span className='ss-timer-state'><Pause size={12} aria-hidden='true' />Paused</span>
                )}
              </span>
            )}
          </div>
          <div className='ss-history'>
            <div className='ss-history-marks' role='group' aria-label='This week of study'>
              {DAYS.map((day, index) => (
                <button
                  type='button'
                  key={day}
                  aria-label={`${day}: ${week[index]} minutes`}
                  aria-expanded={expanded === index}
                  aria-controls='sample-day'
                  data-studied={week[index] > 0}
                  onClick={() => {
                    setExpanded(expanded === index ? null : index);
                    setTerminalPulse((pulse) => ({ day: index, sequence: pulse.sequence + 1 }));
                    setResult('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setExpanded(null);
                  }}
                >
                  <i
                    key={terminalPulse.day === index ? terminalPulse.sequence : 0}
                    className={terminalPulse.day === index ? 'ss-terminal-pulse' : undefined}
                    style={{
                      height: `${8 + Math.min(24, week[index] / 4)}px`,
                    }}
                    aria-hidden='true'
                  />
                  <span aria-hidden='true'>{day.slice(0, 1)}</span>
                </button>
              ))}
            </div>
            <p id='sample-day' key={typeof expanded === 'number' ? expanded : 'prompt'}>
              {typeof expanded === 'number'
                ? `${DAYS[expanded]}: ${week[expanded]} minutes`
                : 'Select a day to see study minutes.'}
            </p>
          </div>
        </section>
        <div className='ss-invitation'>
          <p id='focus-help'>
            {timerPhase === 'saving'
              ? 'Saving your session'
              : `Tap the bolt to ${
                timerPhase === 'idle' ? 'start' : timerPhase === 'running' ? 'pause' : 'resume'
              } a focus session`}
          </p>
          {timerPhase !== 'idle' && (
            <p className='ss-timer-display' aria-label={`${formatClock(remaining)} remaining`}>
              {formatClock(remaining)}
            </p>
          )}
          {(timerPhase === 'running' || timerPhase === 'paused') && (
            <div className='ss-timer-actions'>
              <button type='button' onClick={() => void finishSession()}>Finish and save</button>
              <button type='button' onClick={cancelSession}>Cancel session</button>
            </div>
          )}
          <p className='ss-result' role='status' aria-atomic='true'>{result}</p>
          <p className='ss-demo-note'>
            {user ? 'Sessions save to your account.' : 'Sessions save in this browser.'}
          </p>
          {user
            ? (
              <a href='#study' className='ss-cta'>
                Manage goals <ArrowRight size={16} aria-hidden='true' />
              </a>
            )
            : (
              <Link to='/register' className='ss-cta'>
                Create an account <ArrowRight size={16} aria-hidden='true' />
              </Link>
            )}
        </div>
        <LandingStudy />
      </main>
      <LandingEasterEggPreview still={still} onPlay={queueEggEffects} />
      <footer className='ss-footer'>
        <p>Go solo, or find company in a study room.</p>
        <nav aria-label='Legal'>
          <Link to='/privacy'>Privacy</Link>
          <Link to='/terms'>Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
