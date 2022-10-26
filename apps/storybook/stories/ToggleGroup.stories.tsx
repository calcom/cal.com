import { ComponentMeta } from "@storybook/react";

import { ToggleGroup } from "@calcom/ui/v2/core/form/ToggleGroup";

export default {
  title: "Toggle Group",
  component: ToggleGroup,
} as ComponentMeta<typeof ToggleGroup>;

export const Default = () => {
  return (
    <ToggleGroup
      defaultValue="12"
      options={[
        { value: "12", label: "12h" },
        { value: "24", label: "24h" },
      ]}
    />
  );
};
