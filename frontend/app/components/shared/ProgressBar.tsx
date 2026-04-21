export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-[2px] w-full bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-[#ccff00] transition-all duration-1000 ease-out rounded-full"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
