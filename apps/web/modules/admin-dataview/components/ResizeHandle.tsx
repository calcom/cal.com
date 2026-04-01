"use client";

import { useCallback, useRef } from "react";

import classNames from "@calcom/ui/classNames";

interface ResizeHandleProps {
  /** Direction the user drags to resize */
  direction: "left" | "right" | "down";
  /** Called continuously during drag with the delta in px */
  onResize: (delta: number) => void;
  className?: string;
}

export function ResizeHandle({ direction, onResize, className }: ResizeHandleProps) {
  const startX = useRef(0);
  const dragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startX.current = direction === "down" ? e.clientY : e.clientX;
      dragging.current = true;

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const handleMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const pos = direction === "down" ? ev.clientY : ev.clientX;
        const delta = pos - startX.current;
        startX.current = pos;
        onResize(direction === "right" ? delta : direction === "down" ? delta : -delta);
      };

      const handleUp = () => {
        dragging.current = false;
        target.removeEventListener("pointermove", handleMove);
        target.removeEventListener("pointerup", handleUp);
      };

      target.addEventListener("pointermove", handleMove);
      target.addEventListener("pointerup", handleUp);
    },
    [direction, onResize]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      className={classNames(
        "group relative z-20 select-none",
        direction === "down" ? "cursor-ns-resize h-1.5" : direction === "right" ? "cursor-e-resize w-1.5" : "cursor-w-resize w-1.5",
        className
      )}>
      {/* Visual line — appears on hover */}
      {direction === "down" ? (
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-transparent transition-colors group-hover:bg-blue-400 group-active:bg-blue-500" />
      ) : (
        <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:bg-blue-400 group-active:bg-blue-500" />
      )}
    </div>
  );
}
