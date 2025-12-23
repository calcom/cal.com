import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import dayjs from "@calcom/dayjs";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import { BookingStatus } from "@calcom/prisma/enums";

import { LargeCalendar } from "./LargeCalendar";

// Mock next-auth session
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        username: "testuser",
        org: {
          slug: "test-org",
        },
      },
    },
    status: "authenticated",
  }),
}));

// Mock troubleshooter store
const mockTroubleshooterStore = {
  selectedDate: dayjs().format("YYYY-MM-DD"),
  event: {
    id: 1,
    slug: "30min",
    duration: 30,
    teamId: null,
  },
  calendarToColorMap: {
    "calendar-1": "#FF5733",
    "calendar-2": "#33C1FF",
    "calendar-3": "#7CFC00",
  },
};

jest.mock("../store", () => ({
  useTroubleshooterStore: (selector: any) => {
    if (typeof selector === "function") {
      return selector(mockTroubleshooterStore);
    }
    return mockTroubleshooterStore;
  },
}));

// Mock time preferences
jest.mock("../../bookings/lib/timePreferences", () => ({
  useTimePreferences: () => ({
    timezone: "America/New_York",
  }),
}));

// Mock tRPC
const mockBusyEvents = [
  {
    title: "Team Standup",
    start: dayjs().hour(9).minute(0).toISOString(),
    end: dayjs().hour(9).minute(30).toISOString(),
    source: "calendar-1",
  },
  {
    title: "Client Meeting",
    start: dayjs().hour(14).minute(0).toISOString(),
    end: dayjs().hour(15).minute(0).toISOString(),
    source: "calendar-2",
  },
  {
    title: "Code Review",
    start: dayjs().add(1, "day").hour(10).minute(0).toISOString(),
    end: dayjs().add(1, "day").hour(11).minute(0).toISOString(),
    source: "calendar-3",
  },
];

jest.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      availability: {
        user: {
          useQuery: () => ({
            data: {
              busy: mockBusyEvents,
              dateOverrides: [],
              workingHours: [
                {
                  days: [0, 1, 2, 3, 4, 5, 6],
                  startTime: 540, // 9:00 AM
                  endTime: 1020, // 5:00 PM
                },
              ],
            },
            isLoading: false,
          }),
        },
      },
    },
  },
}));

// Mock useSchedule
jest.mock("../../schedules/lib/use-schedule/useSchedule", () => ({
  useSchedule: () => ({
    data: {
      slots: {},
    },
    isLoading: false,
  }),
}));

// Helper function to generate available timeslots
const generateAvailableTimeslots = (days: number, startDate: Date): CalendarAvailableTimeslots => {
  const slots: CalendarAvailableTimeslots = {};

  for (let i = 0; i < days; i++) {
    const date = dayjs(startDate).add(i, "day");
    const dateKey = date.format("YYYY-MM-DD");

    // Generate morning slots (9 AM - 12 PM)
    const morningSlots = [];
    for (let hour = 9; hour < 12; hour++) {
      morningSlots.push({
        start: date.hour(hour).minute(0).toDate(),
        end: date.hour(hour).minute(30).toDate(),
      });
      morningSlots.push({
        start: date.hour(hour).minute(30).toDate(),
        end: date.hour(hour + 1).minute(0).toDate(),
      });
    }

    // Generate afternoon slots (1 PM - 5 PM)
    const afternoonSlots = [];
    for (let hour = 13; hour < 17; hour++) {
      afternoonSlots.push({
        start: date.hour(hour).minute(0).toDate(),
        end: date.hour(hour).minute(30).toDate(),
      });
      afternoonSlots.push({
        start: date.hour(hour).minute(30).toDate(),
        end: date.hour(hour + 1).minute(0).toDate(),
      });
    }

    slots[dateKey] = [...morningSlots, ...afternoonSlots];
  }

  return slots;
};

// Mock useAvailableTimeSlots
let mockAvailableSlots: CalendarAvailableTimeslots = generateAvailableTimeslots(7, new Date());

jest.mock("@calcom/features/bookings/Booker/components/hooks/useAvailableTimeSlots", () => ({
  useAvailableTimeSlots: () => mockAvailableSlots,
}));

/**
 * LargeCalendar displays a weekly calendar view with busy times, available slots,
 * and date overrides for troubleshooting availability issues.
 *
 * This component:
 * - Shows busy events from connected calendars
 * - Displays available time slots for booking
 * - Highlights date overrides and working hours
 * - Supports multiple days view (configurable via extraDays prop)
 * - Color-codes events by calendar source
 */
const meta = {
  component: LargeCalendar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    extraDays: {
      description: "Number of days to display in the calendar view",
      control: { type: "number", min: 1, max: 30 },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[800px] w-[1200px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LargeCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default 7-day calendar view showing busy events and available slots
 */
export const Default: Story = {
  args: {
    extraDays: 7,
  },
};

/**
 * Single day view - useful for detailed day analysis
 */
export const SingleDay: Story = {
  args: {
    extraDays: 1,
  },
  decorators: [
    (Story) => (
      <div className="h-[800px] w-[600px]">
        <Story />
      </div>
    ),
  ],
};

/**
 * Three-day view - compact view for shorter time range
 */
export const ThreeDays: Story = {
  args: {
    extraDays: 3,
  },
  decorators: [
    (Story) => (
      <div className="h-[800px] w-[900px]">
        <Story />
      </div>
    ),
  ],
};

/**
 * Two-week view - extended view for longer range planning
 */
export const TwoWeeks: Story = {
  args: {
    extraDays: 14,
  },
  decorators: [
    (Story) => (
      <div className="h-[800px] w-full max-w-[1600px]">
        <Story />
      </div>
    ),
  ],
};

/**
 * Full month view (30 days)
 */
export const FullMonth: Story = {
  args: {
    extraDays: 30,
  },
  decorators: [
    (Story) => (
      <div className="h-[800px] w-full max-w-[2000px]">
        <Story />
      </div>
    ),
  ],
};

/**
 * Calendar with no busy events - shows only available slots
 */
export const NoBusyEvents: Story = {
  args: {
    extraDays: 7,
  },
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.availability.user",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: {
              busy: [],
              dateOverrides: [],
              workingHours: [
                {
                  days: [0, 1, 2, 3, 4, 5, 6],
                  startTime: 540,
                  endTime: 1020,
                },
              ],
            },
          },
        },
      },
    ],
  },
};

/**
 * Heavily booked calendar - many busy time slots
 */
export const HeavilyBooked: Story = {
  args: {
    extraDays: 7,
  },
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.availability.user",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: {
              busy: [
                ...mockBusyEvents,
                {
                  title: "Morning Sync",
                  start: dayjs().hour(8).minute(0).toISOString(),
                  end: dayjs().hour(8).minute(30).toISOString(),
                  source: "calendar-1",
                },
                {
                  title: "Lunch Meeting",
                  start: dayjs().hour(12).minute(0).toISOString(),
                  end: dayjs().hour(13).minute(0).toISOString(),
                  source: "calendar-2",
                },
                {
                  title: "Planning Session",
                  start: dayjs().hour(16).minute(0).toISOString(),
                  end: dayjs().hour(17).minute(30).toISOString(),
                  source: "calendar-3",
                },
                {
                  title: "Weekly Review",
                  start: dayjs().add(2, "day").hour(9).minute(0).toISOString(),
                  end: dayjs().add(2, "day").hour(10).minute(30).toISOString(),
                  source: "calendar-1",
                },
                {
                  title: "Product Demo",
                  start: dayjs().add(2, "day").hour(14).minute(0).toISOString(),
                  end: dayjs().add(2, "day").hour(15).minute(30).toISOString(),
                  source: "calendar-2",
                },
              ],
              dateOverrides: [],
              workingHours: [
                {
                  days: [0, 1, 2, 3, 4, 5, 6],
                  startTime: 540,
                  endTime: 1020,
                },
              ],
            },
          },
        },
      },
    ],
  },
};

/**
 * Calendar with limited working hours (10 AM - 2 PM only)
 */
export const LimitedWorkingHours: Story = {
  args: {
    extraDays: 7,
  },
  decorators: [
    (Story) => {
      // Mock limited availability slots
      mockAvailableSlots = (() => {
        const slots: CalendarAvailableTimeslots = {};
        const startDate = new Date();

        for (let i = 0; i < 7; i++) {
          const date = dayjs(startDate).add(i, "day");
          const dateKey = date.format("YYYY-MM-DD");
          const limitedSlots = [];

          // Only 10 AM - 2 PM
          for (let hour = 10; hour < 14; hour++) {
            limitedSlots.push({
              start: date.hour(hour).minute(0).toDate(),
              end: date.hour(hour).minute(30).toDate(),
            });
            limitedSlots.push({
              start: date.hour(hour).minute(30).toDate(),
              end: date.hour(hour + 1).minute(0).toDate(),
            });
          }

          slots[dateKey] = limitedSlots;
        }

        return slots;
      })();

      return (
        <div className="h-[800px] w-[1200px]">
          <Story />
        </div>
      );
    },
  ],
};

/**
 * Weekdays only availability (Monday - Friday)
 */
export const WeekdaysOnly: Story = {
  args: {
    extraDays: 7,
  },
  decorators: [
    (Story) => {
      mockAvailableSlots = (() => {
        const slots: CalendarAvailableTimeslots = {};
        const startDate = new Date();

        for (let i = 0; i < 7; i++) {
          const date = dayjs(startDate).add(i, "day");
          const dayOfWeek = date.day();

          // Only weekdays (1-5, Mon-Fri)
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const dateKey = date.format("YYYY-MM-DD");
            const weekdaySlots = [];

            for (let hour = 9; hour < 17; hour++) {
              weekdaySlots.push({
                start: date.hour(hour).minute(0).toDate(),
                end: date.hour(hour).minute(30).toDate(),
              });
              weekdaySlots.push({
                start: date.hour(hour).minute(30).toDate(),
                end: date.hour(hour + 1).minute(0).toDate(),
              });
            }

            slots[dateKey] = weekdaySlots;
          }
        }

        return slots;
      })();

      return (
        <div className="h-[800px] w-[1200px]">
          <Story />
        </div>
      );
    },
  ],
};

/**
 * Calendar with date overrides
 */
export const WithDateOverrides: Story = {
  args: {
    extraDays: 7,
  },
  parameters: {
    mockData: [
      {
        url: "/api/trpc/viewer.availability.user",
        method: "GET",
        status: 200,
        response: {
          result: {
            data: {
              busy: mockBusyEvents,
              dateOverrides: [
                {
                  start: dayjs().add(3, "day").toISOString(),
                  end: dayjs().add(3, "day").toISOString(),
                },
              ],
              workingHours: [
                {
                  days: [0, 1, 2, 3, 4, 5, 6],
                  startTime: 540,
                  endTime: 1020,
                },
              ],
            },
          },
        },
      },
    ],
  },
};

/**
 * Early morning availability (6 AM - 12 PM)
 */
export const EarlyMorning: Story = {
  args: {
    extraDays: 7,
  },
  decorators: [
    (Story) => {
      mockAvailableSlots = (() => {
        const slots: CalendarAvailableTimeslots = {};
        const startDate = new Date();

        for (let i = 0; i < 7; i++) {
          const date = dayjs(startDate).add(i, "day");
          const dateKey = date.format("YYYY-MM-DD");
          const morningSlots = [];

          for (let hour = 6; hour < 12; hour++) {
            morningSlots.push({
              start: date.hour(hour).minute(0).toDate(),
              end: date.hour(hour).minute(30).toDate(),
            });
            morningSlots.push({
              start: date.hour(hour).minute(30).toDate(),
              end: date.hour(hour + 1).minute(0).toDate(),
            });
          }

          slots[dateKey] = morningSlots;
        }

        return slots;
      })();

      return (
        <div className="h-[800px] w-[1200px]">
          <Story />
        </div>
      );
    },
  ],
};

/**
 * Evening availability (2 PM - 10 PM)
 */
export const Evening: Story = {
  args: {
    extraDays: 7,
  },
  decorators: [
    (Story) => {
      mockAvailableSlots = (() => {
        const slots: CalendarAvailableTimeslots = {};
        const startDate = new Date();

        for (let i = 0; i < 7; i++) {
          const date = dayjs(startDate).add(i, "day");
          const dateKey = date.format("YYYY-MM-DD");
          const eveningSlots = [];

          for (let hour = 14; hour < 22; hour++) {
            eveningSlots.push({
              start: date.hour(hour).minute(0).toDate(),
              end: date.hour(hour).minute(30).toDate(),
            });
            eveningSlots.push({
              start: date.hour(hour).minute(30).toDate(),
              end: date.hour(hour + 1).minute(0).toDate(),
            });
          }

          slots[dateKey] = eveningSlots;
        }

        return slots;
      })();

      return (
        <div className="h-[800px] w-[1200px]">
          <Story />
        </div>
      );
    },
  ],
};

/**
 * Comparison view showing multiple calendar scenarios
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="text-sm font-semibold mb-4">Default - 7 Days</h3>
        <div className="h-[600px] w-full border rounded-lg overflow-hidden">
          <LargeCalendar extraDays={7} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Single Day View</h3>
        <div className="h-[600px] w-full border rounded-lg overflow-hidden">
          <LargeCalendar extraDays={1} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Two Week View</h3>
        <div className="h-[600px] w-full border rounded-lg overflow-hidden">
          <LargeCalendar extraDays={14} />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "fullscreen",
  },
  decorators: [],
};
