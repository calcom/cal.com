"use client";

import { domAnimation, LazyMotion, m } from "framer-motion";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { DAY_CELL_WIDTH } from "../constants";
import { TBContext } from "../store";

export function CellHighlightContainer({ children }: { children: React.ReactNode }) {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing TBContext.Provider in the tree");

  const [isAnimating, setIsAnimating] = useState(false);
  const componentContainerRef = useRef<HTMLDivElement>(null);
  const { x, y, height, isHover, updateDimensions, setContainerRef, browsingDate, emitCellPosition } =
    useStore(store, (state) => state);
  const prevBrowsingDateRef = useRef(browsingDate);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    if (isHover) {
      setIsAnimating(true);
    } else {
      timeout = setTimeout(() => setIsAnimating(false), 300);
    }
    return () => {
      timeout && clearTimeout(timeout);
    };
  }, [isHover]);

  useEffect(() => {
    if (prevBrowsingDateRef.current?.getTime() !== browsingDate.getTime()) {
      setIsAnimating(false);
      // Clear hover state and position when date changes
      emitCellPosition(-1);
      prevBrowsingDateRef.current = browsingDate;
    }
  }, [browsingDate, emitCellPosition]);

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
        className="relative -mx-2 w-[calc(100%+16px)] overflow-hidden overflow-x-scroll px-2 lg:-mx-6 lg:w-[calc(100%+48px)] lg:px-6"
        ref={componentContainerRef}>
        {children}

        <m.div
          className="border-subtle pointer-events-none absolute left-0 top-0 h-full rounded-lg border-2 opacity-0"
          animate={{
            x: [null, x],
            opacity: isAnimating || isHover ? 1 : 0,
          }}
          style={{ y, height, width: DAY_CELL_WIDTH }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </LazyMotion>
  );
}
