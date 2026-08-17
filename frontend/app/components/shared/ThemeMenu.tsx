import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const;

/**
 * Theme switcher shared by the landing page and the sign-in page.
 *
 * Extracted from the original Landing component when the landing page and the
 * auth form were split across two routes — both still need the control, and
 * duplicating the menu markup in two places would let the two copies drift.
 */
export function ThemeMenu() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const CurrentIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className='relative' ref={wrapRef}>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        aria-label='Theme settings'
        aria-expanded={open}
        aria-haspopup='menu'
        className='grid h-11 w-11 place-items-center text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-50'
      >
        <CurrentIcon className='h-4 w-4' />
      </button>

      {open && (
        <div
          role='menu'
          className='absolute right-0 z-50 mt-2 w-48 border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950'
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type='button'
              role='menuitemradio'
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className='flex w-full items-center gap-2 border-b border-zinc-200 px-4 py-3 text-left text-sm text-zinc-900 transition-colors last:border-b-0 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-50 dark:hover:bg-zinc-900'
            >
              <Icon className='h-4 w-4' />
              {label}
              {theme === value && <span className='ml-auto text-[var(--brand-lime)]'>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
