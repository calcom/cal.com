import { ComponentMeta, ComponentStory } from "@storybook/react";

import { TextArea, TextAreaField, TextField } from "@calcom/ui/form/fields";

export default {
  title: "Inputs",
  component: TextField,
} as ComponentMeta<typeof TextField>;

const TextInputTemplate: ComponentStory<typeof TextField> = (args) => <TextField {...args}></TextField>;
// name="demo" label="Demo Label" hint="Hint text"
export const TextInput = TextInputTemplate.bind({});
TextInput.args = {
  name: "demo",
  label: "Demo Label",
  hint: "Hint Text",
};

export const TextInputPrefix: ComponentStory<typeof TextField> = (args) => (
  <TextField name="Prefix-input" label="Prefix" addOnLeading={<div className="">http://</div>}></TextField>
);

export const TextAreaInput: ComponentStory<typeof TextAreaField> = (args) => (
  <TextAreaField name="Text-area-input" label="Text Area"></TextAreaField>
);
