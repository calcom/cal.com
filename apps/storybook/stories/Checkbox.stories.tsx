import { ComponentMeta } from "@storybook/react";

import Checkbox from "@calcom/ui/v2/core/form/Checkbox";

export default {
  title: "Checkbox",
  component: Checkbox,
} as ComponentMeta<typeof Checkbox>;

export const All = () => (
  <div className="flex flex-col space-y-2">
    <Checkbox label="Default" description="Toggle on and off something" />
    <Checkbox label="Error" description="Toggle on and off something" error />
    <Checkbox label="Disabled" description="Toggle on and off something" disabled />
    <Checkbox label="Disabled Checked" description="Toggle on and off something" checked disabled />
    <hr />
    <Checkbox description="Default" descriptionAsLabel />
    <Checkbox description="Error" descriptionAsLabel error />
    <Checkbox description="Disabled" descriptionAsLabel disabled />
    <Checkbox description="Disabled" descriptionAsLabel disabled checked />
  </div>
);

export const CheckboxField = () => <Checkbox description="Default" descriptionAsLabel />;
export const CheckboxError = () => <Checkbox description="Error" descriptionAsLabel />;
export const CheckboxDisabled = () => (
  <>
    <Checkbox description="Disabled" descriptionAsLabel disabled />
    <Checkbox description="Disabled" descriptionAsLabel disabled checked />
  </>
);
