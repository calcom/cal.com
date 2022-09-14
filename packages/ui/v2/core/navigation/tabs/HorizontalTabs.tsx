import HorizontalTabItem, { HorizontalTabItemProps } from "./HorizontalTabItem";

export { HorizontalTabItem };

export interface NavTabProps<T extends string> {
  tabs: HorizontalTabItemProps<T>[];
  tabNameKey?: T;
}

const HorizontalTabs = function <T extends string>({ tabs, tabNameKey, ...props }: NavTabProps<T>) {
  const _tabNameKey = tabNameKey || "tabName";
  return (
    <div className="-mx-6 mb-2 w-[calc(100%+40px)]">
      <nav
        className="no-scrollbar flex space-x-1 overflow-scroll px-6 md:overflow-visible"
        aria-label="Tabs"
        {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem tabNameKey={_tabNameKey} {...tab} key={idx} />
        ))}
      </nav>
    </div>
  );
};

export default HorizontalTabs;
