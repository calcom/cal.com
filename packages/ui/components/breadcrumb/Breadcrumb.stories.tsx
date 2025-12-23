import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Breadcrumb, BreadcrumbItem } from "./Breadcrumb";

const meta = {
  component: Breadcrumb,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbItem href="/settings">Settings</BreadcrumbItem>
      <BreadcrumbItem href="/settings/profile">Profile</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const TwoLevels: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/">Dashboard</BreadcrumbItem>
      <BreadcrumbItem href="/event-types">Event Types</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const ThreeLevels: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbItem href="/teams">Teams</BreadcrumbItem>
      <BreadcrumbItem href="/teams/engineering">Engineering</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const FourLevels: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbItem href="/settings">Settings</BreadcrumbItem>
      <BreadcrumbItem href="/settings/teams">Teams</BreadcrumbItem>
      <BreadcrumbItem href="/settings/teams/members">Members</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const EventTypeEdit: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/event-types">Event Types</BreadcrumbItem>
      <BreadcrumbItem href="/event-types/30-minute-meeting">30 Minute Meeting</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const BookingDetails: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/bookings">Bookings</BreadcrumbItem>
      <BreadcrumbItem href="/bookings/upcoming">Upcoming</BreadcrumbItem>
      <BreadcrumbItem href="/bookings/12345">Booking #12345</BreadcrumbItem>
    </Breadcrumb>
  ),
};

export const TeamSettings: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbItem href="/settings">Settings</BreadcrumbItem>
      <BreadcrumbItem href="/settings/teams">Teams</BreadcrumbItem>
      <BreadcrumbItem href="/settings/teams/acme">Acme Inc</BreadcrumbItem>
      <BreadcrumbItem href="/settings/teams/acme/appearance">Appearance</BreadcrumbItem>
    </Breadcrumb>
  ),
};
