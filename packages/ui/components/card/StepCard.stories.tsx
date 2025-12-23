import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StepCard } from "./StepCard";

const meta = {
  component: StepCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h2 className="text-emphasis text-lg font-semibold">Step Title</h2>
        <p className="text-subtle mt-2">This is the content of the step card.</p>
      </div>
    ),
  },
};

export const WithForm: Story = {
  args: {
    children: (
      <div className="space-y-4">
        <h2 className="text-emphasis text-lg font-semibold">Create Your Account</h2>
        <div>
          <label className="text-emphasis mb-1 block text-sm font-medium">Name</label>
          <input
            type="text"
            className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="text-emphasis mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            className="border-subtle w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Enter your email"
          />
        </div>
      </div>
    ),
  },
};

export const WithDescription: Story = {
  args: {
    children: (
      <div>
        <h2 className="text-emphasis text-lg font-semibold">Connect Your Calendar</h2>
        <p className="text-subtle mt-2 text-sm">
          Connect your calendar to automatically check for conflicts and sync your availability.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="bg-emphasis text-inverted rounded-md px-4 py-2 text-sm font-medium">
            Connect Google
          </button>
          <button className="border-subtle text-emphasis rounded-md border px-4 py-2 text-sm font-medium">
            Connect Outlook
          </button>
        </div>
      </div>
    ),
  },
};

export const WithList: Story = {
  args: {
    children: (
      <div>
        <h2 className="text-emphasis text-lg font-semibold">Select Your Preferences</h2>
        <ul className="mt-4 space-y-2">
          {["Morning (9am - 12pm)", "Afternoon (12pm - 5pm)", "Evening (5pm - 9pm)"].map((time) => (
            <li key={time} className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded" />
              <span className="text-emphasis text-sm">{time}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
};
