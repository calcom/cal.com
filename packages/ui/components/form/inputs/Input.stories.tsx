import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  EmailField,
  EmailInput,
  FieldsetLegend,
  FilterSearchField,
  InputGroupBox,
  InputLeading,
  NumberInput,
  PasswordField,
  TextArea,
} from "./Input";

const meta = {
  title: "Form/Inputs/Input Variants",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "320px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

export const EmailInputStory: StoryObj<typeof EmailInput> = {
  name: "Email Input",
  render: () => <EmailInput placeholder="you@example.com" />,
};

export const EmailFieldStory: StoryObj<typeof EmailField> = {
  name: "Email Field",
  render: () => <EmailField label="Email Address" name="email" placeholder="you@example.com" />,
};

export const PasswordFieldStory: StoryObj<typeof PasswordField> = {
  name: "Password Field",
  render: () => <PasswordField label="Password" name="password" />,
};

export const NumberInputStory: StoryObj<typeof NumberInput> = {
  name: "Number Input",
  render: () => <NumberInput placeholder="Enter a number" />,
};

export const TextAreaStory: StoryObj<typeof TextArea> = {
  name: "TextArea",
  render: () => <TextArea placeholder="Enter your message..." />,
};

export const TextAreaWithRows: StoryObj<typeof TextArea> = {
  name: "TextArea with Rows",
  render: () => <TextArea placeholder="Enter description..." rows={6} />,
};

export const FilterSearchFieldStory: StoryObj<typeof FilterSearchField> = {
  name: "Filter Search Field",
  render: () => <FilterSearchField name="search" />,
};

export const InputLeadingStory: StoryObj<typeof InputLeading> = {
  name: "Input Leading",
  render: () => (
    <div className="flex">
      <InputLeading>https://</InputLeading>
      <input className="border-subtle flex-1 rounded-r-md border px-3 py-2" placeholder="example.com" />
    </div>
  ),
};

export const FieldsetLegendStory: StoryObj<typeof FieldsetLegend> = {
  name: "Fieldset Legend",
  render: () => (
    <fieldset>
      <FieldsetLegend>Personal Information</FieldsetLegend>
      <div className="mt-2 space-y-2">
        <input className="border-subtle w-full rounded-md border px-3 py-2" placeholder="First name" />
        <input className="border-subtle w-full rounded-md border px-3 py-2" placeholder="Last name" />
      </div>
    </fieldset>
  ),
};

export const InputGroupBoxStory: StoryObj<typeof InputGroupBox> = {
  name: "Input Group Box",
  render: () => (
    <InputGroupBox>
      <label className="flex items-center gap-2">
        <input type="radio" name="option" />
        <span className="text-sm">Option A</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="option" />
        <span className="text-sm">Option B</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="option" />
        <span className="text-sm">Option C</span>
      </label>
    </InputGroupBox>
  ),
};

export const AllInputTypes: StoryObj = {
  name: "All Input Types",
  render: () => (
    <div className="space-y-6">
      <div>
        <label className="text-emphasis mb-1 block text-sm font-medium">Email</label>
        <EmailInput placeholder="you@example.com" />
      </div>
      <div>
        <label className="text-emphasis mb-1 block text-sm font-medium">Number</label>
        <NumberInput placeholder="0" />
      </div>
      <PasswordField label="Password" name="password" />
      <div>
        <label className="text-emphasis mb-1 block text-sm font-medium">Message</label>
        <TextArea placeholder="Your message..." />
      </div>
      <FilterSearchField name="search" />
    </div>
  ),
};
