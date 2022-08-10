import { FC } from "react";

import VerticalTabItem, { VerticalTabItemProps } from "./VerticalTabItem";

export interface NavTabProps {
  tabs: VerticalTabItemProps[];
}

const NavTabs: FC<NavTabProps> = ({ tabs, ...props }) => {
  return (
    <>
      <nav className="no-scrollbar flex flex-col space-y-1" aria-label="Tabs" {...props}>
        {tabs.map((tab, idx) => (
          <VerticalTabItem {...tab} key={idx} />
        ))}
      </nav>
    </>
  );
};

export default NavTabs;
