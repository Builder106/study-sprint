import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface BatteryBoltProps {
  chargePct: number;
  size?: number;
  className?: string;
}

const BOLT_PATH = 'M69 21L36 66H58.5L51 99L84 54H61.5L69 21Z';
const BOLT_BOTTOM = 99;
const BOLT_HEIGHT = 78;
const COLOR_STOPS: ReadonlyArray<{ pct: number; rgb: readonly [number, number, number] }> = [
  { pct: 0, rgb: [239, 68, 68] },
  { pct: 50, rgb: [245, 158, 11] },
  { pct: 100, rgb: [204, 255, 0] },
];

export function clampCharge(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

export function chargeToFillColor(pct: number): string {
  const value = clampCharge(pct);
  const upperIndex = COLOR_STOPS.findIndex((stop) => stop.pct >= value);
  const upper = COLOR_STOPS[upperIndex === -1 ? COLOR_STOPS.length - 1 : upperIndex];
  const lower = COLOR_STOPS[Math.max(0, upperIndex - 1)];
  const t = lower.pct === upper.pct ? 0 : (value - lower.pct) / (upper.pct - lower.pct);
  const rgb = lower.rgb.map((channel, index) => Math.round(channel + (upper.rgb[index] - channel) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function batteryAriaLabel(pct: number): string {
  return `Battery at ${Math.round(clampCharge(pct))}% charge`;
}

export function BatteryBolt({ chargePct, size = 120, className }: BatteryBoltProps) {
  const pct = clampCharge(chargePct);
  const reducedMotion = useReducedMotion();
  const clipId = `battery-bolt-${useId()}`;
  const fillHeight = (pct / 100) * BOLT_HEIGHT;

  return (
    <svg viewBox='0 0 120 120' width={size} height={size} className={className} role='img' aria-label={batteryAriaLabel(pct)}>
      <defs><clipPath id={clipId}><path d={BOLT_PATH} /></clipPath></defs>
      <path d={BOLT_PATH} fill='currentColor' opacity='0.13' />
      <motion.g
        clipPath={`url(#${clipId})`}
        animate={pct >= 80 && !reducedMotion ? { opacity: [0.72, 1, 0.72] } : { opacity: 1 }}
        transition={pct >= 80 && !reducedMotion ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
      >
        <motion.rect
          x={36}
          width={48}
          fill={chargeToFillColor(pct)}
          initial={false}
          animate={{ y: BOLT_BOTTOM - fillHeight, height: fillHeight }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 13, mass: 0.9 }}
        />
      </motion.g>
    </svg>
  );
}
