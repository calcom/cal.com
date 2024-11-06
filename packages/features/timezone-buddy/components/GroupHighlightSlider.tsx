import { LazyMotion, domAnimation, m } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { DAY_CELL_WIDTH } from "../constants";
import { TBContext } from "../store";

export function GroupHighlightSlider() {
  const store = useContext(TBContext);

  if (!store) throw new Error("Missing TBContext.Provider in the tree");

  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const [x, y, height, isHover] = useStore(store, (state) => [state.x, state.y, state.height, state.isHover]);

  useEffect(() => {
    if (isHover) {
      setIsAnimating(true);
    } else {
      timeoutRef.current = setTimeout(() => setIsAnimating(false), 1000);
    }
  }, [isHover]);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="border-subtle opcaity-0 pointer-events-none absolute left-0 top-0 h-full rounded-lg border-2"
        animate={{ x: [null, x], opacity: isAnimating || isHover ? 1 : 0.1 }}
        style={{ y, height, width: DAY_CELL_WIDTH }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </LazyMotion>
  );
}
