import { CircleDot } from "lucide-react";
import type { GoalStatus } from "@/lib/types";

const STYLES: Record<GoalStatus, { wrap: string; dot: string; label: string }> = {
  Active: {
    wrap: "bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20",
    dot: "fill-[#ccff00] text-transparent",
    label: "Active",
  },
  Paused: {
    wrap: "text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10",
    dot: "fill-zinc-500 text-transparent",
    label: "Paused",
  },
  Completed: {
    wrap: "text-emerald-400 border border-emerald-400/20 bg-emerald-400/10",
    dot: "fill-emerald-400 text-transparent",
    label: "Done",
  },
};

export function StatusBadge({ status }: { status: GoalStatus }) {
  const s = STYLES[status] ?? STYLES.Active;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${s.wrap}`}
    >
      <CircleDot className={`w-3 h-3 ${s.dot}`} />
      {s.label}
    </span>
  );
}
