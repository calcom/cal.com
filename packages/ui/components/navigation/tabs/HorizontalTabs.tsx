import type { HorizontalTabItemProps } from "./HorizontalTabItem";
import HorizontalTabItem from "./HorizontalTabItem";

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
  linkShallow?: boolean;
  linkScroll?: boolean;
  actions?: JSX.Element;
}

const HorizontalTabs = function ({ tabs, linkShallow, linkScroll, actions, ...props }: NavTabProps) {
  return (
    <div className="h-9 max-w-full">
      <nav
        className="no-scrollbar flex h-9 space-x-1 overflow-x-scroll rounded-md"
        aria-label="Tabs"
        {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem
            className="px-4 py-2.5"
            {...tab}
            key={idx}
            linkShallow={linkShallow}
            linkScroll={linkScroll}
          />
        ))}
      </nav>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
