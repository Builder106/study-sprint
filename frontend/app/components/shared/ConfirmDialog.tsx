import * as AD from "@radix-ui/react-alert-dialog";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type Tone = "default" | "danger";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  };

  const tone = opts?.tone ?? "default";
  const confirmClass =
    tone === "danger"
      ? "bg-red-500 text-white hover:bg-red-600"
      : "bg-[#ccff00] text-black hover:bg-[#b3e600]";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AD.Root open={open} onOpenChange={(v) => !v && settle(false)}>
        <AD.Portal>
          <AD.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <AD.Content className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-6 shadow-2xl focus:outline-none">
            <AD.Title className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
              {opts?.title}
            </AD.Title>
            {opts?.description && (
              <AD.Description className="mt-2 text-sm font-light text-zinc-600 dark:text-zinc-400">
                {opts.description}
              </AD.Description>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <AD.Cancel asChild>
                <button
                  onClick={() => settle(false)}
                  className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                  {opts?.cancelLabel ?? "Cancel"}
                </button>
              </AD.Cancel>
              <AD.Action asChild>
                <button
                  onClick={() => settle(true)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${confirmClass}`}
                >
                  {opts?.confirmLabel ?? "Confirm"}
                </button>
              </AD.Action>
            </div>
          </AD.Content>
        </AD.Portal>
      </AD.Root>
    </ConfirmContext.Provider>
  );
}
