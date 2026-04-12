import { useIsomorphicLayoutEffect } from "@calcom/lib/hooks/useIsomorphicLayoutEffect";
import { useRef } from "react";
import type { HorizontalTabItemProps } from "./HorizontalTabItem";
import HorizontalTabItem from "./HorizontalTabItem";

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
  linkShallow?: boolean;
  linkScroll?: boolean;
  actions?: JSX.Element;
  scrollActiveTabIntoView?: boolean;
}

const HorizontalTabs = ({
  tabs,
  linkShallow,
  linkScroll,
  actions,
  scrollActiveTabIntoView,
  ...props
}: NavTabProps): JSX.Element => {
  const navRef = useRef<HTMLElement | null>(null);
  const lastScrolledActiveHrefRef = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!scrollActiveTabIntoView) return;
    const navEl = navRef.current;
    if (!navEl) return;

    if (navEl.scrollWidth <= navEl.clientWidth) return;

    const activeEl = navEl.querySelector<HTMLElement>("[aria-current='page']");
    if (!activeEl) return;

    const activeHref = activeEl.getAttribute("href");
    if (activeHref && lastScrolledActiveHrefRef.current === activeHref) return;

    activeEl.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
    if (activeHref) lastScrolledActiveHrefRef.current = activeHref;
  }, [scrollActiveTabIntoView, tabs]);

  return (
    <div className="mb-4 max-w-full lg:mb-5">
      <nav
        className="no-scrollbar flex space-x-0.5 overflow-x-scroll rounded-md"
        aria-label="Tabs"
        ref={navRef}
        {...props}>
        {tabs.map((tab) => (
          <HorizontalTabItem {...tab} key={tab.href} linkShallow={linkShallow} linkScroll={linkScroll} />
        ))}
      </nav>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
