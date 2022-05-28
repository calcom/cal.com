import { ComponentMeta } from "@storybook/react";

import { Checkbox } from "@calcom/ui";

export default {
  title: "Checkbox",
  component: Checkbox,
} as ComponentMeta<typeof Checkbox>;

export const All = () => (
  <div className="flex flex-col space-y-2">
    <Checkbox description="Default"></Checkbox>
    <Checkbox description="Error" error></Checkbox>
    <Checkbox description="Disabled" disabled></Checkbox>
    <Checkbox description="Disabled" disabled checked></Checkbox>
  </div>
);

export const CheckboxField = () => <Checkbox description=" Default" />;
export const CheckboxError = () => <Checkbox description=" Error" error />;
export const CheckboxDisabled = () => <Checkbox description=" Disabled" disabled />;
