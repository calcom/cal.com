import { ComponentMeta } from "@storybook/react";

import Select from "@calcom/ui/v2/form/Select";

export default {
  title: "Form/Select",
  component: Select,
} as ComponentMeta<typeof Select>;

export const Single = () => <Select options={options} defaultValue={options[0]} />;

const options = [
  {
    value: "value-1",
    label: "Value 1",
  },
  {
    value: "value-2",
    label: "Value 2",
  },
];
