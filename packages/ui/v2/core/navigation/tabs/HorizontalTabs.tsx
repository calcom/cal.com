import HorizontalTabItem, { HorizontalTabItemProps } from "./HorizontalTabItem";

export { HorizontalTabItem };

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
  linkProps?: HorizontalTabItemProps["linkProps"];
}

const HorizontalTabs = function ({ tabs, linkProps, ...props }: NavTabProps) {
  return (
    <div className="-mx-6 mb-2 w-[calc(100%+40px)]">
      <nav
        className="no-scrollbar flex space-x-1 overflow-scroll px-6 md:overflow-visible"
        aria-label="Tabs"
        {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} {...linkProps} />
        ))}
      </nav>
    </div>
  );
};

export default HorizontalTabs;
