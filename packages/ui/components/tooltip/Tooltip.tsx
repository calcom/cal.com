"use client";

import classNames from "@calcom/ui/classNames";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React, { useCallback, useEffect, useRef, useState } from "react";

export function Tooltip({
  children,
  content,
  open: controlledOpen,
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
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const triggerRef = useRef<HTMLElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleOpenChange(!isOpen);
    },
    [handleOpenChange, isOpen]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };

    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleOpenChange]);

  const Content = (
    <TooltipPrimitive.Content
      {...props}
      className={classNames(
        "calcom-tooltip",
        side === "top" && "-mt-7",
        side === "left" && "mr-2",
        side === "right" && "ml-2",
        "bg-inverted text-inverted relative z-50 rounded-sm px-2 py-1 text-xs font-semibold shadow-lg",
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
      open={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={handleOpenChange}>
      <TooltipPrimitive.Trigger asChild>
        {React.isValidElement(children)
          ? React.cloneElement(
              children as React.ReactElement<{
                onTouchStart?: React.TouchEventHandler;
                ref?: React.Ref<HTMLElement>;
              }>,
              {
                onTouchStart: handleTouchStart,
                ref: triggerRef,
              }
            )
          : children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>{Content}</TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
