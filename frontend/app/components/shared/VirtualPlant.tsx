import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type PlantStage =
  | 'seed'
  | 'sprout'
  | 'sapling'
  | 'young_tree'
  | 'mature_tree'
  | 'blooming';

interface Props {
  stage: PlantStage;
  size?: number;
  className?: string;
}

const GROUND = <ellipse cx='60' cy='102' rx='52' ry='6' fill='currentColor' opacity='0.15' />;

const PIVOT = { transformOrigin: '60px 100px' } as const;

const STAGES: Record<PlantStage, () => React.ReactElement> = {
  seed: Seed,
  sprout: Sprout,
  sapling: Sapling,
  young_tree: YoungTree,
  mature_tree: MatureTree,
  blooming: BloomingTree,
};

export function VirtualPlant({ stage, size = 120, className }: Props) {
  const StageGlyph = STAGES[stage];
  const swayAmount = stage === 'seed' ? 0 : stage === 'sprout' ? 1 : 1.8;
  const shouldReduceMotion = useReducedMotion();

  return (
    <svg
      viewBox='0 0 120 120'
      width={size}
      height={size}
      className={className}
      role='img'
      aria-label={`Your study plant, ${stage.replace('_', ' ')}`}
    >
      {GROUND}
      <AnimatePresence mode='wait'>
        <motion.g
          key={stage}
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.35 }}
          transition={{ type: 'spring', stiffness: 160, damping: 13, mass: 0.9 }}
          style={PIVOT}
        >
          <motion.g
            animate={swayAmount > 0 && !shouldReduceMotion
              ? { rotate: [-swayAmount, swayAmount, -swayAmount] }
              : undefined}
            transition={{
              duration: 5,
              repeat: shouldReduceMotion ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            style={PIVOT}
          >
            <StageGlyph />
          </motion.g>
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}

function Seed() {
  return (
    <>
      <path
        d='M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z'
        fill='#8b5a3c'
      />
      <ellipse cx='60' cy='98' rx='6' ry='4' fill='#5a3a26' />
    </>
  );
}

function Sprout() {
  return (
    <>
      <path
        d='M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z'
        fill='#8b5a3c'
      />
      <line
        x1='60'
        y1='94'
        x2='60'
        y2='80'
        stroke='#87a635'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path d='M60 82 Q52 78 50 70 Q58 72 60 82' fill='#ccff00' />
      <path d='M60 84 Q68 80 70 72 Q62 74 60 84' fill='#b3e600' />
    </>
  );
}

function Sapling() {
  return (
    <>
      <path d='M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z' fill='#8b5a3c' />
      <line
        x1='60'
        y1='94'
        x2='60'
        y2='60'
        stroke='#87a635'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path d='M60 80 Q48 74 44 60 Q58 64 60 80' fill='#ccff00' />
      <path d='M60 70 Q72 64 76 50 Q62 54 60 70' fill='#b3e600' />
      <path d='M60 62 Q52 56 50 44 Q58 48 60 62' fill='#ccff00' opacity='0.9' />
    </>
  );
}

/** Tapered trunk with a pair of branch flares — shared shape language across
 * the three tallest stages, scaled by how tall the canopy sits above it. */
function Trunk({ canopyBase }: { canopyBase: number }) {
  return (
    <>
      <path
        d={`M57 96 C57 ${canopyBase + 30} 58 ${canopyBase + 8} 60 ${canopyBase} C62 ${
          canopyBase + 8
        } 63 ${canopyBase + 30} 63 96 Z`}
        fill='#8b5a3c'
      />
      <path
        d={`M60 ${canopyBase + 24} C52 ${canopyBase + 20} 49 ${canopyBase + 12} 48 ${
          canopyBase + 4
        } C55 ${canopyBase + 7} 59 ${canopyBase + 15} 60 ${canopyBase + 24} Z`}
        fill='#8b5a3c'
      />
      <path
        d={`M60 ${canopyBase + 24} C68 ${canopyBase + 20} 71 ${canopyBase + 12} 72 ${
          canopyBase + 4
        } C65 ${canopyBase + 7} 61 ${canopyBase + 15} 60 ${canopyBase + 24} Z`}
        fill='#8b5a3c'
      />
    </>
  );
}

/** An organic canopy built from overlapping puffs rather than a few plain
 * circles — a shadow layer, a mid-tone body, and a sunlit crown, so the
 * silhouette reads as foliage instead of stacked bubbles. */
function Canopy({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const puffs: Array<{ dx: number; dy: number; scale: number; fill: string }> = [
    { dx: -0.62, dy: 0.22, scale: 0.62, fill: '#87a635' },
    { dx: 0.62, dy: 0.22, scale: 0.62, fill: '#87a635' },
    { dx: -0.38, dy: -0.28, scale: 0.72, fill: '#b3e600' },
    { dx: 0.38, dy: -0.28, scale: 0.72, fill: '#b3e600' },
    { dx: 0, dy: -0.08, scale: 0.92, fill: '#ccff00' },
    { dx: -0.14, dy: -0.58, scale: 0.5, fill: '#e5ff4d' },
    { dx: 0.2, dy: -0.5, scale: 0.42, fill: '#e5ff4d' },
  ];

  return (
    <g>
      {puffs.map(({ dx, dy, scale, fill }, i) => (
        <circle
          key={i}
          cx={cx + dx * r}
          cy={cy + dy * r}
          r={r * scale}
          fill={fill}
        />
      ))}
    </g>
  );
}

function Blossom({ cx, cy, r = 3 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy - r} rx={r * 0.6} ry={r} fill='#fff' />
      <ellipse cx={cx} cy={cy + r} rx={r * 0.6} ry={r} fill='#fff' />
      <ellipse cx={cx - r} cy={cy} rx={r} ry={r * 0.6} fill='#fff' />
      <ellipse cx={cx + r} cy={cy} rx={r} ry={r * 0.6} fill='#fff' />
      <circle cx={cx} cy={cy} r={r * 0.55} fill='#e5ff4d' />
    </g>
  );
}

function YoungTree() {
  return (
    <>
      <Trunk canopyBase={48} />
      <Canopy cx={60} cy={44} r={22} />
    </>
  );
}

function MatureTree() {
  return (
    <>
      <Trunk canopyBase={42} />
      <Canopy cx={60} cy={36} r={27} />
    </>
  );
}

function BloomingTree() {
  return (
    <>
      <Trunk canopyBase={40} />
      <Canopy cx={60} cy={32} r={29} />
      <Blossom cx={38} cy={38} r={2.6} />
      <Blossom cx={82} cy={34} r={2.4} />
      <Blossom cx={60} cy={16} r={2.8} />
      <Blossom cx={48} cy={54} r={2.2} />
      <Blossom cx={72} cy={56} r={2.6} />
      <Blossom cx={30} cy={54} r={2.2} />
      <Blossom cx={90} cy={50} r={2.2} />
      <Blossom cx={60} cy={44} r={2} />
    </>
  );
}
