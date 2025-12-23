import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import ColorPicker from "./colorpicker";

const meta = {
  component: ColorPicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[200px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: "#292929",
  },
};

export const BrandColor: Story = {
  args: {
    defaultValue: "#111827",
  },
};

export const CustomColor: Story = {
  args: {
    defaultValue: "#3b82f6",
  },
};

export const WithResetButton: Story = {
  args: {
    defaultValue: "#ef4444",
    resetDefaultValue: "#292929",
  },
};

export const LightColor: Story = {
  args: {
    defaultValue: "#f3f4f6",
  },
};

export const GreenAccent: Story = {
  args: {
    defaultValue: "#10b981",
  },
};

export const PurpleAccent: Story = {
  args: {
    defaultValue: "#8b5cf6",
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div>
        <label className="text-sm font-medium">Brand Color</label>
        <ColorPicker defaultValue="#111827" onChange={fn()} />
      </div>
      <div>
        <label className="text-sm font-medium">Accent Color</label>
        <ColorPicker defaultValue="#3b82f6" onChange={fn()} />
      </div>
      <div>
        <label className="text-sm font-medium">Background Color</label>
        <ColorPicker defaultValue="#ffffff" onChange={fn()} resetDefaultValue="#ffffff" />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
