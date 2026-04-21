export function minutesToHours(mins: number): number {
  return Math.round((mins / 60) * 10) / 10;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function progressPercent(loggedMinutes: number, targetHours: number | string): number {
  const target = Number(targetHours);
  if (!Number.isFinite(target) || target <= 0) return 0;
  const pct = (loggedMinutes / (target * 60)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
