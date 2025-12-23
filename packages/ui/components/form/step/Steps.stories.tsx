import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Steps } from "./Steps";

const meta = {
  component: Steps,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Steps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxSteps: 5,
    currentStep: 2,
    disableNavigation: true,
  },
};

export const FirstStep: Story = {
  args: {
    maxSteps: 4,
    currentStep: 1,
    disableNavigation: true,
  },
};

export const MiddleStep: Story = {
  args: {
    maxSteps: 4,
    currentStep: 2,
    disableNavigation: true,
  },
};

export const LastStep: Story = {
  args: {
    maxSteps: 4,
    currentStep: 4,
    disableNavigation: true,
  },
};

export const WithNavigation: Story = {
  render: () => {
    const [step, setStep] = useState(3);
    return (
      <div>
        <Steps maxSteps={5} currentStep={step} navigateToStep={setStep} />
        <p className="text-subtle mt-4 text-sm">Click on completed steps to navigate back</p>
      </div>
    );
  },
};

export const CustomLabel: Story = {
  args: {
    maxSteps: 3,
    currentStep: 2,
    disableNavigation: true,
    stepLabel: (current, total) => `${current}/${total} completed`,
  },
};

export const ManySteps: Story = {
  args: {
    maxSteps: 10,
    currentStep: 7,
    disableNavigation: true,
  },
};

export const TwoSteps: Story = {
  args: {
    maxSteps: 2,
    currentStep: 1,
    disableNavigation: true,
  },
};
