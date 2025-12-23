import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { ArrowButton } from "./ArrowButton";

const meta = {
  component: ArrowButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof ArrowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Up: Story = {
  args: {
    arrowDirection: "up",
  },
  decorators: [
    (Story) => (
      <div className="group relative p-8">
        <div className="border-subtle rounded-lg border p-4">
          <p className="text-sm">Hover over this card to see the arrow button</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export const Down: Story = {
  args: {
    arrowDirection: "down",
  },
  decorators: [
    (Story) => (
      <div className="group relative p-8">
        <div className="border-subtle rounded-lg border p-4">
          <p className="text-sm">Hover over this card to see the arrow button</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export const ReorderableList: Story = {
  render: () => (
    <div className="w-[400px] space-y-2">
      {["First Item", "Second Item", "Third Item"].map((item, index) => (
        <div key={item} className="group relative">
          <div className="border-subtle rounded-lg border p-4">
            <p className="text-sm font-medium">{item}</p>
            <p className="text-subtle text-xs">Drag or use arrows to reorder</p>
          </div>
          {index > 0 && <ArrowButton arrowDirection="up" onClick={fn()} />}
          {index < 2 && <ArrowButton arrowDirection="down" onClick={fn()} />}
        </div>
      ))}
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
