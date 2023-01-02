import HorizontalTabItem, { HorizontalTabItemProps } from "./HorizontalTabItem";

export { HorizontalTabItem };

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
  linkProps?: HorizontalTabItemProps["linkProps"];
  actions?: JSX.Element;
}

const HorizontalTabs = function ({ tabs, linkProps, actions, ...props }: NavTabProps) {
  return (
    <div className="-mx-6 mb-2 w-[calc(100%+40px)]">
      <nav className="no-scrollbar flex space-x-1 overflow-scroll px-6" aria-label="Tabs" {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} {...linkProps} />
        ))}
      </nav>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
