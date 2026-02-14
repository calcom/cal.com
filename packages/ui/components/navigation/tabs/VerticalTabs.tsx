import classNames from "@calcom/ui/classNames";

import type { VerticalTabItemProps } from "./VerticalTabItem";
import VerticalTabItem from "./VerticalTabItem";

export { VerticalTabItem };

export interface NavTabProps {
  tabs: VerticalTabItemProps[];
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  stickyOffset?: number | string;
  linkShallow?: boolean;
  linkScroll?: boolean;
  itemClassname?: string;
  iconClassName?: string;
}

const NavTabs = function ({
  tabs,
  className = "",
  sticky,
  stickyOffset = 24,
  linkShallow,
  linkScroll,
  itemClassname,
  iconClassName,
  ...props
}: NavTabProps) {
  return (
    <nav
      className={classNames(
        `no-scrollbar flex flex-col stack-y-1 overflow-scroll ${className}`,
        sticky && "sticky"
      )}
      style={{
        maxWidth: "256px",
        ...(sticky ? { top: stickyOffset } : {}),
      }}
      aria-label="Tabs"
      {...props}>
      {props.children}
      {tabs.map((tab, idx) => (
        <VerticalTabItem
          {...tab}
          key={idx}
          linkShallow={linkShallow}
          linkScroll={linkScroll}
          className={itemClassname}
          iconClassName={iconClassName}
        />
      ))}
    </nav>
  );
};

export default NavTabs;
