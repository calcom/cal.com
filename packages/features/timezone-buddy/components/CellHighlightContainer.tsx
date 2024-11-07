"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { DAY_CELL_WIDTH } from "../constants";
import { TBContext } from "../store";

export function CellHighlightContainer({ children }: { children: React.ReactNode }) {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing TBContext.Provider in the tree");

  const [isAnimating, setIsAnimating] = useState(false);
  const componentContainerRef = useRef<HTMLDivElement>(null);
  const { x, y, height, isHover, updateDimensions, setContainerRef } = useStore(store, (state) => state);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    if (isHover) {
      setIsAnimating(true);
    } else {
      timeout = setTimeout(() => setIsAnimating(false), 1000);
    }
    return () => {
      timeout && clearTimeout(timeout);
    };
  }, [isHover]);

  useLayoutEffect(() => {
    const handleUpdate = () => {
      updateDimensions();
    };

    const resizeObserver = new ResizeObserver(() => handleUpdate());

    const currentContainerRef = componentContainerRef.current;
    setContainerRef(componentContainerRef);
    if (currentContainerRef) {
      resizeObserver.observe(currentContainerRef);
    }

    return () => {
      if (currentContainerRef) {
        resizeObserver.unobserve(currentContainerRef);
      }
    };
  }, [componentContainerRef, setContainerRef, updateDimensions]);

  return (
    <LazyMotion features={domAnimation}>
      <div
        className="relative -mx-2 w-[calc(100%+16px)] overflow-x-scroll px-2 lg:-mx-6 lg:w-[calc(100%+48px)] lg:px-6"
        ref={componentContainerRef}>
        {children}

        <m.div
          className="border-subtle opcaity-0 pointer-events-none absolute left-0 top-0 h-full rounded-lg border-2"
          animate={{ x: [null, x], opacity: isAnimating || isHover ? 1 : 0.1 }}
          style={{ y, height, width: DAY_CELL_WIDTH }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </LazyMotion>
  );
}
