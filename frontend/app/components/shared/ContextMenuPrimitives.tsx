import * as CM from "@radix-ui/react-context-menu";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const ContextMenuRoot = CM.Root;
export const ContextMenuTrigger = CM.Trigger;
export const ContextMenuPortal = CM.Portal;

export function ContextMenuContent({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof CM.Content>) {
  return (
    <CM.Content
      {...props}
      className="z-50 min-w-[200px] bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-xl p-1 shadow-2xl backdrop-blur-md"
    >
      {children}
    </CM.Content>
  );
}

interface ItemProps
  extends Omit<ComponentPropsWithoutRef<typeof CM.Item>, "children"> {
  icon?: ReactNode;
  children: ReactNode;
  danger?: boolean;
}

export function ContextMenuItem({ icon, children, danger, ...props }: ItemProps) {
  const baseColor = danger
    ? "text-red-500 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-400"
    : "text-zinc-700 dark:text-zinc-300 data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-white/5 data-[highlighted]:text-[#ccff00]";
  return (
    <CM.Item
      {...props}
      className={`flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer outline-none select-none data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed ${baseColor}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>}
      {children}
    </CM.Item>
  );
}

export function ContextMenuSeparator() {
  return <CM.Separator className="h-px my-1 bg-zinc-200 dark:bg-white/10 mx-2" />;
}
