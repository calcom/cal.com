import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { EventTypeEmbedButton } from "./EventTypeEmbed";

const meta = {
  component: EventTypeEmbedButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    embedUrl: "john-doe/30min",
    namespace: "default",
  },
  argTypes: {
    embedUrl: {
      control: "text",
      description: "The URL path for the event type to embed (e.g., 'username/event-slug')",
    },
    namespace: {
      control: "text",
      description: "Namespace identifier for the embed instance",
    },
    eventId: {
      control: "number",
      description: "Optional event type ID",
    },
    noQueryParamMode: {
      control: "boolean",
      description: "Whether to use query parameters or internal state for embed dialog",
    },
    className: {
      control: "text",
      description: "Additional CSS classes to apply to the button",
    },
  },
} satisfies Meta<typeof EventTypeEmbedButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    embedUrl: "john-doe/30min",
    namespace: "default",
    children: "Embed",
  },
};

export const WithCustomText: Story = {
  args: {
    embedUrl: "team/consultation",
    namespace: "team-embed",
    children: "Add to your site",
  },
};

export const WithEventId: Story = {
  args: {
    embedUrl: "jane-smith/discovery-call",
    namespace: "discovery",
    eventId: 123,
    children: "Embed Event",
  },
};

export const NoQueryParamMode: Story = {
  args: {
    embedUrl: "sales/demo",
    namespace: "sales-demo",
    noQueryParamMode: true,
    children: "Embed (No Query Params)",
  },
};

export const WithCustomClassName: Story = {
  args: {
    embedUrl: "support/meeting",
    namespace: "support",
    className: "bg-blue-500 text-white hover:bg-blue-600",
    children: "Book a Meeting",
  },
};

export const TeamEvent: Story = {
  args: {
    embedUrl: "team/engineering/standup",
    namespace: "team-standup",
    eventId: 456,
    children: "Embed Team Event",
  },
};

export const LongEventName: Story = {
  args: {
    embedUrl: "consultant/in-depth-strategic-planning-session",
    namespace: "strategic-planning",
    children: "Embed Strategic Planning",
  },
};

export const MultipleButtons: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <EventTypeEmbedButton
          embedUrl="john/30min"
          namespace="quick-call"
          className="w-full justify-center">
          30 Min Meeting
        </EventTypeEmbedButton>
      </div>
      <div>
        <EventTypeEmbedButton embedUrl="john/60min" namespace="long-call" className="w-full justify-center">
          60 Min Meeting
        </EventTypeEmbedButton>
      </div>
      <div>
        <EventTypeEmbedButton
          embedUrl="john/consultation"
          namespace="consultation"
          className="w-full justify-center">
          Free Consultation
        </EventTypeEmbedButton>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const InCardLayout: Story = {
  render: () => (
    <div className="border-subtle max-w-md rounded-lg border p-6">
      <h3 className="text-emphasis mb-2 text-lg font-semibold">Schedule a Meeting</h3>
      <p className="text-subtle mb-4 text-sm">
        Click the button below to embed our booking calendar on your website or share it with your audience.
      </p>
      <EventTypeEmbedButton
        embedUrl="team/consultation"
        namespace="card-embed"
        className="w-full justify-center">
        Get Embed Code
      </EventTypeEmbedButton>
    </div>
  ),
  parameters: {
    layout: "centered",
  },
};

export const WithDifferentColorSchemes: Story = {
  render: () => (
    <div className="space-y-4">
      <EventTypeEmbedButton
        embedUrl="john/meeting"
        namespace="primary"
        className="bg-brand text-brand-text hover:bg-brand-emphasis">
        Primary Style
      </EventTypeEmbedButton>
      <EventTypeEmbedButton
        embedUrl="john/meeting"
        namespace="secondary"
        className="bg-subtle text-emphasis hover:bg-emphasis">
        Secondary Style
      </EventTypeEmbedButton>
      <EventTypeEmbedButton
        embedUrl="john/meeting"
        namespace="minimal"
        className="bg-transparent text-emphasis border border-subtle hover:bg-subtle">
        Minimal Style
      </EventTypeEmbedButton>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const AsCustomElement: Story = {
  args: {
    embedUrl: "designer/portfolio-review",
    namespace: "custom-element",
    as: "div",
    children: "Click to Embed",
  },
};

export const Interactive: Story = {
  args: {
    embedUrl: "interactive/demo",
    namespace: "interactive-demo",
    children: "Open Embed Dialog",
  },
  play: async ({ args }) => {
    // This story demonstrates the interactive behavior
    // When clicked, it should open the embed dialog
    console.log("Embed button clicked with args:", args);
  },
};
