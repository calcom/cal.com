import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MintlifyChat } from "./MintlifyChat";

const meta = {
  component: MintlifyChat,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    searchText: {
      description: "The search query text that the AI will answer",
      control: "text",
    },
    aiResponse: {
      description: "The AI-generated response (can include markdown and citations)",
      control: "text",
    },
    setAiResponse: {
      description: "Function to update the AI response state",
      table: {
        disable: true,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MintlifyChat>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle state for interactive stories
const MintlifyChatWrapper = ({ searchText, initialResponse }: { searchText: string; initialResponse: string }) => {
  const [aiResponse, setAiResponse] = useState(initialResponse);

  return <MintlifyChat searchText={searchText} aiResponse={aiResponse} setAiResponse={setAiResponse} />;
};

export const Default: Story = {
  render: () => {
    return <MintlifyChatWrapper searchText="event types" initialResponse="" />;
  },
};

export const WithSearchQuery: Story = {
  render: () => {
    return <MintlifyChatWrapper searchText="how to create a booking" initialResponse="" />;
  },
};

export const WithResponse: Story = {
  render: () => {
    const response = `Event types are the foundation of your scheduling setup in Cal.com. They define the type of meetings you want to offer, including duration, availability, and booking conditions.

To create an event type:
1. Go to your dashboard
2. Click on "Event Types"
3. Click "New Event Type"
4. Configure your settings
5. Save and share your booking link||[{"id":"1","link":"/event-types","chunk_html":"","metadata":{"title":"Event Types Documentation"}},{"id":"2","link":"/getting-started","chunk_html":"","metadata":{"title":"Getting Started Guide"}}]`;

    return <MintlifyChatWrapper searchText="event types" initialResponse={response} />;
  },
};

export const WithMarkdownResponse: Story = {
  render: () => {
    const response = `You can customize your booking page in several ways:

## Appearance
- **Colors**: Choose your brand colors
- **Logo**: Upload your company logo
- **Background**: Set a custom background image

## Settings
- Add custom questions
- Set buffer times
- Configure notifications||[{"id":"1","link":"/appearance","chunk_html":"","metadata":{"title":"Appearance Settings"}},{"id":"2","link":"/booking-questions","chunk_html":"","metadata":{"title":"Custom Questions"}}]`;

    return <MintlifyChatWrapper searchText="customize booking page" initialResponse={response} />;
  },
};

export const WithLongResponse: Story = {
  render: () => {
    const response = `Cal.com offers extensive integration capabilities with various tools and platforms:

## Calendar Integrations
Connect with Google Calendar, Outlook, Apple Calendar, and CalDAV to sync your availability automatically. This ensures you never get double-booked.

## Video Conferencing
Integrate with Zoom, Google Meet, Microsoft Teams, or any custom video conferencing solution. Each meeting can automatically include video conferencing links.

## Payment Processing
Accept payments through Stripe, PayPal, or other payment processors. Set up paid event types for consultations, workshops, or any service.

## CRM Integration
Sync your bookings with Salesforce, HubSpot, and other CRM platforms to keep your customer data up-to-date.

## Automation
Use webhooks and API integrations to automate workflows with tools like Zapier, Make, or custom solutions.||[{"id":"1","link":"/integrations/calendar","chunk_html":"","metadata":{"title":"Calendar Integrations"}},{"id":"2","link":"/integrations/video","chunk_html":"","metadata":{"title":"Video Conferencing"}},{"id":"3","link":"/integrations/payment","chunk_html":"","metadata":{"title":"Payment Processing"}},{"id":"4","link":"/integrations/crm","chunk_html":"","metadata":{"title":"CRM Integration"}}]`;

    return <MintlifyChatWrapper searchText="integrations" initialResponse={response} />;
  },
};

export const ShortQuery: Story = {
  render: () => {
    return <MintlifyChatWrapper searchText="API" initialResponse="" />;
  },
};

export const ComplexQuery: Story = {
  render: () => {
    return <MintlifyChatWrapper searchText="How do I set up round-robin scheduling for my team with weighted distribution?" initialResponse="" />;
  },
};

export const ResponseWithoutCitations: Story = {
  render: () => {
    const response = "Round-robin scheduling allows you to distribute bookings evenly across team members. This is perfect for sales teams, support staff, or any scenario where you want to balance the load.||";

    return <MintlifyChatWrapper searchText="round-robin scheduling" initialResponse={response} />;
  },
};

export const ResponseWithManyCitations: Story = {
  render: () => {
    const response = `Cal.com provides comprehensive team scheduling features for organizations of all sizes.||[{"id":"1","link":"/teams/getting-started","chunk_html":"","metadata":{"title":"Getting Started with Teams"}},{"id":"2","link":"/teams/round-robin","chunk_html":"","metadata":{"title":"Round-Robin Scheduling"}},{"id":"3","link":"/teams/collective","chunk_html":"","metadata":{"title":"Collective Events"}},{"id":"4","link":"/teams/permissions","chunk_html":"","metadata":{"title":"Team Permissions"}},{"id":"5","link":"/teams/billing","chunk_html":"","metadata":{"title":"Team Billing"}},{"id":"6","link":"/teams/branding","chunk_html":"","metadata":{"title":"Team Branding"}}]`;

    return <MintlifyChatWrapper searchText="team features" initialResponse={response} />;
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-semibold">Initial State (No Response)</h3>
        <div className="w-[600px]">
          <MintlifyChatWrapper searchText="webhooks" initialResponse="" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">With Response and Citations</h3>
        <div className="w-[600px]">
          <MintlifyChatWrapper
            searchText="API authentication"
            initialResponse={`To authenticate with the Cal.com API, you need to generate an API key from your account settings.||[{"id":"1","link":"/api/authentication","chunk_html":"","metadata":{"title":"API Authentication"}}]`}
          />
        </div>
      </div>
    </div>
  ),
};
