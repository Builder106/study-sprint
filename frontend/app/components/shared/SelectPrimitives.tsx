import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const SelectRoot = S.Root;
export const SelectValue = S.Value;
export const SelectPortal = S.Portal;

export function SelectTrigger({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<typeof S.Trigger>) {
  return (
    <S.Trigger
      {...props}
      className={`inline-flex items-center gap-2 bg-transparent border border-zinc-200 dark:border-white/10 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-50 hover:border-zinc-300 dark:hover:border-white/20 focus:outline-none focus:border-[#ccff00] data-[state=open]:border-[#ccff00] transition-colors ${className}`}
    >
      {children}
      <S.Icon>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </S.Icon>
    </S.Trigger>
  );
}

export function SelectContent({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof S.Content>) {
  return (
    <S.Content
      position="popper"
      sideOffset={6}
      {...props}
      className="z-50 min-w-[var(--radix-select-trigger-width)] bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-xl p-1 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      <S.Viewport className="p-0">{children}</S.Viewport>
    </S.Content>
  );
}

interface ItemProps extends ComponentPropsWithoutRef<typeof S.Item> {
  children: ReactNode;
}

export function SelectItem({ children, ...props }: ItemProps) {
  return (
    <S.Item
      {...props}
      className="flex items-center justify-between gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer outline-none select-none text-zinc-700 dark:text-zinc-300 data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-white/5 data-[highlighted]:text-[#ccff00] data-[state=checked]:text-[#ccff00] data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
    >
      <S.ItemText>{children}</S.ItemText>
      <S.ItemIndicator>
        <Check className="w-3 h-3" />
      </S.ItemIndicator>
    </S.Item>
  );
}
