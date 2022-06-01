import { ComponentMeta } from "@storybook/react";

import { TextField } from "@calcom/ui/form/fields";

export default {
  title: "Inputs",
  component: TextField,
} as ComponentMeta<typeof TextField>;

export const TextInput = () => <TextField name="demo" label="Demo Label" hint="Hint text" />;
