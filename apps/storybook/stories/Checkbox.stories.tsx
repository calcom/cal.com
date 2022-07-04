import { ComponentMeta } from "@storybook/react";

import { Checkbox } from "@calcom/ui/v2";

export default {
  title: "Checkbox",
  component: Checkbox,
} as ComponentMeta<typeof Checkbox>;

export const All = () => (
  <div className="flex flex-col space-y-2">
    <Checkbox label="Default" description="Toggle on and off something"></Checkbox>
    <Checkbox label="Error" description="Toggle on and off something" error></Checkbox>
    <Checkbox label="Disabled" description="Toggle on and off something" disabled></Checkbox>
    <Checkbox label="Disabled Checked" description="Toggle on and off something" checked disabled></Checkbox>
    <hr />
    <Checkbox description="Default" descriptionAsLabel></Checkbox>
    <Checkbox description="Error" descriptionAsLabel error></Checkbox>
    <Checkbox description="Disabled" descriptionAsLabel disabled></Checkbox>
    <Checkbox description="Disabled" descriptionAsLabel disabled checked></Checkbox>
  </div>
);

export const CheckboxField = () => <Checkbox description="Default" descriptionAsLabel></Checkbox>;
export const CheckboxError = () => <Checkbox description="Error" descriptionAsLabel></Checkbox>;
export const CheckboxDisabled = () => (
  <>
    <Checkbox description="Disabled" descriptionAsLabel disabled></Checkbox>
    <Checkbox description="Disabled" descriptionAsLabel disabled checked></Checkbox>
  </>
);
