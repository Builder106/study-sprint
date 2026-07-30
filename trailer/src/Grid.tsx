import { LIME } from "./theme";

export const ROWS = 7;
export const COLS = 53;
export const CELL = 13;
export const GAP = 4;

// Deterministic pseudo-random activity shape (mulberry32) mirroring the real
// seeder's arc (e2e/setup/seed-demo-history.ts): sparse in the early columns,
// then the last ~45 columns (the unbroken streak) fully lit. This is a
// stylised generative grid, not the real heatmap — exact cell values don't
// need to match the seeded account, only the left-to-right density ramp.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1337);

// col-major order: index = col * ROWS + row, matching a GitHub-style grid
// read left-to-right, top-to-bottom within a column.
export const ACTIVITY: number[] = Array.from({ length: ROWS * COLS }, (_, i) => {
  const col = Math.floor(i / ROWS);
  const streakStart = COLS - 7; // ~last 45 days across 7 columns/week
  if (col >= streakStart) return 1;
  const density = 0.05 + (col / streakStart) * 0.35;
  return rand() < density ? 1 : 0;
});

export const LIT_ORDER: number[] = ACTIVITY.map((v, i) => i).filter(
  (i) => ACTIVITY[i] === 1,
);

export const Grid: React.FC<{ litCount: number; dim?: boolean }> = ({
  litCount,
  dim = false,
}) => {
  const litSet = new Set(LIT_ORDER.slice(0, litCount));
  const width = COLS * (CELL + GAP);
  const height = ROWS * (CELL + GAP);

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const col = Math.floor(i / ROWS);
        const row = i % ROWS;
        const lit = litSet.has(i);
        return (
          <rect
            key={i}
            x={col * (CELL + GAP)}
            y={row * (CELL + GAP)}
            width={CELL}
            height={CELL}
            rx={3}
            fill={lit ? LIME : "rgba(255,255,255,0.06)"}
            opacity={lit ? (dim ? 0.35 : 1) : 1}
          />
        );
      })}
    </svg>
  );
};
