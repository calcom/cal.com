import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "../button";
import { WizardLayout } from "./WizardLayout";

const meta = {
  component: WizardLayout,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "100%", maxWidth: "800px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WizardLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxSteps: 2,
    currentStep: 1,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">Welcome to the Setup</h2>
        <p className="text-subtle text-sm">
          This is the first step of the wizard. Let&apos;s get you started with setting up your account.
        </p>
        <div className="mt-6">
          <label className="text-emphasis mb-2 block text-sm font-medium">Your Name</label>
          <input
            type="text"
            className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Enter your name"
          />
        </div>
      </div>
    ),
  },
};

export const WithMultipleSteps: Story = {
  args: {
    maxSteps: 4,
    currentStep: 2,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">Configure Your Settings</h2>
        <p className="text-subtle text-sm">Step 2 of 4: Set your preferences</p>
        <div className="space-y-4">
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Time Zone</label>
            <select className="border-subtle w-full rounded-md border px-3 py-2 text-sm">
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
            </select>
          </div>
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Language</label>
            <select className="border-subtle w-full rounded-md border px-3 py-2 text-sm">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
        </div>
      </div>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    maxSteps: 3,
    currentStep: 2,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">Connect Your Calendar</h2>
        <p className="text-subtle text-sm">
          Connect your calendar to automatically sync your availability and prevent double bookings.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="bg-emphasis text-inverted rounded-md px-4 py-2 text-sm font-medium">
            Connect Google Calendar
          </button>
          <button className="border-subtle text-emphasis rounded-md border px-4 py-2 text-sm font-medium">
            Connect Outlook
          </button>
        </div>
      </div>
    ),
    footer: (
      <div className="flex justify-between rounded-md bg-gray-50 p-4">
        <Button color="secondary">Back</Button>
        <Button color="primary">Continue</Button>
      </div>
    ),
  },
};

export const WithOptionalCallback: Story = {
  args: {
    maxSteps: 3,
    currentStep: 1,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">Optional: Add Team Members</h2>
        <p className="text-subtle text-sm">
          Invite your team members to collaborate. You can skip this step and add them later.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
            placeholder="teammate@example.com"
          />
          <Button color="secondary" StartIcon="plus">
            Add Another
          </Button>
        </div>
      </div>
    ),
    isOptionalCallback: () => alert("Skip to next step"),
  },
};

export const FirstStep: Story = {
  args: {
    maxSteps: 5,
    currentStep: 0,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">Getting Started</h2>
        <p className="text-subtle text-sm">
          Welcome! Let&apos;s set up your account in just a few steps.
        </p>
        <div className="mt-6 space-y-4">
          <div className="border-subtle rounded-lg border p-4">
            <h3 className="text-emphasis text-base font-medium">What we&apos;ll cover</h3>
            <ul className="text-subtle mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Basic information</li>
              <li>Team setup</li>
              <li>Calendar integration</li>
              <li>Availability settings</li>
              <li>Review and confirm</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
};

export const LastStep: Story = {
  args: {
    maxSteps: 4,
    currentStep: 4,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">All Set!</h2>
        <p className="text-subtle text-sm">
          You&apos;re all done with the setup. Review your settings below.
        </p>
        <div className="mt-6 space-y-3">
          <div className="border-subtle rounded-lg border p-4">
            <div className="text-emphasis text-sm font-medium">Account Information</div>
            <div className="text-subtle mt-1 text-sm">John Doe • john@example.com</div>
          </div>
          <div className="border-subtle rounded-lg border p-4">
            <div className="text-emphasis text-sm font-medium">Calendar Connected</div>
            <div className="text-subtle mt-1 text-sm">Google Calendar</div>
          </div>
          <div className="border-subtle rounded-lg border p-4">
            <div className="text-emphasis text-sm font-medium">Team Members</div>
            <div className="text-subtle mt-1 text-sm">3 members added</div>
          </div>
        </div>
      </div>
    ),
    footer: (
      <div className="flex justify-end">
        <Button color="primary" size="lg">
          Get Started
        </Button>
      </div>
    ),
  },
};

export const WithFormContent: Story = {
  args: {
    maxSteps: 3,
    currentStep: 1,
    children: (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-emphasis text-lg font-semibold">Personal Information</h2>
          <p className="text-subtle mt-1 text-sm">Tell us a bit about yourself</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Company</label>
            <input
              type="text"
              className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <label className="text-emphasis mb-2 block text-sm font-medium">Role</label>
            <select className="border-subtle w-full rounded-md border px-3 py-2 text-sm">
              <option value="">Select a role</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>
      </div>
    ),
    footer: (
      <div className="flex justify-between">
        <Button color="minimal">Back</Button>
        <Button color="primary">Next Step</Button>
      </div>
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    const [currentStep, setCurrentStep] = useState(1);
    const maxSteps = 4;

    const stepContent = [
      {
        title: "Welcome",
        content: "Let's get started with your onboarding journey.",
      },
      {
        title: "Profile Setup",
        content: "Tell us about yourself and your preferences.",
      },
      {
        title: "Team Configuration",
        content: "Set up your team and invite members.",
      },
      {
        title: "Complete",
        content: "You're all set! Ready to get started?",
      },
    ];

    const step = stepContent[currentStep - 1];

    return (
      <WizardLayout
        maxSteps={maxSteps}
        currentStep={currentStep}
        footer={
          <div className="flex justify-between">
            <Button
              color="secondary"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}>
              Back
            </Button>
            <Button
              color="primary"
              onClick={() => setCurrentStep(Math.min(maxSteps, currentStep + 1))}>
              {currentStep === maxSteps ? "Finish" : "Next"}
            </Button>
          </div>
        }>
        <div className="space-y-4 p-6">
          <h2 className="text-emphasis text-lg font-semibold">{step.title}</h2>
          <p className="text-subtle text-sm">{step.content}</p>
          <div className="text-subtle mt-4 text-xs">
            Step {currentStep} of {maxSteps}
          </div>
        </div>
      </WizardLayout>
    );
  },
};

export const WithComplexFooter: Story = {
  args: {
    maxSteps: 3,
    currentStep: 2,
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-emphasis text-lg font-semibold">Review Your Choices</h2>
        <p className="text-subtle text-sm">
          Please review the information below before proceeding to the next step.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md bg-gray-50 p-3">
            <span className="text-emphasis text-sm">Selected Plan:</span>
            <span className="text-emphasis text-sm font-medium">Professional</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-gray-50 p-3">
            <span className="text-emphasis text-sm">Billing Cycle:</span>
            <span className="text-emphasis text-sm font-medium">Monthly</span>
          </div>
        </div>
      </div>
    ),
    footer: (
      <div className="space-y-3">
        <div className="bg-subtle rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-emphasis text-sm font-medium">Total:</span>
            <span className="text-emphasis text-lg font-bold">$29/month</span>
          </div>
        </div>
        <div className="flex justify-between">
          <Button color="minimal">Cancel</Button>
          <div className="flex gap-2">
            <Button color="secondary">Back</Button>
            <Button color="primary">Continue to Payment</Button>
          </div>
        </div>
      </div>
    ),
  },
};
