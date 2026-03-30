"use client";

import { useCallback, useRef } from "react";

import classNames from "@calcom/ui/classNames";

interface ResizeHandleProps {
  /** Direction the user drags to resize */
  direction: "left" | "right";
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
      startX.current = e.clientX;
      dragging.current = true;

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const handleMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        startX.current = ev.clientX;
        onResize(direction === "right" ? delta : -delta);
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
        direction === "right" ? "cursor-e-resize" : "cursor-w-resize",
        // Wider hit area than visual
        "w-1.5",
        className
      )}>
      {/* Visual line — appears on hover */}
      <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:bg-blue-400 group-active:bg-blue-500" />
    </div>
  );
}
