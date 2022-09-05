import { FC } from "react";

import HorizontalTabItem, { HorizontalTabItemProps } from "./HorizontalTabItem";

export { HorizontalTabItem };

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
}

const HorizontalTabs: FC<NavTabProps> = ({ tabs, ...props }) => {
  return (
    <>
      <nav
        className="no-scrollbar flex space-x-1 overflow-scroll px-6 md:overflow-visible md:px-0"
        aria-label="Tabs"
        {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem {...tab} key={idx} />
        ))}
      </nav>
    </>
  );
};

export default HorizontalTabs;
