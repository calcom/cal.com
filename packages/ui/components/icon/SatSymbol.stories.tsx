import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SatSymbol } from "./SatSymbol";

const meta = {
  component: SatSymbol,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SatSymbol>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "h-8 w-8",
  },
};

export const Small: Story = {
  args: {
    className: "h-4 w-4",
  },
};

export const Large: Story = {
  args: {
    className: "h-16 w-16",
  },
};

export const WithColor: Story = {
  args: {
    className: "h-8 w-8 text-orange-500",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SatSymbol className="h-4 w-4" />
      <SatSymbol className="h-6 w-6" />
      <SatSymbol className="h-8 w-8" />
      <SatSymbol className="h-12 w-12" />
      <SatSymbol className="h-16 w-16" />
    </div>
  ),
};

export const PriceDisplay: Story = {
  render: () => (
    <div className="flex items-center gap-1 text-lg font-semibold">
      <SatSymbol className="h-5 w-5 text-orange-500" />
      <span>50,000</span>
    </div>
  ),
};
