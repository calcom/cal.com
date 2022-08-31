import { FC } from "react";

import VerticalTabItem, { VerticalTabItemProps } from "./VerticalTabItem";

export interface NavTabProps {
  tabs: VerticalTabItemProps[];
  children?: React.ReactNode;
  className?: string;
}

const NavTabs: FC<NavTabProps> = ({ tabs, className = "", ...props }) => {
  return (
    <nav className={`no-scrollbar flex flex-col space-y-1 ${className}`} aria-label="Tabs" {...props}>
      {props.children}
      {tabs.map((tab, idx) => (
        <VerticalTabItem {...tab} key={idx} />
      ))}
    </nav>
  );
};

export default NavTabs;
