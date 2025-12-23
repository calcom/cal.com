import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { Button } from "@calcom/ui/components/button";

import { MeetingSessionDetailsDialog } from "./MeetingSessionDetailsDialog";

const meta = {
  component: MeetingSessionDetailsDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpenDialog: {
      description: "Controls whether the dialog is open or closed",
      control: "boolean",
    },
    timeFormat: {
      description: "Time format (12 or 24 hour)",
      control: "select",
      options: [12, 24, null],
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MeetingSessionDetailsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockBookingBase = {
  id: 12345,
  uid: "abc123xyz",
  title: "30 Min Meeting",
  description: "Quick sync meeting",
  startTime: new Date("2024-03-15T14:00:00Z"),
  endTime: new Date("2024-03-15T14:30:00Z"),
  attendees: [
    {
      id: 1,
      email: "john@example.com",
      name: "John Doe",
      timeZone: "America/New_York",
      locale: "en",
    },
  ],
  user: {
    id: 1,
    email: "host@example.com",
    name: "Meeting Host",
    timeZone: "America/Los_Angeles",
  },
  metadata: {},
  status: "ACCEPTED" as const,
  paid: false,
  payment: [],
  references: [
    {
      id: 1,
      type: "daily_video",
      uid: "daily-meeting-room-123",
      meetingId: "daily-meeting-room-123",
      meetingPassword: "secret123",
      meetingUrl: "https://example.daily.co/daily-meeting-room-123",
    },
  ],
};

const mockBookingWithoutVideo = {
  ...mockBookingBase,
  references: [
    {
      id: 2,
      type: "google_calendar",
      uid: "gcal-event-456",
    },
  ],
};

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Meeting Session Details</Button>
        <MeetingSessionDetailsDialog
          booking={mockBookingBase}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const Open: Story = {
  args: {
    booking: mockBookingBase,
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    timeFormat: 12,
  },
};

export const With24HourFormat: Story = {
  render: function With24HourFormatStory() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Meeting Details (24h format)</Button>
        <MeetingSessionDetailsDialog
          booking={mockBookingBase}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={24}
        />
      </div>
    );
  },
};

export const WithoutVideoReference: Story = {
  render: function WithoutVideoReferenceStory() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Meeting Without Video</Button>
        <MeetingSessionDetailsDialog
          booking={mockBookingWithoutVideo}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const TeamMeeting: Story = {
  render: function TeamMeetingStory() {
    const [isOpen, setIsOpen] = useState(false);

    const teamBooking = {
      ...mockBookingBase,
      title: "Team Standup - Engineering",
      startTime: new Date("2024-03-20T10:00:00Z"),
      endTime: new Date("2024-03-20T10:30:00Z"),
      attendees: [
        {
          id: 1,
          email: "alice@example.com",
          name: "Alice Smith",
          timeZone: "America/New_York",
          locale: "en",
        },
        {
          id: 2,
          email: "bob@example.com",
          name: "Bob Johnson",
          timeZone: "America/Chicago",
          locale: "en",
        },
        {
          id: 3,
          email: "charlie@example.com",
          name: "Charlie Brown",
          timeZone: "Europe/London",
          locale: "en",
        },
      ],
    };

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Team Meeting Details</Button>
        <MeetingSessionDetailsDialog
          booking={teamBooking}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const LongMeeting: Story = {
  render: function LongMeetingStory() {
    const [isOpen, setIsOpen] = useState(false);

    const longBooking = {
      ...mockBookingBase,
      title: "Quarterly Business Review & Strategic Planning Session",
      startTime: new Date("2024-04-01T09:00:00Z"),
      endTime: new Date("2024-04-01T11:00:00Z"),
    };

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Long Meeting Details</Button>
        <MeetingSessionDetailsDialog
          booking={longBooking}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const RecurringMeeting: Story = {
  render: function RecurringMeetingStory() {
    const [isOpen, setIsOpen] = useState(false);

    const recurringBooking = {
      ...mockBookingBase,
      title: "Weekly 1:1 Check-in",
      startTime: new Date("2024-03-18T15:00:00Z"),
      endTime: new Date("2024-03-18T15:30:00Z"),
      recurringEventId: "weekly-checkin-789",
    };

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Recurring Meeting Details</Button>
        <MeetingSessionDetailsDialog
          booking={recurringBooking}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const PastMeeting: Story = {
  render: function PastMeetingStory() {
    const [isOpen, setIsOpen] = useState(false);

    const pastBooking = {
      ...mockBookingBase,
      title: "Product Demo",
      startTime: new Date("2024-01-15T14:00:00Z"),
      endTime: new Date("2024-01-15T14:45:00Z"),
    };

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Past Meeting Details</Button>
        <MeetingSessionDetailsDialog
          booking={pastBooking}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const UndefinedBooking: Story = {
  render: function UndefinedBookingStory() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <Button onClick={() => setIsOpen(true)}>View Meeting (No Booking Data)</Button>
        <MeetingSessionDetailsDialog
          booking={undefined}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
};

export const InteractiveExample: Story = {
  render: function InteractiveExampleStory() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(mockBookingBase);

    const meetings = [
      {
        label: "Standard Meeting",
        booking: mockBookingBase,
      },
      {
        label: "Team Meeting",
        booking: {
          ...mockBookingBase,
          title: "Team Standup",
          attendees: [
            ...mockBookingBase.attendees,
            {
              id: 2,
              email: "jane@example.com",
              name: "Jane Smith",
              timeZone: "Europe/London",
              locale: "en",
            },
          ],
        },
      },
      {
        label: "No Video Reference",
        booking: mockBookingWithoutVideo,
      },
    ];

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {meetings.map((meeting) => (
            <Button
              key={meeting.label}
              color="secondary"
              onClick={() => {
                setSelectedMeeting(meeting.booking as any);
                setIsOpen(true);
              }}>
              {meeting.label}
            </Button>
          ))}
        </div>
        <MeetingSessionDetailsDialog
          booking={selectedMeeting}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          timeFormat={12}
        />
      </div>
    );
  },
  parameters: {
    layout: "padded",
  },
};
