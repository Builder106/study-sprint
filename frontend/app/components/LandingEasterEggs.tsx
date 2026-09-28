import { useEffect, useMemo, useRef } from 'react';
import type { LandingEasterEggEffect } from '@/lib/landingEasterEggs';
import '../../styles/landing-easter-eggs.css';

type LandingEasterEggsProps = {
  effect: LandingEasterEggEffect;
  onComplete: () => void;
  paths?: string[];
};

const RING = { cx: 500, cy: 341, rx: 356, ry: 94 } as const;

function ringPath(start: number, sweep: number, steps: number): string {
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = start + sweep * index / steps;
    const radius = 1 + (Math.random() - 0.5) * 0.035;
    const x = RING.cx + Math.cos(angle) * RING.rx * radius;
    const y = RING.cy + Math.sin(angle) * RING.ry * radius;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `M ${points.join(' L ')}`;
}

function randomRingLap(): string {
  const start = Math.random() * Math.PI * 2;
  const direction = Math.random() < 0.5 ? 1 : -1;
  return ringPath(start, direction * Math.PI * 2, 18);
}

function durationSequencePath(): string {
  const radians = [218, 124, 20].map((degrees) => degrees * Math.PI / 180);
  const points = radians.flatMap((start, index) => {
    const end = radians[index + 1];
    if (end === undefined) return [];
    const span = end - start;
    return Array.from({ length: 6 }, (_, step) => {
      const angle = start + span * step / 5;
      const radius = 1 + (Math.random() - 0.5) * 0.018;
      const x = RING.cx + Math.cos(angle) * RING.rx * radius;
      const y = RING.cy + Math.sin(angle) * RING.ry * radius;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
  });
  return `M ${points.join(' L ')}`;
}

function randomRingArc(): string {
  const start = Math.random() * Math.PI * 2;
  const sweep = (Math.PI * (0.55 + Math.random() * 0.2)) * (Math.random() < 0.5 ? 1 : -1);
  return ringPath(start, sweep, 9);
}

function randomSparkToBolt(): string {
  const angle = Math.random() * Math.PI * 2;
  const startX = RING.cx + Math.cos(angle) * RING.rx;
  const startY = RING.cy + Math.sin(angle) * RING.ry;
  const endX = 490 + Math.random() * 34;
  const endY = 236 + Math.random() * 52;
  const bendX = startX + (endX - startX) * (0.42 + Math.random() * 0.18);
  const bendY = startY + (endY - startY) * (0.42 + Math.random() * 0.18);
  const offset = (Math.random() - 0.5) * 28;
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${bendX.toFixed(1)} ${(bendY + offset).toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

function randomBoltArcs(): string[] {
  const edges = [
    [[553, 42], [368, 287]],
    [[368, 287], [488, 292]],
    [[488, 292], [450, 473]],
    [[450, 473], [637, 226]],
    [[637, 226], [515, 222]],
    [[515, 222], [553, 42]],
  ] as const;
  const count = 3 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, () => {
    const [[ax, ay], [bx, by]] = edges[Math.floor(Math.random() * edges.length)];
    const t = 0.18 + Math.random() * 0.64;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const length = 22 + Math.random() * 34;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const steps = 4;
    const points = Array.from({ length: steps + 1 }, (_, index) => {
      const distance = length * index / steps;
      const jitter = index === steps ? 0 : (Math.random() - 0.5) * 18;
      return `${(x + direction * distance + jitter).toFixed(1)} ${(y + distance * 0.5 - jitter).toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  });
}

function renderEffect(effect: LandingEasterEggEffect, paths: string[]) {
  switch (effect.type) {
    case 'week-circuit':
      return <path className='ss-easter-egg__ring-spark' d={paths[0]} pathLength='100' />;
    case 'full-charge':
      return (
        <>
          <path className='ss-easter-egg__ring-spark' d={paths[0]} pathLength='100' />
          <path className='ss-easter-egg__bolt-strike' d={paths[1]} />
        </>
      );
    case 'duration-sequence':
      return <path className='ss-easter-egg__ring-spark' d={paths[0]} pathLength='100' />;
    case 'overcharge':
      return (
        <g className='ss-easter-egg__branches'>
          {paths.slice(2).map((path) => <path key={path} d={path} />)}
        </g>
      );
    case 'week-and-charge':
      return (
        <>
          <path className='ss-easter-egg__ring-spark' d={paths[0]} pathLength='100' />
          <path className='ss-easter-egg__bolt-strike' d={paths[1]} />
        </>
      );
  }
}

export function LandingEasterEggs({ effect, onComplete, paths: suppliedPaths }: LandingEasterEggsProps) {
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const paths = useMemo(() => {
    if (suppliedPaths?.length) return suppliedPaths;
    const ring = effect.type === 'week-circuit' || effect.type === 'week-and-charge'
      ? randomRingLap()
      : effect.type === 'duration-sequence'
      ? durationSequencePath()
      : randomRingArc();
    const bolt = randomSparkToBolt();
    return [ring, bolt, ...randomBoltArcs()];
  }, [effect.type, suppliedPaths]);

  useEffect(() => {
    const duration = effect.type === 'overcharge' ? 900 : effect.type === 'duration-sequence' ? 1050 : 1350;
    const timeout = window.setTimeout(() => complete.current(), duration + 100);
    return () => window.clearTimeout(timeout);
  }, [effect.type]);

  return (
    <svg
      className='ss-easter-egg'
      data-easter-egg={effect.type}
      viewBox='0 0 1000 594'
      preserveAspectRatio='none'
      aria-hidden='true'
      focusable='false'
    >
      {renderEffect(effect, paths)}
    </svg>
  );
}
