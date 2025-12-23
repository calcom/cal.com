import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RescheduleDialog } from "./RescheduleDialog";

const meta = {
  title: "Components/Dialog/RescheduleDialog",
  component: RescheduleDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-[600px] min-w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RescheduleDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle state
const RescheduleDialogWrapper = (args: { bookingUid: string; initialOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(args.initialOpen ?? true);

  return (
    <div>
      <button onClick={() => setIsOpen(true)} className="rounded bg-blue-500 px-4 py-2 text-white">
        Open Reschedule Dialog
      </button>
      <RescheduleDialog
        isOpenDialog={isOpen}
        setIsOpenDialog={setIsOpen}
        bookingUid={args.bookingUid}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <RescheduleDialogWrapper bookingUid="booking-uid-123" initialOpen={true} />,
  parameters: {
    docs: {
      description: {
        story: "Default reschedule dialog with standard booking UID.",
      },
    },
  },
};

export const WithButton: Story = {
  render: () => <RescheduleDialogWrapper bookingUid="booking-uid-456" initialOpen={false} />,
  parameters: {
    docs: {
      description: {
        story: "Reschedule dialog that can be opened via a button click.",
      },
    },
  },
};

export const LongBookingUid: Story = {
  render: () => (
    <RescheduleDialogWrapper
      bookingUid="very-long-booking-uid-with-many-characters-1234567890"
      initialOpen={true}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Reschedule dialog with a longer booking UID to test edge cases.",
      },
    },
  },
};
