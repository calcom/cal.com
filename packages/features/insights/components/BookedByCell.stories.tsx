import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BookedByCell } from "./BookedByCell";

const meta = {
  component: BookedByCell,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BookedByCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    attendees: [
      {
        name: "John Doe",
        email: "john.doe@example.com",
        phoneNumber: "+1 (555) 123-4567",
      },
    ],
    rowId: 1,
  },
};

export const MultipleAttendees: Story = {
  args: {
    attendees: [
      {
        name: "John Doe",
        email: "john.doe@example.com",
        phoneNumber: "+1 (555) 123-4567",
      },
      {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        phoneNumber: "+1 (555) 987-6543",
      },
      {
        name: "Bob Johnson",
        email: "bob.johnson@example.com",
        phoneNumber: "+1 (555) 246-8135",
      },
    ],
    rowId: 2,
  },
};

export const WithoutPhoneNumbers: Story = {
  args: {
    attendees: [
      {
        name: "Alice Cooper",
        email: "alice.cooper@example.com",
        phoneNumber: null,
      },
      {
        name: "Charlie Brown",
        email: "charlie.brown@example.com",
        phoneNumber: null,
      },
    ],
    rowId: 3,
  },
};

export const SingleAttendeeWithoutPhone: Story = {
  args: {
    attendees: [
      {
        name: "Emily Davis",
        email: "emily.davis@example.com",
        phoneNumber: null,
      },
    ],
    rowId: 4,
  },
};

export const LongNameAttendee: Story = {
  args: {
    attendees: [
      {
        name: "Alexander Christopher Montgomery Wellington III",
        email: "alexander.wellington@example.com",
        phoneNumber: "+1 (555) 111-2222",
      },
    ],
    rowId: 5,
  },
};

export const ManyAttendees: Story = {
  args: {
    attendees: [
      {
        name: "Attendee 1",
        email: "attendee1@example.com",
        phoneNumber: "+1 (555) 111-1111",
      },
      {
        name: "Attendee 2",
        email: "attendee2@example.com",
        phoneNumber: "+1 (555) 222-2222",
      },
      {
        name: "Attendee 3",
        email: "attendee3@example.com",
        phoneNumber: "+1 (555) 333-3333",
      },
      {
        name: "Attendee 4",
        email: "attendee4@example.com",
        phoneNumber: "+1 (555) 444-4444",
      },
      {
        name: "Attendee 5",
        email: "attendee5@example.com",
        phoneNumber: "+1 (555) 555-5555",
      },
    ],
    rowId: 6,
  },
};

export const Empty: Story = {
  args: {
    attendees: [],
    rowId: 7,
  },
};

export const NullAttendees: Story = {
  args: {
    attendees: null,
    rowId: 8,
  },
};
