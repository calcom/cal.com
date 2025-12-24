import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

// Create a presentational-only version for Storybook
// The actual component uses modals with API calls
const TwoFactorAuthSectionPreview = ({ twoFactorEnabled }: { twoFactorEnabled: boolean }) => {
  const [enabled, setEnabled] = useState(twoFactorEnabled);

  return (
    <div className="flex flex-col justify-between pl-2 pt-9 sm:flex-row">
      <div>
        <div className="flex flex-row items-center">
          <h2 className="font-cal text-emphasis text-lg font-medium leading-6">Two-Factor Authentication</h2>
          <Badge className="ml-2 text-xs" variant={enabled ? "success" : "gray"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="text-subtle mt-1 text-sm">Add an extra layer of security to your account</p>
      </div>
      <div className="mt-5 sm:mt-0 sm:self-center">
        <Button type="submit" color="secondary" onClick={() => setEnabled(!enabled)}>
          {enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  );
};

const meta = {
  component: TwoFactorAuthSectionPreview,
  title: "Web/Security/TwoFactorAuthSection",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px] rounded-lg border border-default bg-default p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TwoFactorAuthSectionPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disabled: Story = {
  args: {
    twoFactorEnabled: false,
  },
};

export const Enabled: Story = {
  args: {
    twoFactorEnabled: true,
  },
};

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [enabled, setEnabled] = useState(false);

    return (
      <div className="flex flex-col justify-between pl-2 pt-9 sm:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">
              Two-Factor Authentication
            </h2>
            <Badge className="ml-2 text-xs" variant={enabled ? "success" : "gray"}>
              {enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-subtle mt-1 text-sm">Add an extra layer of security to your account</p>
        </div>
        <div className="mt-5 sm:mt-0 sm:self-center">
          <Button type="submit" color="secondary" onClick={() => setEnabled(!enabled)}>
            {enabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>
    );
  },
};
