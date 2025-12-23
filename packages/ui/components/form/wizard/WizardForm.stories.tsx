import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WizardForm } from "./WizardForm";

const meta = {
  component: WizardForm,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WizardForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    steps: [
      {
        title: "Welcome",
        description: "Let's get you started with your account setup",
        content: (
          <div className="p-4">
            <p className="text-subtle text-sm">Welcome to the setup wizard. Click Next to continue.</p>
          </div>
        ),
      },
      {
        title: "Profile",
        description: "Tell us a bit about yourself",
        content: (
          <div className="space-y-4 p-4">
            <div>
              <label className="text-emphasis mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-emphasis mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
                placeholder="your@email.com"
              />
            </div>
          </div>
        ),
      },
      {
        title: "Complete",
        description: "You're all set!",
        content: (
          <div className="p-4 text-center">
            <p className="text-emphasis text-lg font-medium">Setup Complete!</p>
            <p className="text-subtle mt-2 text-sm">Your account is ready to use.</p>
          </div>
        ),
      },
    ],
  },
};

export const TwoSteps: Story = {
  args: {
    steps: [
      {
        title: "Select Event Type",
        description: "Choose the type of event you want to create",
        content: (
          <div className="space-y-2 p-4">
            {["One-on-One", "Group", "Round Robin"].map((type) => (
              <label key={type} className="border-subtle flex cursor-pointer items-center rounded-md border p-3">
                <input type="radio" name="eventType" className="mr-3" />
                <span className="text-emphasis text-sm font-medium">{type}</span>
              </label>
            ))}
          </div>
        ),
      },
      {
        title: "Configure Settings",
        description: "Set up your event details",
        content: (
          <div className="space-y-4 p-4">
            <div>
              <label className="text-emphasis mb-1 block text-sm font-medium">Duration</label>
              <select className="border-subtle w-full rounded-md border px-3 py-2 text-sm">
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>60 minutes</option>
              </select>
            </div>
          </div>
        ),
      },
    ],
  },
};

export const CustomLabels: Story = {
  args: {
    prevLabel: "Go Back",
    nextLabel: "Continue",
    finishLabel: "Complete Setup",
    steps: [
      {
        title: "Step 1",
        description: "First step description",
        content: <div className="p-4">Step 1 content</div>,
      },
      {
        title: "Step 2",
        description: "Second step description",
        content: <div className="p-4">Step 2 content</div>,
      },
      {
        title: "Step 3",
        description: "Final step",
        content: <div className="p-4">Step 3 content</div>,
      },
    ],
  },
};

export const WithDisabledStep: Story = {
  args: {
    steps: [
      {
        title: "Required Fields",
        description: "Fill out all required fields to continue",
        isEnabled: false,
        content: (
          <div className="space-y-4 p-4">
            <div>
              <label className="text-emphasis mb-1 block text-sm font-medium">
                Required Field <span className="text-error">*</span>
              </label>
              <input
                type="text"
                className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Enter value to enable Next"
              />
            </div>
          </div>
        ),
      },
      {
        title: "Confirmation",
        description: "Review and confirm",
        content: <div className="p-4">Confirmation content</div>,
      },
    ],
  },
};

export const DisabledNavigation: Story = {
  args: {
    disableNavigation: true,
    steps: [
      {
        title: "Linear Wizard",
        description: "Navigation is disabled - use custom buttons",
        customActions: true,
        content: (
          <div className="p-4">
            <p className="text-subtle text-sm">This wizard has disabled navigation controls.</p>
          </div>
        ),
      },
    ],
  },
};
