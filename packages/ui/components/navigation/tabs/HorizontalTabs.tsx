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
    <div className="mb-4 max-w-full lg:mb-5">
      <nav className="no-scrollbar flex overflow-x-scroll" aria-label="Tabs" {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} linkShallow={linkShallow} linkScroll={linkScroll} />
        ))}
      </nav>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
