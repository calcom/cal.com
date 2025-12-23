import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SchedulingType } from "@calcom/prisma/enums";

import { EventTypeDescription } from "./EventTypeDescription";

const meta = {
  component: EventTypeDescription,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    shortenDescription: {
      description: "Whether to shorten the description to 4 lines",
      control: "boolean",
    },
    isPublic: {
      description: "Whether this is a public event type",
      control: "boolean",
    },
    className: {
      description: "Additional CSS classes",
      control: "text",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[650px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EventTypeDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseEventType = {
  id: 1,
  title: "30 Minute Meeting",
  slug: "30min",
  length: 30,
  descriptionAsSafeHTML: "A quick 30 minute meeting to discuss your needs and goals.",
  position: 0,
  userId: 1,
  teamId: null,
  eventName: null,
  parentId: null,
  timeZone: null,
  periodType: "UNLIMITED" as const,
  periodStartDate: null,
  periodEndDate: null,
  periodDays: null,
  periodCountCalendarDays: false,
  requiresConfirmation: false,
  recurringEvent: null,
  disableGuests: false,
  hideCalendarNotes: false,
  minimumBookingNotice: 120,
  beforeEventBuffer: 0,
  afterEventBuffer: 0,
  schedulingType: null,
  price: 0,
  currency: "usd",
  slotInterval: null,
  metadata: {},
  successRedirectUrl: null,
  seatsPerTimeSlot: null,
  seatsShowAttendees: null,
  seatsShowAvailabilityCount: null,
  forwardParamsSuccessRedirect: null,
  offsetStart: 0,
  hidden: false,
  locations: null,
};

export const Default: Story = {
  args: {
    eventType: baseEventType,
  },
};

export const WithLongDescription: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: `# Welcome to our consultation

This is a comprehensive meeting where we will:

- Discuss your project requirements in detail
- Review your current setup and challenges
- Provide recommendations and next steps
- Answer any questions you may have

We look forward to speaking with you!`,
    },
  },
};

export const ShortenedDescription: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: `# Welcome to our consultation

This is a comprehensive meeting where we will:

- Discuss your project requirements in detail
- Review your current setup and challenges
- Provide recommendations and next steps
- Answer any questions you may have

We look forward to speaking with you!`,
    },
    shortenDescription: true,
  },
};

export const RoundRobinScheduling: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "Meet with one of our team members in a round-robin fashion.",
      schedulingType: SchedulingType.ROUND_ROBIN,
    },
  },
};

export const CollectiveScheduling: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "Meet with our entire team together.",
      schedulingType: SchedulingType.COLLECTIVE,
    },
  },
};

export const RecurringEvent: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "Weekly check-in meeting that repeats.",
      recurringEvent: {
        freq: 2,
        count: 12,
        interval: 1,
      },
    },
  },
};

export const WithPayment: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "One-on-one coaching session.",
      metadata: {
        apps: {
          stripe: {
            enabled: true,
            price: 5000,
            currency: "usd",
          },
        },
      },
    },
  },
};

export const RequiresConfirmation: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "This meeting requires manual confirmation before being scheduled.",
      requiresConfirmation: true,
    },
  },
};

export const RequiresConfirmationWithThreshold: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "May require confirmation based on availability.",
      requiresConfirmation: true,
      metadata: {
        requiresConfirmationThreshold: {
          time: 30,
          unit: "minutes",
        },
      },
    },
  },
};

export const WithSeats: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "Group event with limited seats available.",
      seatsPerTimeSlot: 10,
    },
  },
};

export const MultipleDurations: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: "Flexible meeting with multiple duration options.",
      metadata: {
        multipleDuration: [15, 30, 60],
      },
    },
  },
};

export const CompleteExample: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: `# Premium Consultation

A comprehensive consultation session with our expert team.

**What you'll get:**
- Personalized recommendations
- Action plan
- Follow-up resources

[Learn more](https://example.com)`,
      schedulingType: SchedulingType.ROUND_ROBIN,
      requiresConfirmation: true,
      recurringEvent: {
        freq: 2,
        count: 4,
        interval: 1,
      },
      metadata: {
        apps: {
          stripe: {
            enabled: true,
            price: 10000,
            currency: "usd",
          },
        },
      },
      seatsPerTimeSlot: 5,
    },
  },
};

export const NoDescription: Story = {
  args: {
    eventType: {
      ...baseEventType,
      descriptionAsSafeHTML: null,
    },
  },
};

export const AllFeatures: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-2">Basic Event</h3>
        <EventTypeDescription eventType={baseEventType} />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Round Robin</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            schedulingType: SchedulingType.ROUND_ROBIN,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Collective</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            schedulingType: SchedulingType.COLLECTIVE,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">With Payment</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            metadata: {
              apps: {
                stripe: {
                  enabled: true,
                  price: 2500,
                  currency: "usd",
                },
              },
            },
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Recurring</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            recurringEvent: {
              freq: 2,
              count: 8,
              interval: 1,
            },
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Requires Confirmation</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            requiresConfirmation: true,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">With Seats</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            seatsPerTimeSlot: 15,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Multiple Durations</h3>
        <EventTypeDescription
          eventType={{
            ...baseEventType,
            metadata: {
              multipleDuration: [15, 30, 45, 60],
            },
          }}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
