import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

// Create a presentational-only version for Storybook
// The actual component uses TRPC for mutations
const DisableUserImpersonationPreview = ({
  disableImpersonation,
}: {
  disableImpersonation: boolean;
}) => {
  const [disabled, setDisabled] = useState(disableImpersonation);

  return (
    <div className="flex flex-col justify-between pl-2 pt-9 sm:flex-row">
      <div>
        <div className="flex flex-row items-center">
          <h2 className="font-cal text-emphasis text-lg font-medium leading-6">User Impersonation</h2>
          <Badge className="ml-2 text-xs" variant={!disabled ? "success" : "gray"}>
            {!disabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="text-subtle mt-1 text-sm">
          Allow Cal.com support to temporarily access your account for troubleshooting
        </p>
      </div>
      <div className="mt-5 sm:mt-0 sm:self-center">
        <Button type="submit" color="secondary" onClick={() => setDisabled(!disabled)}>
          {!disabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  );
};

const meta = {
  component: DisableUserImpersonationPreview,
  title: "Web/Security/DisableUserImpersonation",
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
} satisfies Meta<typeof DisableUserImpersonationPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImpersonationEnabled: Story = {
  args: {
    disableImpersonation: false,
  },
};

export const ImpersonationDisabled: Story = {
  args: {
    disableImpersonation: true,
  },
};

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [disabled, setDisabled] = useState(false);

    return (
      <div className="flex flex-col justify-between pl-2 pt-9 sm:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">User Impersonation</h2>
            <Badge className="ml-2 text-xs" variant={!disabled ? "success" : "gray"}>
              {!disabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-subtle mt-1 text-sm">
            Allow Cal.com support to temporarily access your account for troubleshooting
          </p>
        </div>
        <div className="mt-5 sm:mt-0 sm:self-center">
          <Button type="submit" color="secondary" onClick={() => setDisabled(!disabled)}>
            {!disabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>
    );
  },
};
