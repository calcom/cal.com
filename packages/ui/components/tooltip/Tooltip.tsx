import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import classNames from "@calcom/lib/classNames";

export function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
  side = "top",
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  onOpenChange?: (open: boolean) => void;
} & TooltipPrimitive.TooltipContentProps) {
  const isPlatform = useIsPlatform();
  const Content = (
    <TooltipPrimitive.Content
      {...props}
      className={classNames(
        "calcom-tooltip",
        side === "top" && "-mt-7",
        side === "right" && "ml-2",
        "bg-inverted text-inverted relative z-50 rounded-md px-2 py-1 text-xs font-semibold shadow-lg",
        props.className && `${props.className}`
      )}
      side={side}
      align="center">
      {content}
    </TooltipPrimitive.Content>
  );

  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration || 50}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      {isPlatform ? <>{Content}</> : <TooltipPrimitive.Portal>{Content}</TooltipPrimitive.Portal>}
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
