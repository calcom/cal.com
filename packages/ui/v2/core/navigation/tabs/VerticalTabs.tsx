import { FC } from "react";

import { classNames } from "@calcom/lib";

import VerticalTabItem, { VerticalTabItemProps } from "./VerticalTabItem";

export { VerticalTabItem };

export interface NavTabProps {
  tabs: VerticalTabItemProps[];
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

const NavTabs: FC<NavTabProps> = ({ tabs, className = "", sticky, ...props }) => {
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
        <VerticalTabItem {...tab} key={idx} />
      ))}
    </nav>
  );
};

export default NavTabs;
