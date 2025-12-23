import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ReassignDialog } from "./ReassignDialog";

const meta = {
  title: "Components/Dialog/ReassignDialog",
  component: ReassignDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A dialog component for reassigning bookings to different team members. Supports both automatic reassignment and manual selection of specific team members. Used for both managed events and round-robin events.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReassignDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to manage dialog state
function ReassignDialogWrapper(props: Omit<React.ComponentProps<typeof ReassignDialog>, "isOpenDialog" | "setIsOpenDialog">) {
  const [isOpenDialog, setIsOpenDialog] = useState(true);

  return (
    <>
      <button
        onClick={() => setIsOpenDialog(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Open Reassign Dialog
      </button>
      <ReassignDialog
        {...props}
        isOpenDialog={isOpenDialog}
        setIsOpenDialog={setIsOpenDialog}
      />
    </>
  );
}

export const Default: Story = {
  render: (args) => <ReassignDialogWrapper {...args} />,
  args: {
    teamId: 1,
    bookingId: 123,
    bookingFromRoutingForm: false,
    isManagedEvent: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Default reassign dialog for round-robin events with auto-reassign option.",
      },
    },
  },
};

export const ManagedEvent: Story = {
  render: (args) => <ReassignDialogWrapper {...args} />,
  args: {
    teamId: 1,
    bookingId: 123,
    bookingFromRoutingForm: false,
    isManagedEvent: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Reassign dialog for managed events, showing auto-reassign and specific team member options.",
      },
    },
  },
};

export const FromRoutingForm: Story = {
  render: (args) => <ReassignDialogWrapper {...args} />,
  args: {
    teamId: 1,
    bookingId: 123,
    bookingFromRoutingForm: true,
    isManagedEvent: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Reassign dialog for bookings from routing forms. Only shows manual team member selection (no auto-reassign option).",
      },
    },
  },
};

export const ManagedEventFromRoutingForm: Story = {
  render: (args) => <ReassignDialogWrapper {...args} />,
  args: {
    teamId: 1,
    bookingId: 123,
    bookingFromRoutingForm: true,
    isManagedEvent: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Reassign dialog for managed events from routing forms. Only manual selection is available.",
      },
    },
  },
};

export const RoundRobinEvent: Story = {
  render: (args) => <ReassignDialogWrapper {...args} />,
  args: {
    teamId: 1,
    bookingId: 456,
    bookingFromRoutingForm: false,
    isManagedEvent: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Reassign dialog for round-robin events with both auto and manual reassignment options.",
      },
    },
  },
};

export const WithDifferentTeamId: Story = {
  render: (args) => <ReassignDialogWrapper {...args} />,
  args: {
    teamId: 999,
    bookingId: 789,
    bookingFromRoutingForm: false,
    isManagedEvent: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Reassign dialog with a different team ID to test team-specific behavior.",
      },
    },
  },
};
