import type { CSSProperties, PropsWithChildren } from "react";
import React, { useRef, useEffect, useState } from "react";

import { classNames } from "@calcom/lib";

const ScrollableArea = ({ children, className }: PropsWithChildren<{ className?: string }>) => {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [isOverflowingY, setIsOverflowingY] = useState(false);

  useEffect(() => {
    const scrollableElement = scrollableRef.current;

    if (scrollableElement) {
      const isElementOverflowing = scrollableElement.scrollHeight > scrollableElement.clientHeight;
      console.log({ isElementOverflowing });
      setIsOverflowingY(isElementOverflowing);
    }
  }, []);

  const overflowIndicatorStyles = {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "30px",
    background: "linear-gradient(to bottom, transparent, gray 40px)",
    zIndex: 10,
  } as CSSProperties;

  return (
    <div
      ref={scrollableRef}
      className={classNames(
        "scroll-bar overflow-y-scroll ",
        isOverflowingY && " relative ",
        className // Pass in your max-w / max-h
      )}>
      {children}
      {isOverflowingY && <div style={overflowIndicatorStyles} />}
    </div>
  );
};

export { ScrollableArea };
