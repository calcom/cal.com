import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import AddressInput from "./AddressInput";

const meta = {
  component: AddressInput,
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
} satisfies Meta<typeof AddressInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return <AddressInput value={value} onChange={setValue} placeholder="Enter address" />;
  },
};

export const WithValue: Story = {
  render: () => {
    const [value, setValue] = useState("123 Main Street, New York, NY 10001");
    return <AddressInput value={value} onChange={setValue} />;
  },
};

export const Required: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return <AddressInput value={value} onChange={setValue} placeholder="Address (required)" required />;
  },
};

export const WithCustomPlaceholder: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return <AddressInput value={value} onChange={setValue} placeholder="Office location" />;
  },
};

export const MeetingLocation: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div className="space-y-2">
        <label className="text-emphasis text-sm font-medium">Meeting Location</label>
        <AddressInput value={value} onChange={setValue} placeholder="Enter meeting address" />
      </div>
    );
  },
};
