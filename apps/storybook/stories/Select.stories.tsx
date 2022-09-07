import { ComponentMeta } from "@storybook/react";

import { Select } from "@calcom/ui/v2";

export default {
  title: "Form/Select",
  component: Select,
} as ComponentMeta<typeof Select>;

const testOptions = [
  {
    label: "Select",
    value: 0,
  },
  ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
    label: minutes + " " + "minutes",
    value: minutes,
  })),
];

export const Single = () => <Select options={testOptions} />;
