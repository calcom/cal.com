import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import AlbySetup from "./Setup";

const meta = {
  title: "Apps/Alby/Setup",
  component: AlbySetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AlbySetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    lightningAddress: "",
    email: "",
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/alby/setup",
        query: {},
      },
    },
  },
};

export const NotConnected: Story = {
  args: {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    lightningAddress: "",
    email: "",
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/alby/setup",
        query: {},
      },
    },
  },
};

export const Connected: Story = {
  args: {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    lightningAddress: "satoshi@getalby.com",
    email: "satoshi@example.com",
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/alby/setup",
        query: {},
      },
    },
  },
};

export const CallbackMode: Story = {
  args: {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    lightningAddress: "",
    email: "",
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/alby/setup",
        query: {
          callback: "true",
        },
      },
    },
  },
};

export const CallbackModeWithCode: Story = {
  args: {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    lightningAddress: "",
    email: "",
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/alby/setup",
        query: {
          callback: "true",
          code: "mock-authorization-code",
        },
      },
    },
  },
};

export const CallbackModeWithError: Story = {
  args: {
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    lightningAddress: "",
    email: "",
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/alby/setup",
        query: {
          callback: "true",
          error: "access_denied",
        },
      },
    },
  },
};
