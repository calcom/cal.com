import React, { useState, useRef, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../icon";
import type { HorizontalTabItemProps } from "./HorizontalTabItem";
import HorizontalTabItem from "./HorizontalTabItem";

export interface NavTabProps extends React.ComponentPropsWithoutRef<"nav"> {
  tabs: HorizontalTabItemProps[];
  linkShallow?: boolean;
  linkScroll?: boolean;
  actions?: JSX.Element;
}

const HorizontalTabs = function ({ tabs, linkShallow, linkScroll, actions, ...props }: NavTabProps) {
  const { t } = useLocale();
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const checkScrollPosition = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      const hasOverflow = scrollWidth > clientWidth;

      setShowLeftArrow(hasOverflow && scrollLeft > 0);
      setShowRightArrow(hasOverflow && scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, [tabs]);

  const scroll = (direction: "left" | "right") => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-4 max-w-full lg:mb-5">
      <div className="relative flex items-center">
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="z-10 flex h-6 w-8 items-center justify-center transition-opacity hover:opacity-70"
            aria-label={t("scroll_left")}
            data-testid="scroll-left-button">
            <Icon name="chevron-left" className="h-4 w-4 text-white drop-shadow-sm" />
          </button>
        )}
        <nav
          ref={navRef}
          className="no-scrollbar flex flex-1 space-x-0.5 overflow-x-auto rounded-md"
          aria-label="Tabs"
          onScroll={checkScrollPosition}
          {...props}>
          {tabs.map((tab, idx) => (
            <HorizontalTabItem {...tab} key={idx} linkShallow={linkShallow} linkScroll={linkScroll} />
          ))}
        </nav>
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="z-10 flex h-6 w-8 items-center justify-center transition-opacity hover:opacity-70"
            aria-label={t("scroll_right")}
            data-testid="scroll-right-button">
            <Icon name="chevron-right" className="h-4 w-4 text-white drop-shadow-sm" />
          </button>
        )}
      </div>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
