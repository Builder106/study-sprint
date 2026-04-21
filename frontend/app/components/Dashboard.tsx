import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronRight, Activity } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { minutesToHours, progressPercent } from "@/lib/format";
import type { Goal } from "@/lib/types";
import { StatusBadge } from "./shared/StatusBadge";
import { ProgressBar } from "./shared/ProgressBar";
import { TopNav } from "./shared/TopNav";

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listGoals()
      .then((res) => setGoals(res.goals))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Failed to load goals"),
      );
  }, []);

  const stats = useMemo(() => {
    if (!goals) return { active: 0, hours: 0 };
    const active = goals.filter((g) => g.status === "Active").length;
    const hours = Math.round(
      goals.reduce((sum, g) => sum + g.logged_minutes, 0) / 60,
    );
    return { active, hours };
  }, [goals]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 font-sans selection:bg-[#ccff00] selection:text-black">
      <TopNav
        right={
          <Link
            to="/goals/new"
            aria-label="New goal"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#ccff00] text-black hover:bg-[#b3e600] transition-colors focus:outline-none"
          >
            <Plus className="w-5 h-5" />
          </Link>
        }
      />

      <main className="max-w-5xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ccff00] mb-4">
              <Activity className="w-4 h-4" />
              Welcome back
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-50">
              Your sprints.
            </h1>
            <p className="text-zinc-400 mt-2 font-light text-lg">
              Ready to conquer your goals today?
            </p>
          </div>

          <div className="flex gap-8 text-right">
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Active
              </div>
              <div className="text-3xl font-medium tracking-tighter text-[#ccff00]">
                {stats.active}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Hours Logged
              </div>
              <div className="text-3xl font-medium tracking-tighter text-zinc-50">
                {stats.hours}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 text-xs text-red-400 font-medium" role="alert">
            {error}
          </div>
        )}

        {goals === null && !error && (
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest py-16">
            Loading goals…
          </div>
        )}

        {goals && goals.length === 0 && (
          <div className="border border-white/10 rounded-2xl py-16 px-8 text-center space-y-4">
            <div className="text-sm text-zinc-400 font-light">No goals yet.</div>
            <Link
              to="/goals/new"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-xs font-bold tracking-widest uppercase bg-[#ccff00] text-black hover:bg-[#b3e600] transition-colors"
            >
              <Plus className="w-4 h-4" /> Create first goal
            </Link>
          </div>
        )}

        {goals && goals.length > 0 && (
          <div className="border-t border-white/10">
            {goals.map((goal) => {
              const percent = progressPercent(goal.logged_minutes, goal.target_hours);
              const logged = minutesToHours(goal.logged_minutes);
              const target = Number(goal.target_hours);
              return (
                <Link to={`/goal/${goal.id}`} key={goal.id} className="block group">
                  <div className="py-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-8 group-hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-xl">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                        <h3 className="text-xl md:text-2xl font-medium tracking-tight text-zinc-50 group-hover:text-[#ccff00] transition-colors">
                          {goal.title}
                        </h3>
                        <div className="flex-shrink-0">
                          <StatusBadge status={goal.status} />
                        </div>
                      </div>

                      <div className="flex gap-6 text-sm text-zinc-500 font-light">
                        <span>
                          Target: <span className="text-zinc-300">{target}h</span>
                        </span>
                        <span>
                          Logged: <span className="text-[#ccff00]">{logged}h</span>
                        </span>
                      </div>

                      <div className="w-full max-w-xl flex items-center gap-4 mt-2">
                        <div className="flex-1">
                          <ProgressBar percent={percent} />
                        </div>
                        <span className="text-xs font-medium text-zinc-500 tabular-nums w-10 text-right">
                          {percent}%
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-full border border-white/10 group-hover:border-[#ccff00] group-hover:text-[#ccff00] transition-colors">
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
