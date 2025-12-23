import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { EmptyScreen } from "./EmptyScreen";

const meta = {
  component: EmptyScreen,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    Icon: "calendar",
    headline: "No events scheduled",
    description: "You don't have any upcoming events. Create your first event type to get started.",
  },
};

export const WithButton: Story = {
  args: {
    Icon: "calendar",
    headline: "No events scheduled",
    description: "You don't have any upcoming events. Create your first event type to get started.",
    buttonText: "Create Event Type",
    buttonOnClick: () => console.log("Button clicked"),
  },
};

export const WithCustomButton: Story = {
  args: {
    Icon: "users",
    headline: "No team members",
    description: "Invite team members to collaborate on scheduling and manage availability together.",
    buttonRaw: (
      <div className="flex gap-2">
        <Button color="secondary">Import from CSV</Button>
        <Button>Invite Members</Button>
      </div>
    ),
  },
};

export const NoBorder: Story = {
  args: {
    Icon: "inbox",
    headline: "Inbox is empty",
    description: "All caught up! No new notifications or messages.",
    border: false,
  },
};

export const SolidBorder: Story = {
  args: {
    Icon: "file-text",
    headline: "No documents",
    description: "Upload or create documents to share with your team.",
    dashedBorder: false,
    buttonText: "Upload Document",
    buttonOnClick: () => console.log("Upload clicked"),
  },
};

export const BookingsEmpty: Story = {
  args: {
    Icon: "calendar",
    headline: "No upcoming bookings",
    description:
      "You don't have any upcoming bookings. Share your booking link to start receiving appointments.",
    buttonText: "Copy Booking Link",
    buttonOnClick: () => console.log("Copy link"),
  },
};

export const IntegrationsEmpty: Story = {
  args: {
    Icon: "zap",
    headline: "No integrations connected",
    description:
      "Connect your favorite apps to automate your workflow and sync your calendars.",
    buttonText: "Browse Integrations",
    buttonOnClick: () => console.log("Browse clicked"),
  },
};

export const WorkflowsEmpty: Story = {
  args: {
    Icon: "workflow",
    headline: "No workflows yet",
    description:
      "Automate reminders, follow-ups, and more with workflows. Create your first workflow to get started.",
    buttonText: "Create Workflow",
    buttonOnClick: () => console.log("Create workflow"),
  },
};

export const SearchNoResults: Story = {
  args: {
    Icon: "search",
    headline: "No results found",
    description: "We couldn't find any matches for your search. Try adjusting your filters or search terms.",
    buttonText: "Clear Filters",
    buttonOnClick: () => console.log("Clear filters"),
  },
};

export const ErrorState: Story = {
  args: {
    Icon: "alert-triangle",
    headline: "Something went wrong",
    description: "We encountered an error loading this content. Please try again.",
    buttonText: "Retry",
    buttonOnClick: () => console.log("Retry"),
    iconClassName: "text-error",
  },
};

export const FullWidth: Story = {
  args: {
    Icon: "layout-grid",
    headline: "No items to display",
    description: "This list is empty. Add items to see them here.",
    limitWidth: false,
  },
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
};
