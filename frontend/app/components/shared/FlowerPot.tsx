export type PotVariant =
  | 'seedling'
  | 'unfurl'
  | 'twin'
  | 'sapling'
  | 'bloom'
  | 'cluster'
  | 'roots';

interface Props {
  variant: PotVariant;
  size?: number;
  className?: string;
}

/**
 * A small hand-built companion to VirtualPlant — same terracotta + lime
 * palette, same organic path language — used as a per-tile marker in the
 * feature bento instead of a generic icon set. One pot shape, seven planting
 * variants, so the grid reads as a garden bed rather than a spreadsheet.
 *
 * The pot sits in a strip of grass, drawn with the same two-blade language
 * repeated at varying heights — not a soil texture asset, just more of the
 * line-and-fill vocabulary already used for the plants themselves.
 */
export function FlowerPot({ variant, size = 56, className }: Props) {
  const Contents = VARIANTS[variant];

  return (
    <svg
      viewBox='0 0 64 68'
      width={size}
      height={(size * 68) / 64}
      className={className}
      aria-hidden='true'
    >
      <Contents />
      <path d='M18 40 L46 40 L42 60 Q32 63 22 60 Z' fill='#8b5a3c' />
      <path d='M16 40 L48 40 L47 34 L17 34 Z' fill='#a5714c' />
      <ellipse cx='32' cy='34' rx='16' ry='3' fill='#5a3a26' opacity='0.4' />
      <GrassBlades />
    </svg>
  );
}

function GrassBlades() {
  return (
    <g stroke='none'>
      <path d='M5 66 Q4 58 8 52 Q9 60 9 66 Z' fill='#87a635' />
      <path d='M11 66 Q13 56 18 50 Q16 60 15 66 Z' fill='#b3e600' />
      <path d='M4 66 Q6 60 10 55 Q9 62 8 66 Z' fill='#ccff00' opacity='0.85' />
      <path d='M59 66 Q60 58 56 52 Q55 60 55 66 Z' fill='#87a635' />
      <path d='M53 66 Q51 56 46 50 Q48 60 49 66 Z' fill='#b3e600' />
      <path d='M60 66 Q58 60 54 55 Q55 62 56 66 Z' fill='#ccff00' opacity='0.85' />
    </g>
  );
}

const VARIANTS: Record<PotVariant, () => React.ReactElement> = {
  seedling: () => (
    <>
      <line
        x1='32'
        y1='34'
        x2='32'
        y2='26'
        stroke='#87a635'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path d='M32 28 Q26 25 25 19 Q31 21 32 28' fill='#ccff00' />
    </>
  ),
  unfurl: () => (
    <>
      <line
        x1='32'
        y1='34'
        x2='32'
        y2='22'
        stroke='#87a635'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path d='M32 26 Q22 24 20 14 Q30 17 32 26 Z' fill='#ccff00' />
      <path d='M32 26 Q22 24 20 14' fill='none' stroke='#87a635' strokeWidth='1' opacity='0.5' />
    </>
  ),
  twin: () => (
    <>
      <line
        x1='25'
        y1='34'
        x2='25'
        y2='24'
        stroke='#87a635'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path d='M25 27 Q19 24 18 18 Q24 20 25 27' fill='#ccff00' />
      <line
        x1='39'
        y1='34'
        x2='39'
        y2='27'
        stroke='#87a635'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path d='M39 29 Q45 27 46 22 Q40 23 39 29' fill='#b3e600' />
    </>
  ),
  sapling: () => (
    <>
      <line
        x1='32'
        y1='34'
        x2='32'
        y2='14'
        stroke='#87a635'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path d='M32 24 Q22 20 20 10 Q30 13 32 24' fill='#ccff00' />
      <path d='M32 18 Q42 14 44 6 Q34 9 32 18' fill='#b3e600' />
    </>
  ),
  bloom: () => (
    <>
      <line
        x1='32'
        y1='34'
        x2='32'
        y2='20'
        stroke='#87a635'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <circle cx='32' cy='14' r='9' fill='#ccff00' />
      <circle cx='26' cy='10' r='3' fill='#fff' />
      <circle cx='38' cy='10' r='3' fill='#fff' />
      <circle cx='32' cy='6' r='3' fill='#fff' />
      <circle cx='32' cy='14' r='2.5' fill='#e5ff4d' />
    </>
  ),
  cluster: () => (
    <>
      <line
        x1='22'
        y1='34'
        x2='22'
        y2='24'
        stroke='#87a635'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <circle cx='22' cy='20' r='5' fill='#ccff00' />
      <circle cx='19' cy='18' r='1.6' fill='#fff' />
      <line
        x1='32'
        y1='34'
        x2='32'
        y2='18'
        stroke='#87a635'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <circle cx='32' cy='13' r='6' fill='#b3e600' />
      <circle cx='29' cy='10' r='1.8' fill='#fff' />
      <line
        x1='42'
        y1='34'
        x2='42'
        y2='26'
        stroke='#87a635'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <circle cx='42' cy='22' r='5' fill='#e5ff4d' />
      <circle cx='45' cy='20' r='1.6' fill='#fff' />
    </>
  ),
  roots: () => (
    <>
      <line
        x1='26'
        y1='34'
        x2='26'
        y2='26'
        stroke='#87a635'
        strokeWidth='1.8'
        strokeLinecap='round'
      />
      <path d='M26 28 Q19 26 18 20 Q24 22 26 28' fill='#ccff00' />
      <line
        x1='38'
        y1='34'
        x2='38'
        y2='24'
        stroke='#87a635'
        strokeWidth='1.8'
        strokeLinecap='round'
      />
      <path d='M38 27 Q46 24 47 17 Q40 19 38 27' fill='#b3e600' />
    </>
  ),
};
