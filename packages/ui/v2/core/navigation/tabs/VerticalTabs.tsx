import { FC } from "react";

import { classNames } from "@calcom/lib";

import VerticalTabItem, { VerticalTabItemProps } from "./VerticalTabItem";

export interface NavTabProps {
  tabs: VerticalTabItemProps[];
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

const NavTabs: FC<NavTabProps> = ({ tabs, className = "", sticky, ...props }) => {
  return (
    <nav
      className={classNames(`no-scrollbar flex flex-col space-y-1 ${className}`, sticky && "sticky top-0")}
      aria-label="Tabs"
      {...props}>
      {props.children}
      {tabs.map((tab, idx) => (
        <VerticalTabItem {...tab} key={idx} />
      ))}
    </nav>
  );
};

export default NavTabs;
