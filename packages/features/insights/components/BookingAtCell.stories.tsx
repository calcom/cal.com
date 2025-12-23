import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BookingStatus } from "@calcom/prisma/enums";

import type { RoutingFormTableRow } from "../lib/types";
import { BookingAtCell } from "./BookingAtCell";

const meta = {
  component: BookingAtCell,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    row: {
      description: "The routing form table row data containing booking information",
      control: { type: "object" },
    },
    rowId: {
      description: "Unique identifier for the row",
      control: { type: "number" },
    },
  },
} satisfies Meta<typeof BookingAtCell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create mock booking data
const createMockRow = (overrides?: Partial<RoutingFormTableRow>): RoutingFormTableRow => ({
  id: "row-1",
  formId: "form-1",
  formFillerId: "filler-1",
  response: {},
  createdAt: new Date("2024-01-15T10:30:00Z"),
  bookingUid: "booking-abc123",
  bookingUserId: 1,
  bookingUserName: "John Doe",
  bookingUserEmail: "john.doe@example.com",
  bookingUserAvatarUrl: "https://cal.com/avatar/john-doe.jpg",
  bookingCreatedAt: new Date("2024-01-15T14:00:00Z"),
  bookingStatus: BookingStatus.ACCEPTED,
  ...overrides,
});

export const Default: Story = {
  args: {
    row: createMockRow(),
    rowId: 1,
  },
};

export const WithoutBooking: Story = {
  args: {
    row: createMockRow({
      bookingUserId: null,
      bookingCreatedAt: null,
      bookingUid: null,
      bookingUserName: null,
      bookingUserEmail: null,
      bookingUserAvatarUrl: null,
      bookingStatus: null,
    }),
    rowId: 1,
  },
};

export const AcceptedBooking: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Alice Johnson",
      bookingUserEmail: "alice.johnson@example.com",
      bookingUserAvatarUrl: "https://cal.com/avatar/alice.jpg",
      bookingStatus: BookingStatus.ACCEPTED,
      bookingCreatedAt: new Date("2024-03-20T09:00:00Z"),
    }),
    rowId: 1,
  },
};

export const PendingBooking: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Bob Smith",
      bookingUserEmail: "bob.smith@example.com",
      bookingUserAvatarUrl: "https://cal.com/avatar/bob.jpg",
      bookingStatus: BookingStatus.PENDING,
      bookingCreatedAt: new Date("2024-03-21T10:30:00Z"),
    }),
    rowId: 1,
  },
};

export const CancelledBooking: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Charlie Brown",
      bookingUserEmail: "charlie.brown@example.com",
      bookingUserAvatarUrl: "https://cal.com/avatar/charlie.jpg",
      bookingStatus: BookingStatus.CANCELLED,
      bookingCreatedAt: new Date("2024-03-19T15:45:00Z"),
    }),
    rowId: 1,
  },
};

export const RejectedBooking: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Diana Prince",
      bookingUserEmail: "diana.prince@example.com",
      bookingUserAvatarUrl: "https://cal.com/avatar/diana.jpg",
      bookingStatus: BookingStatus.REJECTED,
      bookingCreatedAt: new Date("2024-03-18T11:00:00Z"),
    }),
    rowId: 1,
  },
};

export const AwaitingHostBooking: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Eve Adams",
      bookingUserEmail: "eve.adams@example.com",
      bookingUserAvatarUrl: "https://cal.com/avatar/eve.jpg",
      bookingStatus: BookingStatus.AWAITING_HOST,
      bookingCreatedAt: new Date("2024-03-22T08:15:00Z"),
    }),
    rowId: 1,
  },
};

export const WithoutAvatar: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Frank Wilson",
      bookingUserEmail: "frank.wilson@example.com",
      bookingUserAvatarUrl: null,
      bookingStatus: BookingStatus.ACCEPTED,
      bookingCreatedAt: new Date("2024-03-17T16:30:00Z"),
    }),
    rowId: 1,
  },
};

export const LongEmailAddress: Story = {
  args: {
    row: createMockRow({
      bookingUserName: "Grace Hopper",
      bookingUserEmail: "grace.hopper.with.a.very.long.email@example-company.com",
      bookingUserAvatarUrl: "https://cal.com/avatar/grace.jpg",
      bookingStatus: BookingStatus.ACCEPTED,
      bookingCreatedAt: new Date("2024-03-16T13:20:00Z"),
    }),
    rowId: 1,
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Accepted</h3>
        <BookingAtCell
          row={createMockRow({
            bookingUserName: "Alice Johnson",
            bookingUserEmail: "alice@example.com",
            bookingStatus: BookingStatus.ACCEPTED,
          })}
          rowId={1}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Pending</h3>
        <BookingAtCell
          row={createMockRow({
            bookingUserName: "Bob Smith",
            bookingUserEmail: "bob@example.com",
            bookingStatus: BookingStatus.PENDING,
          })}
          rowId={2}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Cancelled</h3>
        <BookingAtCell
          row={createMockRow({
            bookingUserName: "Charlie Brown",
            bookingUserEmail: "charlie@example.com",
            bookingStatus: BookingStatus.CANCELLED,
          })}
          rowId={3}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Rejected</h3>
        <BookingAtCell
          row={createMockRow({
            bookingUserName: "Diana Prince",
            bookingUserEmail: "diana@example.com",
            bookingStatus: BookingStatus.REJECTED,
          })}
          rowId={4}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Awaiting Host</h3>
        <BookingAtCell
          row={createMockRow({
            bookingUserName: "Eve Adams",
            bookingUserEmail: "eve@example.com",
            bookingStatus: BookingStatus.AWAITING_HOST,
          })}
          rowId={5}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">No Booking</h3>
        <BookingAtCell
          row={createMockRow({
            bookingUserId: null,
            bookingCreatedAt: null,
            bookingUid: null,
            bookingUserName: null,
            bookingUserEmail: null,
            bookingUserAvatarUrl: null,
            bookingStatus: null,
          })}
          rowId={6}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
