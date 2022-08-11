import { ComponentMeta } from "@storybook/react";

import { Switch } from "@calcom/ui/v2";

export default {
  title: "Switch",
  component: Switch,
} as ComponentMeta<typeof Switch>;

export const All = () => (
  <div className="flex flex-col space-y-2">
    <p>Checked works in app but storybook doesnt like it</p>
    <Switch label="Default" />
  </div>
);
