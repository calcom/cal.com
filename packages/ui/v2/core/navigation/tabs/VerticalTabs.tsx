import { classNames } from "@calcom/lib";

import VerticalTabItem, { VerticalTabItemProps } from "./VerticalTabItem";

export { VerticalTabItem };

export interface NavTabProps<T extends string> {
  tabs: VerticalTabItemProps<T>[];
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  tabNameKey?: T;
}

const NavTabs = function <T extends string>({
  tabs,
  tabNameKey,
  className = "",
  sticky,
  ...props
}: NavTabProps<T>) {
  const _tabNameKey = tabNameKey || "tabName";

  return (
    <nav
      className={classNames(
        `no-scrollbar flex flex-col space-y-1 overflow-scroll ${className}`,
        sticky && "sticky top-0 -mt-7"
      )}
      aria-label="Tabs"
      {...props}>
      {/* padding top for sticky */}
      {sticky && <div className="pt-6" />}
      {props.children}
      {tabs.map((tab, idx) => (
        <VerticalTabItem tabNameKey={_tabNameKey} {...tab} key={idx} />
      ))}
    </nav>
  );
};

export default NavTabs;
