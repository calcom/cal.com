import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { AppFrontendPayload as App } from "@calcom/types/App";

import { AppCard } from "./AppCard";

const meta = {
  component: AppCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    app: {
      description: "The app configuration object",
      control: { type: "object" },
    },
    credentials: {
      description: "Array of credentials for the app",
      control: { type: "object" },
    },
    searchText: {
      description: "Text to highlight in the app name",
      control: { type: "text" },
    },
    userAdminTeams: {
      description: "Teams where user is admin",
      control: { type: "object" },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock app data
const createMockApp = (overrides?: Partial<App>): App => ({
  name: "Zoom",
  slug: "zoom",
  type: "zoom_video",
  variant: "conferencing",
  logo: "https://cal.com/integrations/zoom.svg",
  description: "Video conferencing app that allows you to meet with others via video and audio.",
  publisher: "Zoom Video Communications",
  url: "https://zoom.us",
  email: "support@zoom.us",
  categories: ["video"],
  ...overrides,
});

export const Default: Story = {
  args: {
    app: createMockApp(),
    credentials: [],
  },
};

export const WithLongDescription: Story = {
  args: {
    app: createMockApp({
      name: "Google Calendar",
      slug: "google-calendar",
      type: "google_calendar",
      variant: "calendar",
      logo: "https://cal.com/integrations/google-calendar.svg",
      description:
        "Google Calendar is a time-management and scheduling calendar service developed by Google. It allows users to create and edit events, with event times and details being automatically synchronized across all devices. This integration helps prevent double bookings by checking your availability across multiple calendars.",
      categories: ["calendar"],
    }),
    credentials: [],
  },
};

export const InstalledApp: Story = {
  args: {
    app: createMockApp({
      name: "Stripe",
      slug: "stripe",
      type: "stripe_payment",
      variant: "payment",
      logo: "https://cal.com/integrations/stripe.svg",
      description: "Accept online payments securely with Stripe integration.",
      categories: ["payment"],
    }),
    credentials: [
      {
        id: 1,
        type: "stripe_payment",
        key: {},
        userId: 1,
        teamId: null,
        appId: "stripe",
        invalid: false,
        subscriptionId: null,
        paymentStatus: null,
        billingCycleStart: null,
      },
    ],
  },
};

export const MultipleInstallations: Story = {
  args: {
    app: createMockApp({
      name: "Google Calendar",
      slug: "google-calendar",
      type: "google_calendar",
      variant: "calendar",
      logo: "https://cal.com/integrations/google-calendar.svg",
      description: "Sync your Google Calendar to prevent double bookings.",
      categories: ["calendar"],
    }),
    credentials: [
      {
        id: 1,
        type: "google_calendar",
        key: {},
        userId: 1,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        subscriptionId: null,
        paymentStatus: null,
        billingCycleStart: null,
      },
      {
        id: 2,
        type: "google_calendar",
        key: {},
        userId: 1,
        teamId: null,
        appId: "google-calendar",
        invalid: false,
        subscriptionId: null,
        paymentStatus: null,
        billingCycleStart: null,
      },
    ],
  },
};

export const GlobalApp: Story = {
  args: {
    app: createMockApp({
      name: "Cal Video",
      slug: "cal-video",
      type: "cal_video",
      variant: "conferencing",
      logo: "https://cal.com/api/app-store/cal-video/icon.svg",
      description: "Cal.com's own video conferencing solution, built-in and ready to use.",
      categories: ["video"],
      isGlobal: true,
    }),
  },
};

export const DefaultApp: Story = {
  args: {
    app: createMockApp({
      name: "Cal Video",
      slug: "cal-video",
      type: "cal_video",
      variant: "conferencing",
      logo: "https://cal.com/api/app-store/cal-video/icon.svg",
      description: "Cal.com's own video conferencing solution.",
      categories: ["video"],
      isDefault: true,
    }),
    credentials: [],
  },
};

export const TemplateApp: Story = {
  args: {
    app: createMockApp({
      name: "Custom App Template",
      slug: "custom-app-template",
      type: "custom_other",
      variant: "other",
      logo: "https://cal.com/api/app-store/_example/icon.svg",
      description: "A template for creating custom apps with Cal.com.",
      categories: ["other"],
      isTemplate: true,
    }),
    credentials: [],
  },
};

export const PaidApp: Story = {
  args: {
    app: createMockApp({
      name: "Cal.ai",
      slug: "cal-ai",
      type: "cal-ai_automation",
      variant: "automation",
      logo: "https://cal.com/api/app-store/cal-ai/icon.svg",
      description: "AI-powered scheduling assistant that helps you manage your calendar intelligently.",
      categories: ["automation"],
      paid: {
        priceInUsd: 29,
        priceId: "price_123",
        mode: "subscription",
      },
    }),
    credentials: [],
  },
};

export const PaidAppWithTrial: Story = {
  args: {
    app: createMockApp({
      name: "Cal.ai",
      slug: "cal-ai",
      type: "cal-ai_automation",
      variant: "automation",
      logo: "https://cal.com/api/app-store/cal-ai/icon.svg",
      description: "AI-powered scheduling assistant with a 14-day free trial.",
      categories: ["automation"],
      paid: {
        priceInUsd: 29,
        priceId: "price_123",
        trial: 14,
        mode: "subscription",
      },
    }),
    credentials: [],
  },
};

export const WithSearchHighlight: Story = {
  args: {
    app: createMockApp({
      name: "Zoom Video",
      slug: "zoom",
      description: "Video conferencing made easy.",
    }),
    searchText: "Video",
    credentials: [],
  },
};

export const TeamsPlanRequired: Story = {
  args: {
    app: createMockApp({
      name: "Advanced Features",
      slug: "advanced-features",
      type: "advanced_other",
      variant: "other",
      logo: "https://cal.com/api/app-store/_example/icon.svg",
      description: "Premium features that require a teams plan subscription.",
      categories: ["other"],
      teamsPlanRequired: {
        upgradeUrl: "https://cal.com/upgrade",
      },
    }),
    credentials: [],
  },
};

export const ConferencingApp: Story = {
  args: {
    app: createMockApp({
      name: "Microsoft Teams",
      slug: "msteams",
      type: "msteams_video",
      variant: "conferencing",
      logo: "https://cal.com/integrations/msteams.svg",
      description: "Connect your Microsoft Teams account to use it for video meetings.",
      categories: ["video"],
      concurrentMeetings: true,
    }),
    credentials: [],
  },
};

export const CRMApp: Story = {
  args: {
    app: createMockApp({
      name: "HubSpot",
      slug: "hubspot",
      type: "hubspot_crm",
      variant: "crm",
      logo: "https://cal.com/api/app-store/hubspot/icon.svg",
      description: "Sync your contacts and meetings with HubSpot CRM automatically.",
      categories: ["crm"],
    }),
    credentials: [],
  },
};

export const AutomationApp: Story = {
  args: {
    app: createMockApp({
      name: "Zapier",
      slug: "zapier",
      type: "zapier_automation",
      variant: "automation",
      logo: "https://cal.com/api/app-store/zapier/icon.svg",
      description: "Connect Cal.com with 5000+ apps to automate your workflows.",
      categories: ["automation"],
    }),
    credentials: [],
  },
};

export const AnalyticsApp: Story = {
  args: {
    app: createMockApp({
      name: "Google Analytics",
      slug: "ga4",
      type: "ga4_analytics",
      variant: "other",
      logo: "https://cal.com/api/app-store/ga4/icon.svg",
      description: "Track booking events and user behavior with Google Analytics 4.",
      categories: ["analytics"],
    }),
    credentials: [],
  },
};

export const WithDependencies: Story = {
  args: {
    app: createMockApp({
      name: "Dependent App",
      slug: "dependent-app",
      type: "dependent_other",
      variant: "other",
      logo: "https://cal.com/api/app-store/_example/icon.svg",
      description: "This app requires another app to be installed first.",
      categories: ["other"],
      dependencies: ["google-calendar"],
      dependencyData: [
        {
          name: "Google Calendar",
          installed: false,
        },
      ],
    }),
    credentials: [],
  },
};

export const DarkLogoApp: Story = {
  args: {
    app: createMockApp({
      name: "GitHub",
      slug: "github",
      type: "github_other",
      variant: "other",
      logo: "https://cal.com/api/app-store/_example/icon-dark.svg",
      description: "Integrate with GitHub for developer workflows.",
      categories: ["other"],
    }),
    credentials: [],
  },
  parameters: {
    backgrounds: {
      default: "dark",
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-8 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Not Installed</h3>
        <div className="w-80">
          <AppCard app={createMockApp()} credentials={[]} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Installed</h3>
        <div className="w-80">
          <AppCard
            app={createMockApp()}
            credentials={[
              {
                id: 1,
                type: "zoom_video",
                key: {},
                userId: 1,
                teamId: null,
                appId: "zoom",
                invalid: false,
                subscriptionId: null,
                paymentStatus: null,
                billingCycleStart: null,
              },
            ]}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Default App</h3>
        <div className="w-80">
          <AppCard
            app={createMockApp({
              isDefault: true,
            })}
            credentials={[]}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Template App</h3>
        <div className="w-80">
          <AppCard
            app={createMockApp({
              isTemplate: true,
            })}
            credentials={[]}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Paid App</h3>
        <div className="w-80">
          <AppCard
            app={createMockApp({
              paid: {
                priceInUsd: 29,
                priceId: "price_123",
                mode: "subscription",
              },
            })}
            credentials={[]}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">With Search Highlight</h3>
        <div className="w-80">
          <AppCard app={createMockApp({ name: "Zoom Video" })} searchText="Video" credentials={[]} />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
  decorators: [],
};
