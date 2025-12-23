import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { fn } from "storybook/test";

import { CalendarSwitch, UserCalendarSwitch, EventCalendarSwitch } from "./CalendarSwitch";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock tRPC client
const mockTrpc = createTRPCReact<any>();

const mockTrpcClient = mockTrpc.createClient({
  links: [
    () =>
      ({ op }) => {
        return {
          subscribe: (observer: any) => {
            observer.next({
              result: {
                data: {},
              },
            });
            observer.complete();
            return {
              unsubscribe: () => {},
            };
          },
        } as any;
      },
  ],
});

const meta = {
  component: CalendarSwitch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <mockTrpc.Provider client={mockTrpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <div style={{ width: "400px" }}>
            <Story />
          </div>
        </QueryClientProvider>
      </mockTrpc.Provider>
    ),
  ],
  argTypes: {
    title: {
      description: "Title of the calendar",
      control: "text",
    },
    name: {
      description: "Display name of the calendar",
      control: "text",
    },
    externalId: {
      description: "External ID for the calendar",
      control: "text",
    },
    type: {
      description: "Integration type",
      control: "text",
    },
    isChecked: {
      description: "Whether the calendar is enabled",
      control: "boolean",
    },
    disabled: {
      description: "Whether the switch is disabled",
      control: "boolean",
    },
    destination: {
      description: "Whether this is the destination calendar for adding events",
      control: "boolean",
    },
    credentialId: {
      description: "Credential ID for the calendar integration",
      control: "number",
    },
  },
  args: {
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof CalendarSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Personal Calendar",
    name: "Personal Calendar",
    externalId: "personal-calendar-1",
    type: "google_calendar",
    isChecked: false,
    credentialId: 1,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const Checked: Story = {
  args: {
    title: "Work Calendar",
    name: "Work Calendar",
    externalId: "work-calendar-1",
    type: "google_calendar",
    isChecked: true,
    credentialId: 2,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    title: "Disabled Calendar",
    name: "Disabled Calendar",
    externalId: "disabled-calendar-1",
    type: "google_calendar",
    isChecked: false,
    credentialId: 3,
    delegationId: null,
    eventTypeId: null,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    title: "Always Enabled Calendar",
    name: "Always Enabled Calendar",
    externalId: "always-enabled-1",
    type: "google_calendar",
    isChecked: true,
    credentialId: 4,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: true,
  },
};

export const WithDestination: Story = {
  args: {
    title: "Google Calendar",
    name: "Google Calendar",
    externalId: "google-calendar-1",
    type: "google_calendar",
    isChecked: true,
    destination: true,
    credentialId: 5,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const OutlookCalendar: Story = {
  args: {
    title: "Outlook Calendar",
    name: "Outlook Calendar",
    externalId: "outlook-calendar-1",
    type: "office365_calendar",
    isChecked: true,
    credentialId: 6,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const AppleCalendar: Story = {
  args: {
    title: "Apple Calendar",
    name: "Apple Calendar",
    externalId: "apple-calendar-1",
    type: "apple_calendar",
    isChecked: false,
    credentialId: 7,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const CalDavCalendar: Story = {
  args: {
    title: "CalDAV Calendar",
    name: "CalDAV Calendar",
    externalId: "caldav-calendar-1",
    type: "caldav_calendar",
    isChecked: true,
    destination: true,
    credentialId: 8,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const UserCalendarExample: Story = {
  render: () => (
    <UserCalendarSwitch
      title="User Personal Calendar"
      name="User Personal Calendar"
      externalId="user-calendar-1"
      type="google_calendar"
      isChecked={true}
      credentialId={10}
      delegationCredentialId={null}
      disabled={false}
    />
  ),
};

export const EventCalendarExample: Story = {
  render: () => (
    <EventCalendarSwitch
      title="Event Type Calendar"
      name="Event Type Calendar"
      externalId="event-calendar-1"
      type="google_calendar"
      isChecked={true}
      credentialId={11}
      delegationCredentialId={null}
      eventTypeId={100}
      disabled={false}
    />
  ),
};

export const MultipleCalendars: Story = {
  render: () => (
    <div className="space-y-2">
      <CalendarSwitch
        title="Personal Calendar"
        name="Personal Calendar"
        externalId="multi-cal-1"
        type="google_calendar"
        isChecked={true}
        credentialId={20}
        delegationCredentialId={null}
        eventTypeId={null}
        disabled={false}
      />
      <CalendarSwitch
        title="Work Calendar"
        name="Work Calendar"
        externalId="multi-cal-2"
        type="google_calendar"
        isChecked={true}
        destination={true}
        credentialId={21}
        delegationCredentialId={null}
        eventTypeId={null}
        disabled={false}
      />
      <CalendarSwitch
        title="Team Calendar"
        name="Team Calendar"
        externalId="multi-cal-3"
        type="office365_calendar"
        isChecked={false}
        credentialId={22}
        delegationCredentialId={null}
        eventTypeId={null}
        disabled={false}
      />
      <CalendarSwitch
        title="Shared Calendar"
        name="Shared Calendar"
        externalId="multi-cal-4"
        type="apple_calendar"
        isChecked={false}
        credentialId={23}
        delegationCredentialId={null}
        eventTypeId={null}
        disabled={true}
      />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const LongCalendarName: Story = {
  args: {
    title: "My Very Long Calendar Name That Should Wrap Properly In The UI",
    name: "My Very Long Calendar Name That Should Wrap Properly In The UI",
    externalId: "long-name-calendar-1",
    type: "google_calendar",
    isChecked: true,
    credentialId: 30,
    delegationCredentialId: null,
    eventTypeId: null,
    disabled: false,
  },
};

export const WithDelegationCredential: Story = {
  args: {
    title: "Delegated Calendar",
    name: "Delegated Calendar",
    externalId: "delegated-calendar-1",
    type: "google_calendar",
    isChecked: true,
    credentialId: 40,
    delegationCredentialId: "delegation-cred-123",
    eventTypeId: null,
    disabled: false,
  },
};
