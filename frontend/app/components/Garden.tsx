import { Link } from "react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { TopNav } from "./shared/TopNav";
import { VirtualPlant, type PlantStage } from "./shared/VirtualPlant";
import { Spinner } from "./shared/Spinner";

type Profile = Awaited<ReturnType<typeof api.gamificationProfile>>;

const STAGE_LABEL: Record<PlantStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  sapling: "Sapling",
  young_tree: "Young tree",
  mature_tree: "Mature tree",
  blooming: "Blooming",
};

export function Garden() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .gamificationProfile()
      .then(setProfile)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Failed to load garden"),
      );
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans">
      <TopNav />
      <main className="max-w-5xl mx-auto px-8 py-16 space-y-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-[#ccff00] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ccff00] mb-4">
            <Sparkles className="w-4 h-4" />
            Garden
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tighter">Keep it growing.</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 font-light text-lg">
            Your plant grows as you log focused study sessions.
          </p>
        </div>

        {error && (
          <div className="text-xs text-red-400 font-medium" role="alert">{error}</div>
        )}

        {!profile && !error && <Spinner label="Loading garden" />}

        {profile && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-1 flex justify-center">
                <div className="p-8 rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-50">
                  <VirtualPlant stage={profile.pet_stage} size={160} />
                  <div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {STAGE_LABEL[profile.pet_stage]}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="flex items-baseline gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Level
                    </div>
                    <div className="text-6xl font-medium tracking-tighter text-[#ccff00] tabular-nums">
                      {profile.level}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>
                        {profile.xp_into_level} / {profile.xp_for_next_level} XP
                      </span>
                      <span>
                        {Math.round(profile.progress_to_next * 100)}% to L{profile.level + 1}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ccff00] transition-all duration-500"
                        style={{ width: `${profile.progress_to_next * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <StatBox
                    icon={<Flame className="w-4 h-4" />}
                    label="Current streak"
                    value={`${profile.current_streak_days}d`}
                    accent
                  />
                  <StatBox
                    icon={<Flame className="w-4 h-4" />}
                    label="Longest streak"
                    value={`${profile.longest_streak_days}d`}
                  />
                  <StatBox
                    icon={<Zap className="w-4 h-4" />}
                    label="Total XP"
                    value={profile.xp.toLocaleString()}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Achievements ({profile.achievements.filter((a) => a.unlocked).length}/{profile.achievements.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {profile.achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                      a.unlocked
                        ? "border-[#ccff00]/30 bg-[#ccff00]/5"
                        : "border-zinc-200 dark:border-white/10 opacity-50"
                    }`}
                  >
                    <Trophy
                      className={`w-4 h-4 mt-1 flex-shrink-0 ${
                        a.unlocked ? "text-[#ccff00]" : "text-zinc-400 dark:text-zinc-600"
                      }`}
                    />
                    <div>
                      <div
                        className={`text-xs font-bold uppercase tracking-widest ${
                          a.unlocked ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500"
                        }`}
                      >
                        {a.label}
                      </div>
                      <div className="text-xs text-zinc-500 font-light mt-1">
                        {a.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        accent
          ? "border-[#ccff00]/30 bg-[#ccff00]/5"
          : "border-zinc-200 dark:border-white/10"
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
        {icon}
        {label}
      </div>
      <div
        className={`text-2xl font-medium tracking-tighter tabular-nums ${
          accent ? "text-[#ccff00]" : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
