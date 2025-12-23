import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { AppFrontendPayload as App } from "@calcom/types/App";

import { AllApps } from "./AllApps";

const mockApps: (App & { credentials?: any[] })[] = [
  {
    name: "Google Calendar",
    slug: "google-calendar",
    type: "google_calendar",
    logo: "https://cal.com/api/app-store/googlecalendar/icon.svg",
    description: "Connect your Google Calendar to automatically check for busy times and add new events.",
    categories: ["calendar"],
    variant: "calendar",
    publisher: "Cal.com",
    url: "https://www.google.com/calendar",
    email: "support@cal.com",
    verified: true,
    trending: true,
    rating: 5,
    reviews: 1250,
    feeType: "free",
    price: 0,
  },
  {
    name: "Zoom",
    slug: "zoom",
    type: "zoom_video",
    logo: "https://cal.com/api/app-store/zoomvideo/icon.svg",
    description: "Video conferencing with Zoom. Automatically create Zoom meetings for your bookings.",
    categories: ["conferencing"],
    variant: "conferencing",
    publisher: "Cal.com",
    url: "https://zoom.us",
    email: "support@cal.com",
    verified: true,
    trending: true,
    rating: 4.8,
    reviews: 980,
    feeType: "free",
    price: 0,
  },
  {
    name: "Stripe",
    slug: "stripe",
    type: "stripe_payment",
    logo: "https://cal.com/api/app-store/stripepayment/icon.svg",
    description: "Collect payments for your bookings using Stripe. Accept credit cards and more.",
    categories: ["payment"],
    variant: "payment",
    publisher: "Cal.com",
    url: "https://stripe.com",
    email: "support@cal.com",
    verified: true,
    rating: 4.9,
    reviews: 750,
    feeType: "usage-based",
    price: 0.5,
    commission: 0.5,
  },
  {
    name: "Salesforce",
    slug: "salesforce",
    type: "salesforce_crm",
    logo: "https://cal.com/api/app-store/salesforce/icon.svg",
    description: "Sync your bookings with Salesforce CRM. Automatically create contacts and opportunities.",
    categories: ["crm"],
    variant: "crm",
    publisher: "Cal.com",
    url: "https://www.salesforce.com",
    email: "support@cal.com",
    verified: true,
    rating: 4.7,
    reviews: 420,
    feeType: "free",
    price: 0,
  },
  {
    name: "HubSpot",
    slug: "hubspot",
    type: "hubspot_crm",
    logo: "https://cal.com/api/app-store/hubspot/icon.svg",
    description: "Connect HubSpot CRM to track meetings and contacts automatically.",
    categories: ["crm"],
    variant: "crm",
    publisher: "Cal.com",
    url: "https://www.hubspot.com",
    email: "support@cal.com",
    verified: true,
    trending: true,
    rating: 4.6,
    reviews: 530,
    feeType: "free",
    price: 0,
  },
  {
    name: "Google Meet",
    slug: "google-meet",
    type: "google_video",
    logo: "https://cal.com/api/app-store/googlevideo/icon.svg",
    description: "Video conferencing with Google Meet. Free and integrated with Google Calendar.",
    categories: ["conferencing"],
    variant: "conferencing",
    publisher: "Cal.com",
    url: "https://meet.google.com",
    email: "support@cal.com",
    verified: true,
    rating: 4.5,
    reviews: 890,
    feeType: "free",
    price: 0,
  },
  {
    name: "Microsoft Teams",
    slug: "msteams",
    type: "msteams_video",
    logo: "https://cal.com/api/app-store/msteams/icon.svg",
    description: "Video conferencing with Microsoft Teams. Integrated with Office 365.",
    categories: ["conferencing"],
    variant: "conferencing",
    publisher: "Cal.com",
    url: "https://www.microsoft.com/microsoft-teams",
    email: "support@cal.com",
    verified: true,
    rating: 4.4,
    reviews: 670,
    feeType: "free",
    price: 0,
  },
  {
    name: "Zapier",
    slug: "zapier",
    type: "zapier_automation",
    logo: "https://cal.com/api/app-store/zapier/icon.svg",
    description: "Connect Cal.com with 5000+ apps. Automate your workflow with Zapier.",
    categories: ["automation"],
    variant: "automation",
    publisher: "Cal.com",
    url: "https://zapier.com",
    email: "support@cal.com",
    verified: true,
    trending: true,
    rating: 4.8,
    reviews: 1120,
    feeType: "free",
    price: 0,
  },
];

const meta = {
  component: AllApps,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[1200px] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AllApps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    apps: mockApps,
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
  },
};

export const WithSearchText: Story = {
  args: {
    apps: mockApps,
    searchText: "zoom",
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
  },
};

export const SingleCategory: Story = {
  args: {
    apps: mockApps.filter((app) => app.categories.includes("conferencing")),
    categories: ["conferencing"],
  },
};

export const WithInstalledApps: Story = {
  args: {
    apps: mockApps.map((app, index) => ({
      ...app,
      credentials: index % 2 === 0 ? [{ id: 1, type: app.type }] : undefined,
    })),
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
  },
};

export const EmptyState: Story = {
  args: {
    apps: [],
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
  },
};

export const EmptySearchResults: Story = {
  args: {
    apps: mockApps,
    searchText: "nonexistent app",
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
  },
};

export const FewApps: Story = {
  args: {
    apps: mockApps.slice(0, 3),
    categories: ["calendar", "conferencing", "payment"],
  },
};

export const ManyCategoriesWithScroll: Story = {
  args: {
    apps: mockApps,
    categories: [
      "calendar",
      "conferencing",
      "payment",
      "crm",
      "automation",
      "analytics",
      "messaging",
      "other",
      "video",
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-[800px] p-8">
        <Story />
      </div>
    ),
  ],
};

export const WithUserAdminTeams: Story = {
  args: {
    apps: mockApps.map((app) => ({
      ...app,
      credentials: [{ id: 1, type: app.type, teamId: 1 }],
    })),
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
    userAdminTeams: [
      { id: 1, name: "Engineering Team", isOrganization: false },
      { id: 2, name: "Sales Team", isOrganization: false },
    ],
  },
};

export const CalendarAppsOnly: Story = {
  args: {
    apps: mockApps.filter((app) => app.categories.includes("calendar")),
    categories: ["calendar"],
  },
};

export const ConferencingAppsOnly: Story = {
  args: {
    apps: mockApps.filter((app) => app.categories.includes("conferencing")),
    categories: ["conferencing"],
  },
};

export const CRMAppsOnly: Story = {
  args: {
    apps: mockApps.filter((app) => app.categories.includes("crm")),
    categories: ["crm"],
  },
};

export const LargeDataset: Story = {
  args: {
    apps: [
      ...mockApps,
      ...mockApps.map((app) => ({
        ...app,
        name: `${app.name} Alternative`,
        slug: `${app.slug}-alt`,
      })),
      ...mockApps.map((app) => ({
        ...app,
        name: `${app.name} Pro`,
        slug: `${app.slug}-pro`,
      })),
    ],
    categories: ["calendar", "conferencing", "payment", "crm", "automation"],
  },
};
