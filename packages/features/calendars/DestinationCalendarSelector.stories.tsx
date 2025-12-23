import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import type { RouterOutputs } from "@calcom/trpc/react";

import DestinationCalendarSelector from "./DestinationCalendarSelector";

// Mock useLocale hook
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        create_events_on: "Create events on",
        you_can_override_calendar_in_advanced_tab: "You can override this setting on a per-event basis.",
      };
      return translations[key] || key;
    },
  }),
}));

const meta = {
  component: DestinationCalendarSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "600px" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onChange: {
      description: "Callback when calendar selection changes",
      action: "changed",
    },
    isPending: {
      description: "Loading state",
      control: "boolean",
    },
    hidePlaceholder: {
      description: "Hide the placeholder text",
      control: "boolean",
    },
    hideAdvancedText: {
      description: "Hide the advanced settings hint text",
      control: "boolean",
    },
    value: {
      description: "External ID of the selected calendar",
      control: "text",
    },
    maxWidth: {
      description: "Maximum width of the select control",
      control: "number",
    },
  },
  args: {
    onChange: fn(),
  },
} satisfies Meta<typeof DestinationCalendarSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock calendar data
const mockGoogleCalendars: RouterOutputs["viewer"]["calendars"]["connectedCalendars"] = {
  connectedCalendars: [
    {
      credentialId: 1,
      integration: {
        type: "google_calendar",
        title: "Google Calendar",
        slug: "google-calendar",
      },
      primary: {
        name: "john@example.com",
        email: "john@example.com",
        integration: "google_calendar",
        externalId: "john@example.com",
        readOnly: false,
        credentialId: 1,
        isSelected: true,
      },
      calendars: [
        {
          externalId: "primary",
          integration: "google_calendar",
          name: "Personal",
          readOnly: false,
          email: "john@example.com",
          isSelected: true,
          credentialId: 1,
        },
        {
          externalId: "work-calendar-id",
          integration: "google_calendar",
          name: "Work",
          readOnly: false,
          email: "john@example.com",
          isSelected: false,
          credentialId: 1,
        },
        {
          externalId: "meetings-calendar-id",
          integration: "google_calendar",
          name: "Meetings",
          readOnly: false,
          email: "john@example.com",
          isSelected: false,
          credentialId: 1,
        },
      ],
    },
  ],
  destinationCalendar: {
    id: 1,
    integration: "google_calendar",
    externalId: "primary",
    userId: 1,
    eventTypeId: null,
    credentialId: 1,
    name: "Personal",
    integrationTitle: "Google Calendar",
    primaryEmail: "john@example.com",
  },
};

const mockMultipleProviders: RouterOutputs["viewer"]["calendars"]["connectedCalendars"] = {
  connectedCalendars: [
    {
      credentialId: 1,
      integration: {
        type: "google_calendar",
        title: "Google Calendar",
        slug: "google-calendar",
      },
      primary: {
        name: "john@example.com",
        email: "john@example.com",
        integration: "google_calendar",
        externalId: "john@example.com",
        readOnly: false,
        credentialId: 1,
        isSelected: true,
      },
      calendars: [
        {
          externalId: "google-primary",
          integration: "google_calendar",
          name: "Personal",
          readOnly: false,
          email: "john@example.com",
          isSelected: true,
          credentialId: 1,
        },
        {
          externalId: "google-work",
          integration: "google_calendar",
          name: "Work Calendar",
          readOnly: false,
          email: "john@example.com",
          isSelected: false,
          credentialId: 1,
        },
      ],
    },
    {
      credentialId: 2,
      integration: {
        type: "office365_calendar",
        title: "Office 365 Calendar",
        slug: "office365-calendar",
      },
      primary: {
        name: "john@company.com",
        email: "john@company.com",
        integration: "office365_calendar",
        externalId: "john@company.com",
        readOnly: false,
        credentialId: 2,
        isSelected: false,
      },
      calendars: [
        {
          externalId: "office365-primary",
          integration: "office365_calendar",
          name: "Calendar",
          readOnly: false,
          email: "john@company.com",
          isSelected: false,
          credentialId: 2,
        },
        {
          externalId: "office365-team",
          integration: "office365_calendar",
          name: "Team Events",
          readOnly: false,
          email: "john@company.com",
          isSelected: false,
          credentialId: 2,
        },
      ],
    },
    {
      credentialId: 3,
      integration: {
        type: "apple_calendar",
        title: "Apple Calendar",
        slug: "apple-calendar",
      },
      primary: {
        name: "iCloud",
        email: "john@icloud.com",
        integration: "apple_calendar",
        externalId: "https://caldav.icloud.com/12345",
        readOnly: false,
        credentialId: 3,
        isSelected: false,
      },
      calendars: [
        {
          externalId: "https://caldav.icloud.com/12345/calendars/home",
          integration: "apple_calendar",
          name: "Home",
          readOnly: false,
          email: "john@icloud.com",
          isSelected: false,
          credentialId: 3,
        },
      ],
    },
  ],
  destinationCalendar: {
    id: 1,
    integration: "google_calendar",
    externalId: "google-primary",
    userId: 1,
    eventTypeId: null,
    credentialId: 1,
    name: "Personal",
    integrationTitle: "Google Calendar",
    primaryEmail: "john@example.com",
  },
};

export const Default: Story = {
  args: {
    calendarsQueryData: mockGoogleCalendars,
    value: "primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const WithSelectedCalendar: Story = {
  args: {
    calendarsQueryData: mockGoogleCalendars,
    value: "work-calendar-id",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const Loading: Story = {
  args: {
    calendarsQueryData: mockGoogleCalendars,
    value: "primary",
    isPending: true,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const HiddenPlaceholder: Story = {
  args: {
    calendarsQueryData: mockGoogleCalendars,
    value: undefined,
    isPending: false,
    hidePlaceholder: true,
    hideAdvancedText: false,
  },
};

export const HiddenAdvancedText: Story = {
  args: {
    calendarsQueryData: mockGoogleCalendars,
    value: "primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: true,
  },
};

export const MultipleProviders: Story = {
  args: {
    calendarsQueryData: mockMultipleProviders,
    value: "google-primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const WithMaxWidth: Story = {
  args: {
    calendarsQueryData: mockGoogleCalendars,
    value: "primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
    maxWidth: 400,
  },
};

export const NoCalendars: Story = {
  args: {
    calendarsQueryData: {
      connectedCalendars: [],
      destinationCalendar: null,
    },
    value: undefined,
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const SingleCalendar: Story = {
  args: {
    calendarsQueryData: {
      connectedCalendars: [
        {
          credentialId: 1,
          integration: {
            type: "google_calendar",
            title: "Google Calendar",
            slug: "google-calendar",
          },
          primary: {
            name: "john@example.com",
            email: "john@example.com",
            integration: "google_calendar",
            externalId: "john@example.com",
            readOnly: false,
            credentialId: 1,
            isSelected: true,
          },
          calendars: [
            {
              externalId: "primary",
              integration: "google_calendar",
              name: "Personal",
              readOnly: false,
              email: "john@example.com",
              isSelected: true,
              credentialId: 1,
            },
          ],
        },
      ],
      destinationCalendar: {
        id: 1,
        integration: "google_calendar",
        externalId: "primary",
        userId: 1,
        eventTypeId: null,
        credentialId: 1,
        name: "Personal",
        integrationTitle: "Google Calendar",
        primaryEmail: "john@example.com",
      },
    },
    value: "primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const Office365Calendar: Story = {
  args: {
    calendarsQueryData: {
      connectedCalendars: [
        {
          credentialId: 2,
          integration: {
            type: "office365_calendar",
            title: "Office 365 Calendar",
            slug: "office365-calendar",
          },
          primary: {
            name: "john@company.com",
            email: "john@company.com",
            integration: "office365_calendar",
            externalId: "john@company.com",
            readOnly: false,
            credentialId: 2,
            isSelected: true,
          },
          calendars: [
            {
              externalId: "office365-primary",
              integration: "office365_calendar",
              name: "Calendar",
              readOnly: false,
              email: "john@company.com",
              isSelected: true,
              credentialId: 2,
            },
            {
              externalId: "office365-team",
              integration: "office365_calendar",
              name: "Team Events",
              readOnly: false,
              email: "john@company.com",
              isSelected: false,
              credentialId: 2,
            },
          ],
        },
      ],
      destinationCalendar: {
        id: 2,
        integration: "office365_calendar",
        externalId: "office365-primary",
        userId: 1,
        eventTypeId: null,
        credentialId: 2,
        name: "Calendar",
        integrationTitle: "Office 365 Calendar",
        primaryEmail: "john@company.com",
      },
    },
    value: "office365-primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const AppleCalendar: Story = {
  args: {
    calendarsQueryData: {
      connectedCalendars: [
        {
          credentialId: 3,
          integration: {
            type: "apple_calendar",
            title: "Apple Calendar",
            slug: "apple-calendar",
          },
          primary: {
            name: "iCloud",
            email: "john@icloud.com",
            integration: "apple_calendar",
            externalId: "https://caldav.icloud.com/12345",
            readOnly: false,
            credentialId: 3,
            isSelected: true,
          },
          calendars: [
            {
              externalId: "https://caldav.icloud.com/12345/calendars/home",
              integration: "apple_calendar",
              name: "Home",
              readOnly: false,
              email: "john@icloud.com",
              isSelected: true,
              credentialId: 3,
            },
            {
              externalId: "https://caldav.icloud.com/12345/calendars/work",
              integration: "apple_calendar",
              name: "Work",
              readOnly: false,
              email: "john@icloud.com",
              isSelected: false,
              credentialId: 3,
            },
          ],
        },
      ],
      destinationCalendar: {
        id: 3,
        integration: "apple_calendar",
        externalId: "https://caldav.icloud.com/12345/calendars/home",
        userId: 1,
        eventTypeId: null,
        credentialId: 3,
        name: "Home",
        integrationTitle: "Apple Calendar",
        primaryEmail: "john@icloud.com",
      },
    },
    value: "https://caldav.icloud.com/12345/calendars/home",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};

export const ManyCalendars: Story = {
  args: {
    calendarsQueryData: {
      connectedCalendars: [
        {
          credentialId: 1,
          integration: {
            type: "google_calendar",
            title: "Google Calendar",
            slug: "google-calendar",
          },
          primary: {
            name: "john@example.com",
            email: "john@example.com",
            integration: "google_calendar",
            externalId: "john@example.com",
            readOnly: false,
            credentialId: 1,
            isSelected: true,
          },
          calendars: [
            {
              externalId: "primary",
              integration: "google_calendar",
              name: "Personal",
              readOnly: false,
              email: "john@example.com",
              isSelected: true,
              credentialId: 1,
            },
            {
              externalId: "work-id",
              integration: "google_calendar",
              name: "Work",
              readOnly: false,
              email: "john@example.com",
              isSelected: false,
              credentialId: 1,
            },
            {
              externalId: "meetings-id",
              integration: "google_calendar",
              name: "Meetings",
              readOnly: false,
              email: "john@example.com",
              isSelected: false,
              credentialId: 1,
            },
            {
              externalId: "projects-id",
              integration: "google_calendar",
              name: "Projects",
              readOnly: false,
              email: "john@example.com",
              isSelected: false,
              credentialId: 1,
            },
            {
              externalId: "family-id",
              integration: "google_calendar",
              name: "Family",
              readOnly: false,
              email: "john@example.com",
              isSelected: false,
              credentialId: 1,
            },
          ],
        },
      ],
      destinationCalendar: {
        id: 1,
        integration: "google_calendar",
        externalId: "primary",
        userId: 1,
        eventTypeId: null,
        credentialId: 1,
        name: "Personal",
        integrationTitle: "Google Calendar",
        primaryEmail: "john@example.com",
      },
    },
    value: "primary",
    isPending: false,
    hidePlaceholder: false,
    hideAdvancedText: false,
  },
};
