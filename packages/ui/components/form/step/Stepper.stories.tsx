import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Stepper from "./Stepper";

const meta = {
  component: Stepper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSteps = [
  { title: "Account" },
  { title: "Profile" },
  { title: "Availability" },
  { title: "Complete" },
];

export const Default: Story = {
  args: {
    href: "/setup",
    step: 1,
    steps: defaultSteps,
  },
};

export const SecondStep: Story = {
  args: {
    href: "/setup",
    step: 2,
    steps: defaultSteps,
  },
};

export const ThirdStep: Story = {
  args: {
    href: "/setup",
    step: 3,
    steps: defaultSteps,
  },
};

export const FinalStep: Story = {
  args: {
    href: "/setup",
    step: 4,
    steps: defaultSteps,
  },
};

export const TwoSteps: Story = {
  args: {
    href: "/onboarding",
    step: 1,
    steps: [{ title: "Details" }, { title: "Confirm" }],
  },
};

export const FiveSteps: Story = {
  args: {
    href: "/wizard",
    step: 3,
    steps: [
      { title: "Welcome" },
      { title: "Account" },
      { title: "Team" },
      { title: "Integrations" },
      { title: "Done" },
    ],
  },
};

export const DisabledNavigation: Story = {
  args: {
    href: "/setup",
    step: 2,
    steps: defaultSteps,
    disableSteps: true,
  },
};

export const CustomLabel: Story = {
  args: {
    href: "/setup",
    step: 2,
    steps: defaultSteps,
    stepLabel: (current, total) => `${current}/${total}`,
  },
};

export const CustomLabelVerbose: Story = {
  args: {
    href: "/setup",
    step: 3,
    steps: defaultSteps,
    stepLabel: (current, total) => `Step ${current} out of ${total} steps`,
  },
};

export const OnboardingFlow: Story = {
  render: () => (
    <div className="w-[500px] space-y-8">
      <div className="border-subtle rounded-lg border p-6">
        <Stepper
          href="/onboarding"
          step={2}
          steps={[
            { title: "Welcome" },
            { title: "Connect Calendar" },
            { title: "Set Availability" },
            { title: "Create Event" },
          ]}
        />
        <div className="mt-8 text-center">
          <h2 className="text-lg font-semibold">Connect Your Calendar</h2>
          <p className="text-subtle mt-2 text-sm">
            Connect your calendar to automatically check for conflicts and add new bookings.
          </p>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
