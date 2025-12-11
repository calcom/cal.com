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
    <div className="mb-4 max-w-full">
      <nav className="no-scrollbar border-muted flex overflow-x-scroll border-b" aria-label="Tabs" {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} linkShallow={linkShallow} linkScroll={linkScroll} />
        ))}
      </nav>

      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
