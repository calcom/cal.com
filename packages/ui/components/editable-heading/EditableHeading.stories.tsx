import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import { EditableHeading } from "./EditableHeading";

const meta = {
  component: EditableHeading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
    onBlur: fn(),
  },
} satisfies Meta<typeof EditableHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "30 Minute Meeting",
    name: "title",
    isReady: true,
  },
};

export const Disabled: Story = {
  args: {
    value: "Read Only Title",
    name: "title",
    isReady: true,
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    value: "Loading...",
    name: "title",
    isReady: false,
  },
};

export const Controlled: Story = {
  render: function ControlledHeading() {
    const [value, setValue] = useState("Editable Event Title");

    return (
      <div className="space-y-4">
        <EditableHeading
          value={value}
          name="title"
          isReady={true}
          onChange={setValue}
          onBlur={fn()}
        />
        <p className="text-subtle text-sm">Current value: {value}</p>
      </div>
    );
  },
};

export const EventTypeTitle: Story = {
  render: function EventTypeExample() {
    const [title, setTitle] = useState("Discovery Call");

    return (
      <div className="border-subtle w-[500px] rounded-lg border p-6">
        <EditableHeading
          value={title}
          name="eventTitle"
          isReady={true}
          onChange={setTitle}
          onBlur={fn()}
        />
        <p className="text-subtle mt-2 text-sm">
          Click on the title to edit it. The pencil icon appears on hover.
        </p>
      </div>
    );
  },
  parameters: {
    layout: "padded",
  },
};

export const LongTitle: Story = {
  args: {
    value: "This is a very long event type title that might need truncation",
    name: "title",
    isReady: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};
