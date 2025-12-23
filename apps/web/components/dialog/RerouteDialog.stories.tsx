import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { RerouteDialog } from "./RerouteDialog";

const meta = {
  title: "Components/Dialog/RerouteDialog",
  component: RerouteDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    isOpenDialog: {
      control: "boolean",
      description: "Controls whether the dialog is open",
    },
    setIsOpenDialog: {
      action: "setIsOpenDialog",
      description: "Callback to control dialog open state",
    },
    booking: {
      description: "Booking object with routing information",
    },
  },
} satisfies Meta<typeof RerouteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockBooking = {
  id: 1,
  uid: "booking-uid-123",
  title: "Team Meeting",
  status: "ACCEPTED" as const,
  startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  metadata: {
    videoCallUrl: "https://example.com/call",
  },
  responses: {
    name: { value: "John Doe" },
    email: { value: "john.doe@example.com" },
    notes: { value: "Looking forward to the meeting" },
  },
  routedFromRoutingFormReponse: {
    id: 1,
  },
  attendees: [
    {
      name: "John Doe",
      email: "john.doe@example.com",
      timeZone: "America/New_York",
      locale: "en",
    },
  ],
  eventType: {
    id: 1,
    slug: "team-meeting",
    title: "Team Meeting",
    length: 30,
    schedulingType: "ROUND_ROBIN" as const,
    team: {
      slug: "engineering",
    },
  },
  user: {
    id: 1,
    name: "Jane Smith",
    email: "jane.smith@example.com",
  },
};

const mockBookingWithCollectiveScheduling = {
  ...mockBooking,
  eventType: {
    ...mockBooking.eventType,
    schedulingType: "COLLECTIVE" as const,
  },
};

const mockBookingPastTimeslot = {
  ...mockBooking,
  startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
};

export const Default: Story = {
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    booking: mockBooking,
  },
};

export const Closed: Story = {
  args: {
    isOpenDialog: false,
    setIsOpenDialog: fn(),
    booking: mockBooking,
  },
};

export const CollectiveScheduling: Story = {
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    booking: mockBookingWithCollectiveScheduling,
  },
};

export const PastTimeslot: Story = {
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    booking: mockBookingPastTimeslot,
  },
};

export const LongEventDuration: Story = {
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    booking: {
      ...mockBooking,
      eventType: {
        ...mockBooking.eventType,
        length: 120, // 2 hours
        title: "Extended Strategy Session",
      },
    },
  },
};

export const MultipleAttendees: Story = {
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    booking: {
      ...mockBooking,
      attendees: [
        {
          name: "John Doe",
          email: "john.doe@example.com",
          timeZone: "America/New_York",
          locale: "en",
        },
        {
          name: "Alice Johnson",
          email: "alice.johnson@example.com",
          timeZone: "America/Los_Angeles",
          locale: "en",
        },
        {
          name: "Bob Williams",
          email: "bob.williams@example.com",
          timeZone: "Europe/London",
          locale: "en",
        },
      ],
    },
  },
};

export const DifferentTimezones: Story = {
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    booking: {
      ...mockBooking,
      attendees: [
        {
          name: "Tokyo User",
          email: "tokyo@example.com",
          timeZone: "Asia/Tokyo",
          locale: "ja",
        },
      ],
    },
  },
};
