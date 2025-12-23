import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import HitPaySetup from "./Setup";

const meta = {
  title: "Apps/HitPay/Setup",
  component: HitPaySetup,
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
} satisfies Meta<typeof HitPaySetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isSandbox: false,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {},
      },
    },
  },
};

export const SandboxMode: Story = {
  args: {
    isSandbox: true,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {},
      },
    },
  },
};

export const WithProductionKeys: Story = {
  args: {
    isSandbox: false,
    prod: {
      apiKey: "prod_api_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      saltKey: "prod_salt_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {},
      },
    },
  },
};

export const WithSandboxKeys: Story = {
  args: {
    isSandbox: true,
    sandbox: {
      apiKey: "sandbox_api_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      saltKey: "sandbox_salt_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {},
      },
    },
  },
};

export const WithBothKeys: Story = {
  args: {
    isSandbox: false,
    prod: {
      apiKey: "prod_api_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      saltKey: "prod_salt_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    sandbox: {
      apiKey: "sandbox_api_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      saltKey: "sandbox_salt_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {},
      },
    },
  },
};

export const CallbackMode: Story = {
  args: {
    isSandbox: false,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {
          callback: "true",
        },
      },
    },
  },
};

export const CallbackModeWithCode: Story = {
  args: {
    isSandbox: false,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
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
    isSandbox: false,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/hitpay/setup",
        query: {
          callback: "true",
          error: "access_denied",
        },
      },
    },
  },
};
