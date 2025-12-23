import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Icon } from "../icon";
import { Card } from "./Card";

const meta = {
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      description: "The card variant",
      control: { type: "select" },
      options: ["basic", "ProfileCard", "SidebarCard", "NewLaunchSidebarCard"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    variant: "basic",
    title: "Getting Started",
    description: "Learn how to set up your first event type and start accepting bookings.",
    actionButton: {
      href: "#",
      child: "Learn more",
    },
  },
};

export const BasicWithImage: Story = {
  args: {
    variant: "basic",
    title: "Video Conferencing",
    description: "Connect your favorite video conferencing tool to automate meeting links.",
    image: "https://cal.com/integrations/zoom.svg",
    imageProps: { alt: "Zoom logo" },
    actionButton: {
      href: "#",
      child: "Connect",
    },
  },
};

export const BasicWithIcon: Story = {
  args: {
    variant: "basic",
    title: "Calendar Sync",
    description: "Keep your calendars in sync to prevent double bookings.",
    icon: <Icon name="calendar" className="h-10 w-10 text-brand-default" />,
    actionButton: {
      href: "#",
      child: "Set up",
    },
  },
};

export const ProfileCard: Story = {
  args: {
    variant: "ProfileCard",
    title: "John Doe",
    description: "Product Designer at Cal.com",
    image: "https://cal.com/stakeholder/peer.jpg",
    imageProps: { alt: "John Doe" },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const SidebarCard: Story = {
  args: {
    variant: "SidebarCard",
    title: "New Feature",
    description: "Check out our latest feature that helps you manage your schedule better.",
    learnMore: {
      href: "#",
      text: "Learn more",
    },
    actionButton: {
      child: "Dismiss",
      onClick: () => console.log("Dismissed"),
    },
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const SidebarCardWithMedia: Story = {
  args: {
    variant: "SidebarCard",
    title: "Video Tutorial",
    description: "Watch how to set up your availability preferences.",
    mediaLink: "https://www.youtube.com/watch?v=example",
    thumbnailUrl: "https://img.youtube.com/vi/example/maxresdefault.jpg",
    learnMore: {
      href: "#",
      text: "View all tutorials",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const NewLaunchSidebarCard: Story = {
  args: {
    variant: "NewLaunchSidebarCard",
    title: "Introducing Routing Forms",
    description: "Route leads to the right person automatically based on their responses.",
    learnMore: {
      href: "#",
      text: "Try it now",
    },
    actionButton: {
      child: "Dismiss",
      onClick: () => console.log("Dismissed"),
    },
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-2">Basic</h3>
        <Card
          variant="basic"
          title="Getting Started"
          description="Learn how to set up your first event type."
          actionButton={{ href: "#", child: "Learn more" }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Profile Card</h3>
        <div className="w-80">
          <Card
            variant="ProfileCard"
            title="Jane Smith"
            description="Engineering Lead"
            image="https://cal.com/stakeholder/peer.jpg"
            imageProps={{ alt: "Jane Smith" }}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Sidebar Card</h3>
        <div className="w-64">
          <Card
            variant="SidebarCard"
            title="Pro Tip"
            description="Use workflows to automate your booking confirmations."
            learnMore={{ href: "#", text: "Learn more" }}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">New Launch Sidebar Card</h3>
        <div className="w-64">
          <Card
            variant="NewLaunchSidebarCard"
            title="New: Team Scheduling"
            description="Coordinate meetings across your entire team."
            learnMore={{ href: "#", text: "Try it" }}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
