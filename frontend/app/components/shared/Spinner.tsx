import { Loader2 } from "lucide-react";

interface Props {
  label?: string;
  size?: number;
  className?: string;
}

export function Spinner({ label, size = 16, className = "" }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-3 text-zinc-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="animate-spin text-[#ccff00]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      )}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
