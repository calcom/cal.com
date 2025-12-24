import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Icon } from "@calcom/ui/components/icon";
import { Input, TextField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";

import SettingInputContainer from "./SettingInputContainer";

const meta = {
  component: SettingInputContainer,
  title: "Web/UI/SettingInputContainer",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingInputContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Icon name="clock" {...props} />
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Icon name="user" {...props} />
);

const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Icon name="mail" {...props} />
);

const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Icon name="globe" {...props} />
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Icon name="calendar" {...props} />
);

export const Default: Story = {
  args: {
    label: "Time Zone",
    htmlFor: "timezone",
    Icon: GlobeIcon,
    Input: <Input id="timezone" placeholder="America/New_York" />,
  },
};

export const WithTextField: Story = {
  args: {
    label: "Display Name",
    htmlFor: "displayName",
    Icon: UserIcon,
    Input: <TextField name="displayName" placeholder="Enter your display name" />,
  },
};

export const WithEmail: Story = {
  args: {
    label: "Email Address",
    htmlFor: "email",
    Icon: MailIcon,
    Input: <Input id="email" type="email" placeholder="you@example.com" />,
  },
};

export const WithSelect: Story = {
  args: {
    label: "Default Duration",
    htmlFor: "duration",
    Icon: ClockIcon,
    Input: (
      <Select
        options={[
          { value: "15", label: "15 minutes" },
          { value: "30", label: "30 minutes" },
          { value: "45", label: "45 minutes" },
          { value: "60", label: "60 minutes" },
        ]}
      />
    ),
  },
};

export const WithCalendar: Story = {
  args: {
    label: "Default Calendar",
    htmlFor: "calendar",
    Icon: CalendarIcon,
    Input: (
      <Select
        options={[
          { value: "google", label: "Google Calendar" },
          { value: "outlook", label: "Outlook Calendar" },
          { value: "apple", label: "Apple Calendar" },
        ]}
      />
    ),
  },
};

export const MultipleSettings: Story = {
  render: () => (
    <div className="space-y-6">
      <SettingInputContainer
        label="Display Name"
        htmlFor="displayName"
        Icon={UserIcon}
        Input={<TextField name="displayName" defaultValue="John Doe" />}
      />
      <SettingInputContainer
        label="Email"
        htmlFor="email"
        Icon={MailIcon}
        Input={<Input id="email" type="email" defaultValue="john@example.com" />}
      />
      <SettingInputContainer
        label="Time Zone"
        htmlFor="timezone"
        Icon={GlobeIcon}
        Input={
          <Select
            options={[
              { value: "America/New_York", label: "Eastern Time (ET)" },
              { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
              { value: "Europe/London", label: "British Time (GMT)" },
            ]}
            defaultValue={{ value: "America/New_York", label: "Eastern Time (ET)" }}
          />
        }
      />
    </div>
  ),
};
