import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";

import BTCPaySetup from "./Setup";

const meta = {
  component: BTCPaySetup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <SessionProvider
        session={{
          user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }}>
        <Story />
      </SessionProvider>
    ),
  ],
} satisfies Meta<typeof BTCPaySetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithExistingCredentials: Story = {
  args: {
    serverUrl: "https://btcpay.example.com",
    storeId: "ABC123XYZ456",
    apiKey: "secret_api_key_example_1234567890",
    webhookSecret: "webhook_secret_example_abcdef",
  },
};

export const NewCredential: Story = {
  args: {
    serverUrl: "",
    storeId: "",
    apiKey: "",
    webhookSecret: "",
  },
};

export const PartialCredentials: Story = {
  args: {
    serverUrl: "https://btcpay.example.com",
    storeId: "ABC123XYZ456",
    apiKey: "",
    webhookSecret: "",
  },
};
