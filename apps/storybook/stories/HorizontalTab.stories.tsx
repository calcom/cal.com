// Disabling until we figure out what is happening with the RouterMock.
import { ComponentMeta } from "@storybook/react";

import { HorizontalTabItemProps } from "@calcom/ui/v2/core/navigation/tabs/HorizontalTabItem";
import HorizontalTabs from "@calcom/ui/v2/core/navigation/tabs/HorizontalTabs";

export default {
  title: "Horizontal Tabs",
  component: HorizontalTabs,
} as ComponentMeta<typeof HorizontalTabs>;

const HorizontalTabsPropsDefault: HorizontalTabItemProps[] = [
  {
    name: "Tab One",
    href: "/tab-one",
  },
  {
    name: "Tab Two",
    href: "/tab-two",
  },
  {
    name: "Tab Disabled",
    href: "/tab-disabled",
    disabled: true,
  },
];

export const Default = () => (
  <div className="w-full p-4">
    <HorizontalTabs tabs={HorizontalTabsPropsDefault} />
  </div>
);

Default.parameters = {
  nextRouter: {
    path: "/[page]",
    asPath: "/tab-one",
  },
};
