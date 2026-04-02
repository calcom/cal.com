"use client";

import classNames from "@calcom/ui/classNames";
import type { PropsWithChildren } from "react";
import React, { useEffect, useRef, useState } from "react";

const ScrollableArea = ({ children, className }: PropsWithChildren<{ className?: string }>) => {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [isOverflowingY, setIsOverflowingY] = useState(false);

  useEffect(() => {
    const scrollableElement = scrollableRef.current;

    if (scrollableElement) {
      const isElementOverflowing = scrollableElement.scrollHeight > scrollableElement.clientHeight;
      setIsOverflowingY(isElementOverflowing);
    }
  }, []);

  return (
    <div
      ref={scrollableRef}
      className={classNames(
        "scroll-bar overflow-y-scroll ",
        isOverflowingY && " relative ",
        className // Pass in your max-w / max-h
      )}>
      {children}
      {isOverflowingY && <div data-testid="overflow-indicator" />}
    </div>
  );
};

export { ScrollableArea };
