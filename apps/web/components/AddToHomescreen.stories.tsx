import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import AddToHomescreen from "./AddToHomescreen";

const meta: Meta<typeof AddToHomescreen> = {
  title: "Components/AddToHomescreen",
  component: AddToHomescreen,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof AddToHomescreen>;

export const Default: Story = {};
