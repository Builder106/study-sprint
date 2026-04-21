import { Link, useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Pause, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatClock, formatDate, formatDuration, minutesToHours, progressPercent } from "@/lib/format";
import type { Goal, StudySession } from "@/lib/types";
import { ProgressBar } from "./shared/ProgressBar";
import { TopNav } from "./shared/TopNav";
import { SessionModal } from "./shared/SessionModal";

export function GoalDetail() {
  const { id } = useParams();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerStartMinutes = useRef<number>(0);

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getGoal(id), api.listSessions(id)])
      .then(([g, s]) => {
        setGoal(g.goal);
        setSessions(s.sessions);
      })
      .catch((err: unknown) =>
        setLoadError(err instanceof ApiError ? err.message : "Failed to load goal"),
      );
  }, [id]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleStartPause = () => {
    if (!timerRunning) {
      timerStartMinutes.current = Math.floor(elapsed / 60);
    }
    setTimerRunning(!timerRunning);
  };

  const handleStopAndLog = () => {
    setTimerRunning(false);
    setEditingSession(null);
    setShowModal(true);
  };

  const onSessionSaved = (saved: StudySession) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    if (id) {
      api.getGoal(id).then((g) => setGoal(g.goal)).catch(() => {});
    }
    setElapsed(0);
    setShowModal(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm("Delete this session?")) return;
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (id) api.getGoal(id).then((g) => setGoal(g.goal)).catch(() => {});
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete session");
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50">
        <TopNav />
        <main className="max-w-5xl mx-auto px-8 py-16">
          <div className="text-xs text-red-400 font-medium">{loadError}</div>
        </main>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50">
        <TopNav />
        <main className="max-w-5xl mx-auto px-8 py-16 text-xs font-bold text-zinc-500 uppercase tracking-widest">
          Loading…
        </main>
      </div>
    );
  }

  const targetHours = Number(goal.target_hours);
  const loggedHours = minutesToHours(goal.logged_minutes);
  const remainingHours = Math.max(0, Math.round((targetHours - loggedHours) * 10) / 10);
  const percent = progressPercent(goal.logged_minutes, goal.target_hours);
  const initialMinutes = Math.floor(elapsed / 60);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-[#ccff00] selection:text-black">
      <TopNav
        right={
          <Link
            to={`/goal/${goal.id}/details`}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#ccff00] transition-colors"
          >
            Details
          </Link>
        }
      />

      <main className="max-w-5xl mx-auto px-8 py-12 lg:py-24">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-[#ccff00] mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to sprints
        </Link>

        <div className="flex flex-col lg:flex-row gap-16 xl:gap-24">
          <div className="flex-1 lg:max-w-xl">
            <h1 className="text-3xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-zinc-50 mb-8 leading-[1.1]">
              {goal.title}
            </h1>

            <div className="py-12 border-y border-zinc-200 dark:border-white/10 my-12 flex justify-start items-center">
              <div className="text-[100px] md:text-[140px] font-medium tracking-tighter leading-none tabular-nums text-zinc-900 dark:text-zinc-50 font-mono">
                {formatClock(elapsed)}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <button
                onClick={handleStartPause}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-colors focus:outline-none ${
                  timerRunning
                    ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                    : "bg-[#ccff00] text-black hover:bg-[#b3e600]"
                }`}
              >
                {timerRunning ? (
                  <>
                    <Pause className="w-4 h-4" fill="currentColor" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" /> Start Timer
                  </>
                )}
              </button>
              <button
                onClick={handleStopAndLog}
                className="flex-1 flex items-center justify-center gap-3 py-4 rounded-full text-sm font-bold tracking-widest uppercase border border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/50 text-zinc-900 dark:text-zinc-50 transition-colors focus:outline-none"
              >
                Log session
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-16">
            <div className="flex gap-12 border-b border-zinc-200 dark:border-white/10 pb-8">
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Target</div>
                <div className="text-2xl font-medium tracking-tighter text-zinc-900 dark:text-zinc-50">
                  {targetHours}
                  <span className="text-zinc-500 font-light">h</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#ccff00] uppercase tracking-widest mb-2">Logged</div>
                <div className="text-2xl font-medium tracking-tighter text-[#ccff00]">
                  {loggedHours}
                  <span className="text-[#ccff00]/50 font-light">h</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Remaining</div>
                <div className="text-2xl font-medium tracking-tighter text-zinc-900 dark:text-zinc-50">
                  {remainingHours}
                  <span className="text-zinc-500 font-light">h</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Overall Progress</span>
                <span className="text-[#ccff00]">{percent}%</span>
              </div>
              <ProgressBar percent={percent} />
            </div>

            <div className="pt-8">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-8">Recent Sessions</h2>
              {sessions.length === 0 ? (
                <div className="text-xs text-zinc-500 font-light">No sessions logged yet.</div>
              ) : (
                <div className="space-y-0">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="py-6 border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between group"
                    >
                      <div className="flex-shrink-0 flex sm:flex-col gap-4 sm:gap-1">
                        <div className="text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                          {formatDate(session.logged_at)}
                        </div>
                        <div className="text-xl font-medium tracking-tighter text-[#ccff00]">
                          {formatDuration(session.duration_minutes)}
                        </div>
                      </div>
                      <div className="flex-1 text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed max-w-sm">
                        {session.notes || <span className="text-zinc-400 dark:text-zinc-600">No notes</span>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 self-start">
                        <button
                          onClick={() => {
                            setEditingSession(session);
                            setShowModal(true);
                          }}
                          aria-label="Edit session"
                          className="p-2 text-zinc-500 hover:text-[#ccff00] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          aria-label="Delete session"
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showModal && goal && (
        <SessionModal
          goalId={goal.id}
          initialMinutes={editingSession ? undefined : initialMinutes}
          session={editingSession}
          onClose={() => {
            setShowModal(false);
            setEditingSession(null);
          }}
          onSaved={onSessionSaved}
        />
      )}
    </div>
  );
}
