import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RadioAreaGroup, RadioArea } from "./RadioAreaGroup";

const meta = {
  component: RadioAreaGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioAreaGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("option1");
    return (
      <RadioAreaGroup value={value} onValueChange={setValue} className="space-y-3">
        <RadioArea value="option1">
          <div>
            <p className="text-emphasis font-medium">Option 1</p>
            <p className="text-subtle text-sm">Description for option 1</p>
          </div>
        </RadioArea>
        <RadioArea value="option2">
          <div>
            <p className="text-emphasis font-medium">Option 2</p>
            <p className="text-subtle text-sm">Description for option 2</p>
          </div>
        </RadioArea>
        <RadioArea value="option3">
          <div>
            <p className="text-emphasis font-medium">Option 3</p>
            <p className="text-subtle text-sm">Description for option 3</p>
          </div>
        </RadioArea>
      </RadioAreaGroup>
    );
  },
};

export const EventTypeSelection: Story = {
  render: () => {
    const [value, setValue] = useState("one-on-one");
    return (
      <RadioAreaGroup value={value} onValueChange={setValue} className="space-y-3">
        <RadioArea value="one-on-one">
          <div>
            <p className="text-emphasis font-medium">One-on-One</p>
            <p className="text-subtle text-sm">Allow invitees to book individual meetings with you</p>
          </div>
        </RadioArea>
        <RadioArea value="round-robin">
          <div>
            <p className="text-emphasis font-medium">Round Robin</p>
            <p className="text-subtle text-sm">Distribute meetings across team members</p>
          </div>
        </RadioArea>
        <RadioArea value="collective">
          <div>
            <p className="text-emphasis font-medium">Collective</p>
            <p className="text-subtle text-sm">All hosts must be available for the meeting</p>
          </div>
        </RadioArea>
      </RadioAreaGroup>
    );
  },
};

export const PlanSelection: Story = {
  render: () => {
    const [value, setValue] = useState("pro");
    return (
      <RadioAreaGroup value={value} onValueChange={setValue} className="space-y-3">
        <RadioArea value="free">
          <div className="flex justify-between">
            <div>
              <p className="text-emphasis font-medium">Free</p>
              <p className="text-subtle text-sm">Basic scheduling features</p>
            </div>
            <p className="text-emphasis font-semibold">$0/mo</p>
          </div>
        </RadioArea>
        <RadioArea value="pro">
          <div className="flex justify-between">
            <div>
              <p className="text-emphasis font-medium">Pro</p>
              <p className="text-subtle text-sm">Advanced features for professionals</p>
            </div>
            <p className="text-emphasis font-semibold">$12/mo</p>
          </div>
        </RadioArea>
        <RadioArea value="team">
          <div className="flex justify-between">
            <div>
              <p className="text-emphasis font-medium">Team</p>
              <p className="text-subtle text-sm">Collaboration for teams</p>
            </div>
            <p className="text-emphasis font-semibold">$15/mo</p>
          </div>
        </RadioArea>
      </RadioAreaGroup>
    );
  },
};

export const WithDisabled: Story = {
  render: () => {
    const [value, setValue] = useState("enabled1");
    return (
      <RadioAreaGroup value={value} onValueChange={setValue} className="space-y-3">
        <RadioArea value="enabled1">
          <div>
            <p className="text-emphasis font-medium">Enabled Option</p>
            <p className="text-subtle text-sm">This option is available</p>
          </div>
        </RadioArea>
        <RadioArea value="disabled1" disabled>
          <div>
            <p className="text-emphasis font-medium">Disabled Option</p>
            <p className="text-subtle text-sm">This option requires upgrade</p>
          </div>
        </RadioArea>
        <RadioArea value="enabled2">
          <div>
            <p className="text-emphasis font-medium">Another Enabled Option</p>
            <p className="text-subtle text-sm">This option is also available</p>
          </div>
        </RadioArea>
      </RadioAreaGroup>
    );
  },
};

export const ConferencingOptions: Story = {
  render: () => {
    const [value, setValue] = useState("google-meet");
    return (
      <RadioAreaGroup value={value} onValueChange={setValue} className="space-y-3">
        <RadioArea value="google-meet">
          <div className="flex items-center gap-3">
            <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-lg">
              <span className="text-lg">G</span>
            </div>
            <div>
              <p className="text-emphasis font-medium">Google Meet</p>
              <p className="text-subtle text-sm">Video conferencing by Google</p>
            </div>
          </div>
        </RadioArea>
        <RadioArea value="zoom">
          <div className="flex items-center gap-3">
            <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-lg">
              <span className="text-lg">Z</span>
            </div>
            <div>
              <p className="text-emphasis font-medium">Zoom</p>
              <p className="text-subtle text-sm">Video conferencing by Zoom</p>
            </div>
          </div>
        </RadioArea>
        <RadioArea value="cal-video">
          <div className="flex items-center gap-3">
            <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-lg">
              <span className="text-lg">C</span>
            </div>
            <div>
              <p className="text-emphasis font-medium">Cal Video</p>
              <p className="text-subtle text-sm">Built-in video conferencing</p>
            </div>
          </div>
        </RadioArea>
      </RadioAreaGroup>
    );
  },
};
