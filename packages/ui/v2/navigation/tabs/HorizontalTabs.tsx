import { FC } from "react";

import HorizontalTabItem, { HorizontalTabItemProps } from "./HorizontalTabItem";

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
}

const HorizontalTabs: FC<NavTabProps> = ({ tabs, ...props }) => {
  return (
    <>
      <nav className="no-scrollbar flex space-y-1" aria-label="Tabs" {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} />
        ))}
      </nav>
    </>
  );
};

export default HorizontalTabs;
