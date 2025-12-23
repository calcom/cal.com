import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Credits from "./Credits";

const meta = {
  component: Credits,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Credits>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InFooter: Story = {
  decorators: [
    (Story) => (
      <footer className="bg-subtle rounded-lg p-4">
        <Story />
      </footer>
    ),
  ],
};

export const Visible: Story = {
  decorators: [
    (Story) => (
      <div className="block">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Credits component is hidden on mobile by default (lg:block class)",
      },
    },
  },
};
