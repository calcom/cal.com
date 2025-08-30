"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React, { useState, useEffect, useRef } from "react";

import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import classNames from "@calcom/ui/classNames";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [internalOpen, setInternalOpen] = useState(defaultOpen || false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMobileClick = (event: React.MouseEvent) => {
    if (!isMobile) return;

    event.preventDefault();
    event.stopPropagation();

    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    }
  };

  const handleClickOutside = (event: Event) => {
    if (!isMobile || !isOpen) return;

    setIsOpen(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    if (isMobile && isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isMobile, isOpen]);

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
      align="center"
      onPointerDownOutside={(event) => {
        if (isMobile) {
          event.preventDefault();
        }
      }}>
      {content}
    </TooltipPrimitive.Content>
  );

  const TriggerWrapper = React.cloneElement(React.Children.only(children) as React.ReactElement, {
    onClick: (event: React.MouseEvent) => {
      const originalOnClick = (children as React.ReactElement)?.props?.onClick;
      if (originalOnClick) {
        originalOnClick(event);
      }

      handleMobileClick(event);
    },
    style: {
      touchAction: isMobile ? "manipulation" : undefined,
      ...(children as React.ReactElement)?.props?.style,
    },
  });

  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration || 50}
      open={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={isMobile ? undefined : setIsOpen}>
      <TooltipPrimitive.Trigger asChild>{TriggerWrapper}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>{Content}</TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
