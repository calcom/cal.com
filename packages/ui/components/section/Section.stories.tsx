import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { Switch } from "../form/switch";
import { Section } from "./section";

const meta = {
  title: "Components/Section",
  component: Section,
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
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Section>
      <Section.Header title="General Settings" description="Manage your account settings" icon="settings" />
      <Section.Content>
        <p className="text-subtle text-sm">Section content goes here</p>
      </Section.Content>
    </Section>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Section>
      <Section.Header title="Availability" description="Set your working hours" icon="clock">
        <Button size="sm">Edit</Button>
      </Section.Header>
      <Section.Content>
        <div className="text-subtle text-sm">
          <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
          <p>Saturday - Sunday: Unavailable</p>
        </div>
      </Section.Content>
    </Section>
  ),
};

export const WithSubSection: Story = {
  render: () => (
    <Section>
      <Section.Header title="Notifications" description="Configure how you receive notifications" icon="bell" />
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionHeader title="Email notifications" icon="mail">
            <Switch checked />
          </Section.SubSectionHeader>
        </Section.SubSection>
        <Section.SubSection>
          <Section.SubSectionHeader title="SMS notifications" icon="message-square">
            <Switch />
          </Section.SubSectionHeader>
        </Section.SubSection>
      </Section.Content>
    </Section>
  ),
};

export const ComplexSection: Story = {
  render: () => (
    <Section>
      <Section.Header title="Calendar Integration" description="Connect your calendars" icon="calendar">
        <Button size="sm" color="secondary">
          Add Calendar
        </Button>
      </Section.Header>
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionHeader title="Google Calendar" icon="calendar">
            <Button size="sm" color="minimal">
              Disconnect
            </Button>
          </Section.SubSectionHeader>
          <Section.SubSectionContent>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">john@gmail.com</span>
              <span className="text-subtle text-xs">Connected</span>
            </div>
          </Section.SubSectionContent>
        </Section.SubSection>
        <Section.SubSection>
          <Section.SubSectionHeader title="Outlook Calendar" icon="calendar">
            <Button size="sm">Connect</Button>
          </Section.SubSectionHeader>
        </Section.SubSection>
      </Section.Content>
    </Section>
  ),
};

export const NestedSubSections: Story = {
  render: () => (
    <Section>
      <Section.Header title="Event Types" description="Manage your event types" icon="link" />
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionHeader title="30 Minute Meeting">
            <Switch checked />
          </Section.SubSectionHeader>
          <Section.SubSectionNested>
            <div className="flex items-center justify-between p-2">
              <span className="text-sm">Duration</span>
              <span className="text-subtle text-sm">30 minutes</span>
            </div>
            <div className="flex items-center justify-between p-2">
              <span className="text-sm">Location</span>
              <span className="text-subtle text-sm">Google Meet</span>
            </div>
          </Section.SubSectionNested>
        </Section.SubSection>
      </Section.Content>
    </Section>
  ),
};

export const ProfileSection: Story = {
  render: () => (
    <Section>
      <Section.Header title="Profile" description="Your public profile information" icon="user">
        <Button size="sm">Edit Profile</Button>
      </Section.Header>
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionContent>
            <div className="space-y-3 p-2">
              <div className="flex items-center justify-between">
                <span className="text-emphasis text-sm font-medium">Name</span>
                <span className="text-subtle text-sm">John Doe</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emphasis text-sm font-medium">Email</span>
                <span className="text-subtle text-sm">john@example.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emphasis text-sm font-medium">Timezone</span>
                <span className="text-subtle text-sm">America/New_York</span>
              </div>
            </div>
          </Section.SubSectionContent>
        </Section.SubSection>
      </Section.Content>
    </Section>
  ),
};
