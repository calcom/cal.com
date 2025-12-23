import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { ScheduleListItem } from "./ScheduleListItem";

const meta = {
  component: ScheduleListItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <ul>
          <Story />
        </ul>
      </div>
    ),
  ],
  argTypes: {
    schedule: {
      description: "Schedule data including name, availability times, and timezone",
    },
    deleteFunction: {
      description: "Function called when deleting a schedule",
    },
    displayOptions: {
      description: "Display options for timezone and time formatting",
    },
    isDeletable: {
      description: "Whether the schedule can be deleted",
      control: "boolean",
    },
    updateDefault: {
      description: "Function called when setting a schedule as default",
    },
    duplicateFunction: {
      description: "Function called when duplicating a schedule",
    },
    redirectUrl: {
      description: "URL to navigate to when clicking the schedule",
    },
  },
} satisfies Meta<typeof ScheduleListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockAvailability = [
  {
    id: 1,
    userId: 1,
    eventTypeId: null,
    days: [1, 2, 3, 4, 5],
    startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0, 0)),
    endTime: new Date(Date.UTC(1970, 0, 1, 17, 0, 0, 0)),
    date: null,
    scheduleId: 1,
    profileId: null,
  },
];

const mockSchedule = {
  id: 1,
  userId: 1,
  name: "Working Hours",
  availability: mockAvailability,
  timeZone: "America/New_York",
  dateOverrides: [],
  isDefault: false,
  isManaged: false,
  workingHours: [],
  profileId: null,
};

export const Default: Story = {
  args: {
    schedule: mockSchedule,
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/1",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};

export const DefaultSchedule: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      isDefault: true,
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/1",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};

export const NotDeletable: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "Last Schedule",
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: false,
    redirectUrl: "/availability/1",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};

export const TwentyFourHourFormat: Story = {
  args: {
    schedule: mockSchedule,
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/1",
    displayOptions: {
      hour12: false,
      weekStart: "Sunday",
    },
  },
};

export const WeekendSchedule: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "Weekend Availability",
      availability: [
        {
          id: 2,
          userId: 1,
          eventTypeId: null,
          days: [6, 0],
          startTime: new Date(Date.UTC(1970, 0, 1, 10, 0, 0, 0)),
          endTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0, 0)),
          date: null,
          scheduleId: 2,
          profileId: null,
        },
      ],
      timeZone: "America/Los_Angeles",
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/2",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};

export const MultipleTimeRanges: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "Split Schedule",
      availability: [
        {
          id: 3,
          userId: 1,
          eventTypeId: null,
          days: [1, 2, 3, 4, 5],
          startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0, 0)),
          endTime: new Date(Date.UTC(1970, 0, 1, 12, 0, 0, 0)),
          date: null,
          scheduleId: 3,
          profileId: null,
        },
        {
          id: 4,
          userId: 1,
          eventTypeId: null,
          days: [1, 2, 3, 4, 5],
          startTime: new Date(Date.UTC(1970, 0, 1, 13, 0, 0, 0)),
          endTime: new Date(Date.UTC(1970, 0, 1, 17, 0, 0, 0)),
          date: null,
          scheduleId: 3,
          profileId: null,
        },
      ],
      timeZone: "Europe/London",
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/3",
    displayOptions: {
      hour12: false,
      weekStart: "Monday",
    },
  },
};

export const StaggeredDays: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "Custom Days",
      availability: [
        {
          id: 5,
          userId: 1,
          eventTypeId: null,
          days: [1, 3, 5],
          startTime: new Date(Date.UTC(1970, 0, 1, 8, 0, 0, 0)),
          endTime: new Date(Date.UTC(1970, 0, 1, 16, 30, 0, 0)),
          date: null,
          scheduleId: 4,
          profileId: null,
        },
      ],
      timeZone: "Asia/Tokyo",
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/4",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};

export const AllDaysAvailable: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "24/7 Support",
      availability: [
        {
          id: 6,
          userId: 1,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0)),
          endTime: new Date(Date.UTC(1970, 0, 1, 23, 59, 0, 0)),
          date: null,
          scheduleId: 5,
          profileId: null,
        },
      ],
      timeZone: "UTC",
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/5",
    displayOptions: {
      hour12: false,
      weekStart: "Sunday",
    },
  },
};

export const NoTimezone: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "No Timezone Schedule",
      timeZone: null,
      availability: mockAvailability,
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/6",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};

export const LongScheduleName: Story = {
  args: {
    schedule: {
      ...mockSchedule,
      name: "This is a very long schedule name that should be truncated in the UI to prevent layout issues",
    },
    deleteFunction: fn(),
    updateDefault: fn(),
    duplicateFunction: fn(),
    isDeletable: true,
    redirectUrl: "/availability/7",
    displayOptions: {
      hour12: true,
      weekStart: "Sunday",
    },
  },
};
