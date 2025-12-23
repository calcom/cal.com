import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppPage } from "./AppPage";
import type { AppPageProps } from "./AppPage";

const meta = {
  title: "Components/Apps/AppPage",
  component: AppPage,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", maxWidth: "1200px", padding: "20px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseProps: AppPageProps = {
  name: "Sample App",
  description: "A comprehensive application for managing your calendar and bookings",
  type: "sample_app",
  logo: "https://via.placeholder.com/64",
  slug: "sample-app",
  variant: "calendar",
  body: (
    <div>
      <p>
        This is a sample application that demonstrates the capabilities of our app ecosystem. It
        integrates seamlessly with your calendar and provides advanced scheduling features.
      </p>
      <h3>Features</h3>
      <ul>
        <li>Automatic calendar synchronization</li>
        <li>Smart scheduling suggestions</li>
        <li>Team collaboration tools</li>
        <li>Custom notifications</li>
      </ul>
    </div>
  ),
  categories: ["calendar"],
  author: "Cal.com Team",
  email: "support@cal.com",
  licenseRequired: false,
  teamsPlanRequired: false,
  concurrentMeetings: false,
};

export const Default: Story = {
  args: baseProps,
};

export const WithDescriptionItems: Story = {
  args: {
    ...baseProps,
    name: "Video Conferencing App",
    type: "video_conferencing",
    categories: ["conferencing"],
    descriptionItems: [
      "https://via.placeholder.com/800x600/4A90E2/ffffff?text=Feature+Screenshot+1",
      "https://via.placeholder.com/800x600/50C878/ffffff?text=Feature+Screenshot+2",
      "https://via.placeholder.com/800x600/FF6B6B/ffffff?text=Feature+Screenshot+3",
    ],
  },
};

export const WithIframeDescription: Story = {
  args: {
    ...baseProps,
    name: "Interactive Demo App",
    descriptionItems: [
      "https://via.placeholder.com/800x600/4A90E2/ffffff?text=Screenshot",
      {
        iframe: {
          src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          title: "App Demo Video",
          width: "100%",
          height: "315",
        },
      },
    ],
  },
};

export const PaidApp: Story = {
  args: {
    ...baseProps,
    name: "Premium Calendar Integration",
    price: 9.99,
    feeType: "monthly",
    paid: {
      priceInUsd: 9.99,
      currency: "usd",
    },
  },
};

export const UsageBasedPricing: Story = {
  args: {
    ...baseProps,
    name: "Usage-Based App",
    price: 2.99,
    commission: 10,
    feeType: "usage-based",
  },
};

export const GlobalApp: Story = {
  args: {
    ...baseProps,
    name: "Global System App",
    isGlobal: true,
    categories: ["other"],
  },
};

export const ProApp: Story = {
  args: {
    ...baseProps,
    name: "Professional Suite",
    pro: true,
    price: 19.99,
    feeType: "monthly",
  },
};

export const TeamsPlanRequired: Story = {
  args: {
    ...baseProps,
    name: "Enterprise Team Tool",
    teamsPlanRequired: true,
    categories: ["automation"],
  },
};

export const WithAllContactInfo: Story = {
  args: {
    ...baseProps,
    name: "Fully Documented App",
    docs: "https://docs.example.com/app",
    website: "https://example.com",
    email: "support@example.com",
    tos: "https://example.com/terms",
    privacy: "https://example.com/privacy",
  },
};

export const TemplateApp: Story = {
  args: {
    ...baseProps,
    name: "Template Application",
    isTemplate: true,
    categories: ["other"],
  },
};

export const WithDependencies: Story = {
  args: {
    ...baseProps,
    name: "Dependent App",
    dependencies: ["google-calendar", "google-meet"],
    categories: ["calendar", "conferencing"],
  },
};

export const ConferencingApp: Story = {
  args: {
    ...baseProps,
    name: "Zoom Integration",
    type: "zoom_video",
    categories: ["conferencing", "video"],
    author: "Zoom",
    website: "https://zoom.us",
    descriptionItems: [
      "https://via.placeholder.com/800x600/2D8CFF/ffffff?text=Zoom+Integration",
    ],
  },
};

export const ConcurrentMeetingsApp: Story = {
  args: {
    ...baseProps,
    name: "Round Robin Scheduler",
    categories: ["conferencing"],
    concurrentMeetings: true,
    body: (
      <div>
        <p>
          Enable concurrent meetings with round-robin scheduling. Perfect for teams that need to
          distribute meeting load across multiple team members.
        </p>
      </div>
    ),
  },
};

export const PaymentApp: Story = {
  args: {
    ...baseProps,
    name: "Stripe Payment Gateway",
    type: "stripe_payment",
    categories: ["payment"],
    author: "Stripe",
    price: 0,
    website: "https://stripe.com",
    docs: "https://stripe.com/docs",
    body: (
      <div>
        <p>Accept payments for your bookings with Stripe integration.</p>
        <h3>Supported Features</h3>
        <ul>
          <li>One-time payments</li>
          <li>Subscription billing</li>
          <li>Refunds and disputes</li>
          <li>Multiple currencies</li>
        </ul>
      </div>
    ),
  },
};

export const AnalyticsApp: Story = {
  args: {
    ...baseProps,
    name: "Analytics Dashboard",
    type: "analytics_app",
    categories: ["analytics"],
    author: "Cal.com",
    descriptionItems: [
      "https://via.placeholder.com/800x600/6C5CE7/ffffff?text=Analytics+Dashboard",
      "https://via.placeholder.com/800x600/A29BFE/ffffff?text=Reports+View",
      "https://via.placeholder.com/800x600/FD79A8/ffffff?text=Insights",
    ],
    body: (
      <div>
        <p>
          Get detailed insights into your booking performance with comprehensive analytics and
          reporting.
        </p>
        <h3>Key Metrics</h3>
        <ul>
          <li>Booking conversion rates</li>
          <li>Revenue tracking</li>
          <li>User engagement</li>
          <li>Popular time slots</li>
        </ul>
      </div>
    ),
  },
};

export const WebhookApp: Story = {
  args: {
    ...baseProps,
    name: "Webhook Integration",
    type: "webhook_app",
    categories: ["automation", "other"],
    author: "Cal.com",
    body: (
      <div>
        <p>
          Connect your workflows with webhook integrations. Send booking data to external systems
          in real-time.
        </p>
        <h3>Webhook Events</h3>
        <ul>
          <li>Booking created</li>
          <li>Booking rescheduled</li>
          <li>Booking cancelled</li>
          <li>Booking completed</li>
        </ul>
      </div>
    ),
  },
};

export const CRMApp: Story = {
  args: {
    ...baseProps,
    name: "Salesforce CRM",
    type: "salesforce_crm",
    categories: ["crm"],
    author: "Salesforce",
    website: "https://salesforce.com",
    docs: "https://developer.salesforce.com",
    price: 15.99,
    feeType: "monthly",
    descriptionItems: [
      "https://via.placeholder.com/800x600/00A1E0/ffffff?text=CRM+Integration",
    ],
    body: (
      <div>
        <p>
          Seamlessly integrate your bookings with Salesforce CRM. Automatically create leads,
          contacts, and opportunities from your calendar events.
        </p>
      </div>
    ),
  },
};

export const MessagingApp: Story = {
  args: {
    ...baseProps,
    name: "Slack Notifications",
    type: "slack_messaging",
    categories: ["messaging"],
    author: "Slack",
    website: "https://slack.com",
    descriptionItems: [
      "https://via.placeholder.com/800x600/4A154B/ffffff?text=Slack+Integration",
    ],
    body: (
      <div>
        <p>
          Get instant notifications in Slack when bookings are created, rescheduled, or cancelled.
          Keep your team informed in real-time.
        </p>
      </div>
    ),
  },
};
