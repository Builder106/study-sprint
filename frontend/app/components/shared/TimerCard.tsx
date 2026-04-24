import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { formatClock } from "@/lib/format";

export type TimerMode = "stopwatch" | "pomodoro";
export type PomodoroPhase = "work" | "short_break" | "long_break";

const WORK_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;
const LONG_BREAK_EVERY = 4;

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

function phaseDuration(phase: PomodoroPhase): number {
  return phase === "work"
    ? WORK_SECONDS
    : phase === "short_break"
      ? SHORT_BREAK_SECONDS
      : LONG_BREAK_SECONDS;
}

interface Props {
  /** Called when a Pomodoro work phase completes, or when the user clicks "Log session" in stopwatch mode. */
  onLogSession: (suggestedMinutes: number) => void;
}

export function TimerCard({ onLogSession }: Props) {
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [running, setRunning] = useState(false);

  // Stopwatch state
  const [elapsed, setElapsed] = useState(0);

  // Pomodoro state
  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [remaining, setRemaining] = useState<number>(WORK_SECONDS);
  const [cycles, setCycles] = useState(0);
  const phaseRef = useRef(phase);
  const cyclesRef = useRef(cycles);
  phaseRef.current = phase;
  cyclesRef.current = cycles;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (mode === "stopwatch") {
        setElapsed((prev) => prev + 1);
      } else {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Phase complete
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  const handlePhaseComplete = () => {
    const current = phaseRef.current;
    const cyclesNow = cyclesRef.current;
    if (current === "work") {
      // Open the log-session prompt with the phase duration pre-filled
      onLogSession(Math.round(WORK_SECONDS / 60));
      const nextCycles = cyclesNow + 1;
      setCycles(nextCycles);
      const nextPhase: PomodoroPhase =
        nextCycles % LONG_BREAK_EVERY === 0 ? "long_break" : "short_break";
      setPhase(nextPhase);
      setRemaining(phaseDuration(nextPhase));
    } else {
      setPhase("work");
      setRemaining(WORK_SECONDS);
    }
  };

  const onToggleRunning = () => setRunning((r) => !r);

  const onReset = () => {
    setRunning(false);
    if (mode === "stopwatch") {
      setElapsed(0);
    } else {
      setRemaining(phaseDuration(phase));
    }
  };

  const onSkip = () => {
    if (mode !== "pomodoro") return;
    handlePhaseComplete();
  };

  const onModeChange = (next: TimerMode) => {
    if (next === mode) return;
    setRunning(false);
    setMode(next);
    if (next === "stopwatch") {
      setElapsed(0);
    } else {
      setPhase("work");
      setRemaining(WORK_SECONDS);
      setCycles(0);
    }
  };

  const display =
    mode === "stopwatch" ? formatClock(elapsed) : formatClock(remaining);

  const suggestedMinutes =
    mode === "stopwatch" ? Math.max(0, Math.floor(elapsed / 60)) : 0;

  return (
    <div>
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-zinc-200 dark:border-white/10 mb-8">
        {(["stopwatch", "pomodoro"] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            aria-pressed={mode === m}
            className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-colors ${
              mode === m
                ? "bg-[#ccff00] text-black"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {m === "stopwatch" ? "Stopwatch" : "Pomodoro"}
          </button>
        ))}
      </div>

      {mode === "pomodoro" && (
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
              phase === "work"
                ? "border-[#ccff00]/30 bg-[#ccff00]/10 text-[#ccff00]"
                : "border-zinc-200 dark:border-white/10 text-zinc-500"
            }`}
          >
            {PHASE_LABELS[phase]}
          </span>
          <span className="text-[10px] font-medium text-zinc-500 tracking-widest uppercase tabular-nums">
            Cycle {cycles % LONG_BREAK_EVERY || LONG_BREAK_EVERY} / {LONG_BREAK_EVERY}
          </span>
        </div>
      )}

      <div className="py-12 border-y border-zinc-200 dark:border-white/10 my-12 flex justify-start items-center">
        <div className="text-[80px] sm:text-[100px] xl:text-[120px] font-medium tracking-tighter leading-none tabular-nums text-zinc-900 dark:text-zinc-50 font-mono">
          {display}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onToggleRunning}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-full text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors focus:outline-none ${
            running
              ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
              : "bg-[#ccff00] text-black hover:bg-[#b3e600]"
          }`}
        >
          {running ? (
            <>
              <Pause className="w-4 h-4" fill="currentColor" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" fill="currentColor" /> Start
            </>
          )}
        </button>

        {mode === "stopwatch" ? (
          <button
            onClick={() => {
              setRunning(false);
              onLogSession(suggestedMinutes);
            }}
            className="flex-1 flex items-center justify-center gap-3 py-4 rounded-full text-xs sm:text-sm font-bold tracking-widest uppercase border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 text-zinc-900 dark:text-zinc-50 transition-colors focus:outline-none"
          >
            Log session
          </button>
        ) : (
          <button
            onClick={onSkip}
            aria-label="Skip phase"
            className="flex-1 flex items-center justify-center gap-3 py-4 rounded-full text-xs sm:text-sm font-bold tracking-widest uppercase border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 text-zinc-900 dark:text-zinc-50 transition-colors focus:outline-none"
          >
            <SkipForward className="w-4 h-4" /> Skip
          </button>
        )}

        <button
          onClick={onReset}
          aria-label="Reset timer"
          className="sm:w-14 flex items-center justify-center gap-2 py-4 rounded-full text-xs sm:text-sm font-bold tracking-widest uppercase border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
