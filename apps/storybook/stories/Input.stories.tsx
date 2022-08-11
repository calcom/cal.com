import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Copy } from "react-feather";

import DatePicker from "@calcom/ui/v2/form/DatePicker";
import { TextAreaField, TextField } from "@calcom/ui/v2/form/fields";

export default {
  title: "Inputs",
  component: TextField,
  argTypes: {
    disabled: {
      options: [false, true],
    },
  },
} as ComponentMeta<typeof TextField>;

const TextInputTemplate: ComponentStory<typeof TextField> = (args) => <TextField {...args} />;
// name="demo" label="Demo Label" hint="Hint text"
export const TextInput = TextInputTemplate.bind({});
TextInput.args = {
  name: "demo",
  label: "Demo Label",
  hint: "Hint Text",
  disabled: false,
};

export const TextInputPrefix = TextInputTemplate.bind({});
TextInputPrefix.args = {
  name: "demo",
  label: "Demo Label",
  hint: "Hint Text",
  addOnLeading: "https://",
  disabled: false,
};

export const TextInputSuffix = TextInputTemplate.bind({});
TextInputSuffix.args = {
  name: "demo",
  label: "Demo Label",
  hint: "Hint Text",
  addOnSuffix: "Minutes",
  disabled: false,
};

export const TextInputPrefixIcon = TextInputTemplate.bind({});
TextInputPrefixIcon.args = {
  name: "demo",
  label: "Demo Label",
  hint: "Hint Text",
  addOnFilled: false,
  addOnSuffix: <Copy />,
  disabled: false,
};
export const TextInputSuffixIcon = TextInputTemplate.bind({});
TextInputSuffixIcon.args = {
  name: "demo",
  label: "Demo Label",
  hint: "Hint Text",
  addOnFilled: false,
  addOnLeading: <Copy />,
  disabled: false,
};

export const TextAreaInput: ComponentStory<typeof TextAreaField> = () => (
  <TextAreaField name="Text-area-input" label="Text Area" />
);

export const DatePickerInput: ComponentStory<typeof DatePicker> = () => <DatePicker date={new Date()} />;
