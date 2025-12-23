import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import CancelBooking from "./CancelBooking";

const meta = {
  title: "Components/Booking/CancelBooking",
  component: CancelBooking,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CancelBooking>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseBooking = {
  title: "Team Meeting",
  uid: "booking-uid-123",
  id: 1,
  startTime: new Date("2025-12-30T10:00:00Z"),
};

const baseProfile = {
  name: "John Doe",
  slug: "john-doe",
};

const baseBookingCancelledEventProps = {
  booking: {
    id: 1,
    uid: "booking-uid-123",
    title: "Team Meeting",
  },
  organizer: {
    name: "John Doe",
    email: "john@example.com",
    timeZone: "America/New_York",
  },
  eventType: {
    title: "Team Meeting",
    length: 30,
  },
};

export const Default: Story = {
  args: {
    booking: baseBooking,
    profile: baseProfile,
    recurringEvent: null,
    team: null,
    setIsCancellationMode: () => {},
    theme: "light",
    allRemainingBookings: false,
    currentUserEmail: "user@example.com",
    bookingCancelledEventProps: baseBookingCancelledEventProps,
    isHost: false,
    internalNotePresets: [],
    renderContext: "booking-single-view",
    eventTypeMetadata: null,
  },
};

export const DialogContext: Story = {
  args: {
    ...Default.args,
    renderContext: "dialog",
  },
};

export const HostCancelling: Story = {
  args: {
    ...Default.args,
    isHost: true,
    currentUserEmail: "john@example.com",
  },
};

export const HostWithInternalNotePresets: Story = {
  args: {
    ...Default.args,
    isHost: true,
    currentUserEmail: "john@example.com",
    internalNotePresets: [
      {
        id: 1,
        name: "No show",
        cancellationReason: "Attendee did not show up for the meeting",
      },
      {
        id: 2,
        name: "Rescheduled",
        cancellationReason: "Meeting was rescheduled to a different time",
      },
      {
        id: 3,
        name: "Technical issues",
        cancellationReason: "Unable to proceed due to technical difficulties",
      },
    ],
  },
};

export const WithPayment: Story = {
  args: {
    ...Default.args,
    booking: {
      ...baseBooking,
      payment: {
        amount: 5000, // $50.00 in cents
        currency: "USD",
        appId: "stripe",
      },
    },
  },
};

export const WithNoShowFee: Story = {
  args: {
    ...Default.args,
    booking: {
      ...baseBooking,
      startTime: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
      payment: {
        amount: 5000, // $50.00 in cents
        currency: "USD",
        appId: "stripe",
      },
    },
    eventTypeMetadata: {
      apps: {
        stripe: {
          autoChargeNoShowFeeTimeValue: 24,
          autoChargeNoShowFeeTimeUnit: "hours",
          autoChargeNoShowFee: true,
        },
      },
    },
  },
};

export const RecurringBooking: Story = {
  args: {
    ...Default.args,
    allRemainingBookings: true,
    recurringEvent: {
      freq: 2, // WEEKLY
      count: 10,
      interval: 1,
    },
  },
};

export const WithTeam: Story = {
  args: {
    ...Default.args,
    team: "Engineering Team",
    teamId: 42,
  },
};

export const SeatReservation: Story = {
  args: {
    ...Default.args,
    seatReferenceUid: "seat-ref-uid-456",
  },
};

export const AlreadyCancelled: Story = {
  args: {
    ...Default.args,
    booking: {
      ...baseBooking,
      uid: undefined,
    },
  },
};

export const WithErrorAsToast: Story = {
  args: {
    ...Default.args,
    showErrorAsToast: true,
  },
};

export const ComplexScenario: Story = {
  args: {
    ...Default.args,
    isHost: true,
    currentUserEmail: "john@example.com",
    team: "Sales Team",
    teamId: 123,
    internalNotePresets: [
      {
        id: 1,
        name: "Client requested reschedule",
        cancellationReason: "Client needs to reschedule to next week",
      },
      {
        id: 2,
        name: "Emergency",
        cancellationReason: "Unexpected emergency arose",
      },
    ],
    booking: {
      ...baseBooking,
      payment: {
        amount: 10000, // $100.00 in cents
        currency: "USD",
        appId: "stripe",
      },
    },
    recurringEvent: {
      freq: 2, // WEEKLY
      count: 5,
      interval: 1,
    },
    allRemainingBookings: true,
  },
};
