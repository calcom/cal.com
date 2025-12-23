import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import AppleCalendarSetup from "./Setup";

const meta = {
  title: "Apps/AppleCalendar/Setup",
  component: AppleCalendarSetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-screen h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppleCalendarSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMockApiError: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        push: (url: string) => console.log("Navigate to:", url),
      },
    },
    mockData: [
      {
        url: "/api/integrations/applecalendar/add",
        method: "POST",
        status: 400,
        response: {
          message: "invalid_credentials",
        },
      },
    ],
  },
};

export const WithMockApiSuccess: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        push: (url: string) => console.log("Navigate to:", url),
      },
    },
    mockData: [
      {
        url: "/api/integrations/applecalendar/add",
        method: "POST",
        status: 200,
        response: {
          url: "/apps/installed/calendar",
        },
      },
    ],
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: "dark",
    },
    theme: "dark",
  },
};
