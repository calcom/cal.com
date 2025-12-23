import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BookingActionsDropdown } from "./BookingActionsDropdown";
import { BookingActionsStoreProvider } from "./BookingActionsStoreProvider";
import type { BookingItemProps } from "../types";

// Mock booking data factory
const createMockBooking = (overrides?: Partial<BookingItemProps>): BookingItemProps => ({
  id: 1,
  uid: "booking-uid-123",
  title: "30 Min Meeting",
  description: "A quick meeting to discuss the project",
  startTime: new Date("2025-12-24T10:00:00Z"),
  endTime: new Date("2025-12-24T10:30:00Z"),
  status: "ACCEPTED",
  paid: false,
  payment: [],
  attendees: [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      timeZone: "America/New_York",
      locale: "en",
      noShow: false,
      phoneNumber: null,
    },
  ],
  user: {
    id: 1,
    name: "Jane Smith",
    email: "jane@example.com",
    username: "janesmith",
    timeZone: "America/Los_Angeles",
  },
  userPrimaryEmail: "jane@example.com",
  eventType: {
    id: 1,
    title: "30 Min Meeting",
    slug: "30min",
    length: 30,
    recurringEvent: null,
    team: null,
    parentId: null,
    disableCancelling: false,
    disableRescheduling: false,
    metadata: null,
    schedulingType: null,
  },
  location: "integrations:daily",
  recurringEventId: null,
  fromReschedule: null,
  seatsReferences: [],
  metadata: null,
  routedFromRoutingFormReponse: null,
  isRecorded: false,
  listingStatus: "upcoming",
  recurringInfo: undefined,
  loggedInUser: {
    userId: 1,
    userTimeZone: "America/Los_Angeles",
    userTimeFormat: 12,
    userEmail: "jane@example.com",
  },
  isToday: false,
  ...overrides,
});

const meta = {
  component: BookingActionsDropdown,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <BookingActionsStoreProvider>
        <Story />
      </BookingActionsStoreProvider>
    ),
  ],
} satisfies Meta<typeof BookingActionsDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    booking: createMockBooking(),
    context: "list",
  },
};

export const DetailsContext: Story = {
  args: {
    booking: createMockBooking({
      status: "PENDING",
    }),
    context: "details",
  },
};

export const PendingBooking: Story = {
  args: {
    booking: createMockBooking({
      status: "PENDING",
      listingStatus: "unconfirmed",
    }),
    context: "details",
  },
};

export const CancelledBooking: Story = {
  args: {
    booking: createMockBooking({
      status: "CANCELLED",
    }),
    context: "list",
  },
};

export const RejectedBooking: Story = {
  args: {
    booking: createMockBooking({
      status: "REJECTED",
    }),
    context: "list",
  },
};

export const PastBooking: Story = {
  args: {
    booking: createMockBooking({
      startTime: new Date("2025-12-20T10:00:00Z"),
      endTime: new Date("2025-12-20T10:30:00Z"),
    }),
    context: "list",
  },
};

export const RecurringBooking: Story = {
  args: {
    booking: createMockBooking({
      recurringEventId: "recurring-123",
      listingStatus: "recurring",
      eventType: {
        id: 1,
        title: "Weekly Standup",
        slug: "weekly-standup",
        length: 30,
        recurringEvent: {
          freq: 2,
          count: 12,
          interval: 1,
        },
        team: null,
        parentId: null,
        disableCancelling: false,
        disableRescheduling: false,
        metadata: null,
        schedulingType: null,
      },
    }),
    context: "list",
  },
};

export const WithPayment: Story = {
  args: {
    booking: createMockBooking({
      paid: true,
      payment: [
        {
          id: 1,
          success: true,
          amount: 5000,
          currency: "USD",
          paymentOption: "ON_BOOKING",
        },
      ],
    }),
    context: "list",
  },
};

export const WithPendingPayment: Story = {
  args: {
    booking: createMockBooking({
      paid: false,
      payment: [
        {
          id: 1,
          success: false,
          amount: 5000,
          currency: "USD",
          paymentOption: "ON_BOOKING",
        },
      ],
    }),
    context: "list",
  },
};

export const TeamBooking: Story = {
  args: {
    booking: createMockBooking({
      eventType: {
        id: 1,
        title: "Team Meeting",
        slug: "team-meeting",
        length: 60,
        recurringEvent: null,
        team: {
          id: 1,
          name: "Engineering Team",
          slug: "engineering",
        },
        parentId: null,
        disableCancelling: false,
        disableRescheduling: false,
        metadata: null,
        schedulingType: "COLLECTIVE",
      },
    }),
    context: "list",
  },
};

export const DisabledCancelling: Story = {
  args: {
    booking: createMockBooking({
      eventType: {
        id: 1,
        title: "Important Meeting",
        slug: "important-meeting",
        length: 30,
        recurringEvent: null,
        team: null,
        parentId: null,
        disableCancelling: true,
        disableRescheduling: false,
        metadata: null,
        schedulingType: null,
      },
    }),
    context: "list",
  },
};

export const DisabledRescheduling: Story = {
  args: {
    booking: createMockBooking({
      eventType: {
        id: 1,
        title: "Fixed Time Meeting",
        slug: "fixed-time-meeting",
        length: 30,
        recurringEvent: null,
        team: null,
        parentId: null,
        disableCancelling: false,
        disableRescheduling: true,
        metadata: null,
        schedulingType: null,
      },
    }),
    context: "list",
  },
};

export const WithRecordings: Story = {
  args: {
    booking: createMockBooking({
      isRecorded: true,
      startTime: new Date("2025-12-20T10:00:00Z"),
      endTime: new Date("2025-12-20T10:30:00Z"),
    }),
    context: "list",
  },
};

export const MultipleAttendees: Story = {
  args: {
    booking: createMockBooking({
      attendees: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          timeZone: "America/New_York",
          locale: "en",
          noShow: false,
          phoneNumber: "+1234567890",
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          timeZone: "America/Los_Angeles",
          locale: "en",
          noShow: false,
          phoneNumber: "+0987654321",
        },
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          timeZone: "Europe/London",
          locale: "en",
          noShow: false,
          phoneNumber: null,
        },
      ],
    }),
    context: "list",
  },
};

export const RescheduledBooking: Story = {
  args: {
    booking: createMockBooking({
      fromReschedule: "original-booking-uid",
    }),
    context: "list",
  },
};

export const RoutingFormBooking: Story = {
  args: {
    booking: createMockBooking({
      routedFromRoutingFormReponse: {
        id: 1,
        formId: "form-123",
      },
      eventType: {
        id: 1,
        title: "Sales Call",
        slug: "sales-call",
        length: 30,
        recurringEvent: null,
        team: {
          id: 1,
          name: "Sales Team",
          slug: "sales",
        },
        parentId: null,
        disableCancelling: false,
        disableRescheduling: false,
        metadata: null,
        schedulingType: null,
      },
    }),
    context: "list",
  },
};

export const SmallSize: Story = {
  args: {
    booking: createMockBooking(),
    context: "list",
    size: "xs",
  },
};

export const LargeSize: Story = {
  args: {
    booking: createMockBooking(),
    context: "list",
    size: "lg",
  },
};

export const WithoutPortal: Story = {
  args: {
    booking: createMockBooking(),
    context: "list",
    usePortal: false,
  },
};

export const CustomClassName: Story = {
  args: {
    booking: createMockBooking(),
    context: "list",
    className: "bg-brand-default hover:bg-brand-emphasis",
  },
};

export const AsAttendee: Story = {
  args: {
    booking: createMockBooking({
      seatsReferences: [
        {
          id: 1,
          referenceUid: "seat-ref-123",
          attendee: {
            id: 1,
            email: "jane@example.com",
            name: "Jane Smith",
          },
        },
      ],
      loggedInUser: {
        userId: 2,
        userTimeZone: "America/Los_Angeles",
        userTimeFormat: 12,
        userEmail: "jane@example.com",
      },
    }),
    context: "list",
  },
};
