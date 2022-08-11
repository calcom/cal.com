// Disabling until we figure out what is happening with the RouterMock.
import { ComponentMeta } from "@storybook/react";

import { HorizontalTabs } from "@calcom/ui/v2/navigation/tabs";
import { HorizontalTabItemProps } from "@calcom/ui/v2/navigation/tabs/HorizontalTabItem";

export default {
  title: "Horizontal Tabs",
  component: HorizontalTabs,
} as ComponentMeta<typeof HorizontalTabs>;

const HorizontalTabsPropsDefault: HorizontalTabItemProps[] = [
  {
    name: "Tab One",
    href: "/tab-one",
  },
];

export const Default = () => (
  <div className="w-full p-4" style={{ backgroundColor: "#F9FAFB" }}>
    <HorizontalTabs tabs={HorizontalTabsPropsDefault} />
  </div>
);

Default.parameters = {
  nextRouter: {
    path: "/[page]",
    asPath: "/profile",
  },
};
