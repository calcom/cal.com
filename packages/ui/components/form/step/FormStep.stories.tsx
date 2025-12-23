import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import FormStep from "./FormStep";

const meta = {
  component: FormStep,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {
  args: {
    steps: 4,
    currentStep: 1,
  },
};

export const MiddleStep: Story = {
  args: {
    steps: 4,
    currentStep: 2,
  },
};

export const ThirdStep: Story = {
  args: {
    steps: 4,
    currentStep: 3,
  },
};

export const LastStep: Story = {
  args: {
    steps: 4,
    currentStep: 4,
  },
};

export const TwoSteps: Story = {
  args: {
    steps: 2,
    currentStep: 1,
  },
};

export const ManySteps: Story = {
  args: {
    steps: 8,
    currentStep: 5,
  },
};
