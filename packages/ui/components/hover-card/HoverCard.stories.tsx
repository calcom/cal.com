import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "../avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./index";

const meta = {
  title: "HoverCard",
  component: HoverCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="text-emphasis cursor-pointer underline">@johndoe</span>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-4">
          <Avatar size="lg" imageSrc="" alt="John Doe" />
          <div>
            <h4 className="text-emphasis text-sm font-semibold">John Doe</h4>
            <p className="text-subtle text-sm">Software Engineer</p>
            <p className="text-subtle mt-2 text-xs">Joined December 2024</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const WithUserProfile: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="text-emphasis hover:underline">View Profile</button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar size="lg" imageSrc="" alt="Jane Smith" />
            <div>
              <h4 className="text-emphasis text-sm font-semibold">Jane Smith</h4>
              <p className="text-subtle text-xs">jane@example.com</p>
            </div>
          </div>
          <p className="text-subtle text-sm">Product designer with 5+ years of experience in creating user-centered designs.</p>
          <div className="border-subtle flex justify-between border-t pt-2">
            <span className="text-subtle text-xs">15 Event Types</span>
            <span className="text-subtle text-xs">230 Bookings</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const EventDetails: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="bg-subtle cursor-pointer rounded px-2 py-1 text-sm">30 Min Meeting</span>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-2">
          <h4 className="text-emphasis font-semibold">30 Min Meeting</h4>
          <p className="text-subtle text-sm">A quick call to discuss project updates and next steps.</p>
          <div className="text-subtle flex items-center gap-2 text-xs">
            <span>30 minutes</span>
            <span>•</span>
            <span>Google Meet</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const AlignStart: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="text-emphasis cursor-pointer underline">Hover me (align start)</span>
      </HoverCardTrigger>
      <HoverCardContent align="start">
        <p className="text-subtle text-sm">This content is aligned to the start.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="text-emphasis cursor-pointer underline">Hover me (align end)</span>
      </HoverCardTrigger>
      <HoverCardContent align="end">
        <p className="text-subtle text-sm">This content is aligned to the end.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const SimpleTooltipLike: Story = {
  render: () => (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="border-subtle cursor-help border-b border-dashed">What is this?</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-48">
        <p className="text-subtle text-sm">This is a helpful explanation that appears on hover.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};
