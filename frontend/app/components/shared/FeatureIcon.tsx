type FeatureIconName = 'timer' | 'syllabus' | 'rooms' | 'analytics' | 'achievements' | 'source';

const PATHS: Record<FeatureIconName, React.ReactNode> = {
  timer: <><circle cx='32' cy='34' r='18' /><path d='M32 22v13l9 5M25 8h14M32 8v8' /></>,
  syllabus: <><path d='M18 10h22l8 8v36H18z' /><path d='M40 10v10h8M25 29h16M25 37h16M25 45h10' /></>,
  rooms: <><circle cx='25' cy='25' r='7' /><circle cx='41' cy='25' r='7' /><path d='M13 49c1-9 8-14 12-14s11 5 12 14M27 49c1-7 7-11 14-11s12 4 14 11' /></>,
  analytics: <><path d='M14 51V15M14 51h38M23 43V31M32 43V21M41 43V27' /></>,
  achievements: <><path d='M20 13h24v15c0 10-5 17-12 21-7-4-12-11-12-21zM32 49v8M23 57h18' /><path d='m32 23 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z' /></>,
  source: <><path d='M25 18 11 32l14 14M39 18l14 14-14 14M35 13l-6 38' /></>,
};

export function FeatureIcon({ name, size = 64 }: { name: FeatureIconName; size?: number }) {
  return <svg viewBox='0 0 64 64' width={size} height={size} aria-hidden='true' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>{PATHS[name]}</svg>;
}
