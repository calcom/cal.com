import { ComponentMeta } from "@storybook/react";

import { Select } from "@calcom/ui/v2";

export default {
  title: "Form/Select",
  component: Select,
} as ComponentMeta<typeof Select>;

export const Single = () => <Select items={[{ value: "Test Test" }]} />;
