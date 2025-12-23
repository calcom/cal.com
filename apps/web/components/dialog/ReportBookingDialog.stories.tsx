import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ReportBookingDialog } from "./ReportBookingDialog";

const meta = {
  title: "Components/Dialog/ReportBookingDialog",
  component: ReportBookingDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-[600px] w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReportBookingDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle dialog state
const ReportBookingDialogWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(args.isOpenDialog);

  return (
    <ReportBookingDialog
      {...args}
      isOpenDialog={isOpen}
      setIsOpenDialog={setIsOpen}
    />
  );
};

export const Default: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    bookingUid: "booking-123",
    isRecurring: false,
    status: "upcoming",
  },
};

export const UpcomingBooking: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    bookingUid: "booking-upcoming-123",
    isRecurring: false,
    status: "upcoming",
  },
};

export const PastBooking: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    bookingUid: "booking-past-123",
    isRecurring: false,
    status: "past",
  },
};

export const CancelledBooking: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    bookingUid: "booking-cancelled-123",
    isRecurring: false,
    status: "cancelled",
  },
};

export const RejectedBooking: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    bookingUid: "booking-rejected-123",
    isRecurring: false,
    status: "rejected",
  },
};

export const RecurringBooking: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    bookingUid: "booking-recurring-123",
    isRecurring: true,
    status: "upcoming",
  },
};

export const Closed: Story = {
  render: (args) => <ReportBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: false,
    bookingUid: "booking-123",
    isRecurring: false,
    status: "upcoming",
  },
};
