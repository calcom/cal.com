import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { CancelBookingDialog } from "./CancelBookingDialog";

const meta = {
  title: "Components/Dialog/CancelBookingDialog",
  component: CancelBookingDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-[600px] min-w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CancelBookingDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const CancelBookingDialogWrapper = (args: React.ComponentProps<typeof CancelBookingDialog>) => {
  const [isOpen, setIsOpen] = useState(args.isOpenDialog);

  return <CancelBookingDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
};

export const Default: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    isOpenDialog: true,
    booking: {
      uid: "booking-uid-123",
      id: 1,
      title: "30 Min Meeting",
      startTime: new Date("2025-12-25T10:00:00Z"),
    },
    profile: {
      name: "John Doe",
      slug: "john-doe",
    },
    recurringEvent: null,
    team: null,
    teamId: undefined,
    allRemainingBookings: false,
    seatReferenceUid: undefined,
    currentUserEmail: "user@example.com",
    bookingCancelledEventProps: {
      booking: {},
      organizer: {
        name: "John Doe",
        email: "john@example.com",
        timeZone: "America/New_York",
      },
      eventType: {},
    },
    isHost: true,
    internalNotePresets: [],
    eventTypeMetadata: null,
  },
};

export const WithPayment: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-456",
      id: 2,
      title: "Consultation - 1 Hour",
      startTime: new Date("2025-12-26T14:00:00Z"),
      payment: [
        {
          amount: 5000,
          currency: "USD",
          success: true,
          paymentOption: "stripe",
          appId: "stripe",
          refunded: false,
        },
      ],
    },
  },
};

export const RecurringEvent: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-789",
      id: 3,
      title: "Weekly Standup",
      startTime: new Date("2025-12-24T09:00:00Z"),
    },
    recurringEvent: {
      freq: 2,
      count: 12,
      interval: 1,
    },
    allRemainingBookings: false,
  },
};

export const CancelAllRemaining: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-101",
      id: 4,
      title: "Weekly Standup",
      startTime: new Date("2025-12-24T09:00:00Z"),
    },
    recurringEvent: {
      freq: 2,
      count: 12,
      interval: 1,
    },
    allRemainingBookings: true,
  },
};

export const TeamBooking: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-202",
      id: 5,
      title: "Team Discovery Call",
      startTime: new Date("2025-12-27T15:00:00Z"),
    },
    team: "engineering-team",
    teamId: 100,
    profile: {
      name: "Engineering Team",
      slug: "engineering-team",
    },
  },
};

export const WithInternalNotePresets: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-303",
      id: 6,
      title: "Sales Call",
      startTime: new Date("2025-12-28T11:00:00Z"),
    },
    internalNotePresets: [
      { id: 1, name: "No Show", cancellationReason: "Attendee did not show up" },
      { id: 2, name: "Rescheduled", cancellationReason: "Meeting was rescheduled" },
      { id: 3, name: "Client Request", cancellationReason: "Cancelled at client's request" },
    ],
  },
};

export const AsGuest: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-404",
      id: 7,
      title: "Interview - Frontend Engineer",
      startTime: new Date("2025-12-29T16:00:00Z"),
    },
    isHost: false,
    currentUserEmail: "guest@example.com",
  },
};

export const WithSeatReference: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-505",
      id: 8,
      title: "Group Workshop - Design Systems",
      startTime: new Date("2025-12-30T13:00:00Z"),
    },
    seatReferenceUid: "seat-ref-abc-123",
  },
};

export const WithEventTypeMetadata: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-606",
      id: 9,
      title: "Custom Event",
      startTime: new Date("2025-12-31T10:00:00Z"),
    },
    eventTypeMetadata: {
      customField1: "value1",
      customField2: "value2",
      requiresConfirmation: true,
    },
  },
};

export const ComplexScenario: Story = {
  render: (args) => <CancelBookingDialogWrapper {...args} />,
  args: {
    ...Default.args,
    booking: {
      uid: "booking-uid-707",
      id: 10,
      title: "Enterprise Consultation",
      startTime: new Date("2026-01-02T14:00:00Z"),
      payment: [
        {
          amount: 25000,
          currency: "USD",
          success: true,
          paymentOption: "stripe",
          appId: "stripe",
          refunded: false,
        },
      ],
    },
    profile: {
      name: "Premium Consulting Team",
      slug: "premium-consulting",
    },
    team: "premium-consulting",
    teamId: 200,
    recurringEvent: {
      freq: 2,
      count: 4,
      interval: 1,
    },
    internalNotePresets: [
      { id: 1, name: "No Show", cancellationReason: "Attendee did not show up" },
      { id: 2, name: "Rescheduled", cancellationReason: "Meeting was rescheduled" },
    ],
    eventTypeMetadata: {
      requiresConfirmation: true,
      priority: "high",
    },
    isHost: true,
  },
};
