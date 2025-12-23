import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SendgridSetup from "./Setup";

const meta = {
  title: "Apps/Sendgrid/Setup",
  component: SendgridSetup,
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
} satisfies Meta<typeof SendgridSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
      },
    },
  },
};

export const WithApiKeyInput: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
      },
    },
  },
};

export const TestApiKeySuccess: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
        push: (url: string) => console.log("Navigate to:", url),
      },
    },
    mockData: [
      {
        url: "/api/integrations/sendgrid/check",
        method: "POST",
        status: 200,
        response: {},
      },
    ],
  },
};

export const TestApiKeyFailed: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
        push: (url: string) => console.log("Navigate to:", url),
      },
    },
    mockData: [
      {
        url: "/api/integrations/sendgrid/check",
        method: "POST",
        status: 401,
        response: {
          message: "Invalid API key",
        },
      },
    ],
  },
};

export const SaveApiKeySuccess: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
        push: (url: string) => console.log("Navigate to:", url),
      },
    },
    mockData: [
      {
        url: "/api/integrations/sendgrid/add",
        method: "POST",
        status: 200,
        response: {
          url: "/apps/installed/messaging",
        },
      },
    ],
  },
};

export const SaveApiKeyError: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
        push: (url: string) => console.log("Navigate to:", url),
      },
    },
    mockData: [
      {
        url: "/api/integrations/sendgrid/add",
        method: "POST",
        status: 400,
        response: {
          message: "Failed to save API key. Please try again.",
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
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/sendgrid/setup",
        query: {},
      },
    },
  },
};
