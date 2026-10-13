import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const;

/** Shared theme menu with arrow-key navigation and focus return on dismissal. */
export function ThemeMenu() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const CurrentIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type='button'
          aria-label='Theme settings'
          className='theme-menu-trigger grid h-11 w-11 cursor-pointer place-items-center text-zinc-600 transition-colors duration-200 hover:text-brand-lime-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-lime-ink dark:text-zinc-400 dark:hover:text-brand-lime dark:focus-visible:outline-brand-lime'
        >
          <CurrentIcon className='h-4 w-4' aria-hidden='true' />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align='end'
          sideOffset={8}
          className='z-50 w-48 border border-zinc-200 bg-white p-1 text-zinc-900 shadow-lg dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-50'
        >
          <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
            {OPTIONS.map(({ value, label, Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className='flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none data-[highlighted]:bg-zinc-100 data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-brand-lime-ink dark:data-[highlighted]:bg-zinc-900 dark:data-[highlighted]:ring-brand-lime'
              >
                <Icon className='h-4 w-4' aria-hidden='true' />
                {label}
                <DropdownMenu.ItemIndicator className='ml-auto text-brand-lime-ink dark:text-brand-lime'>
                  <Check className='h-4 w-4' aria-hidden='true' />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
