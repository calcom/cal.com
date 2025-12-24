import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import TwoFactorModalHeader from "./TwoFactorModalHeader";

const meta = {
  component: TwoFactorModalHeader,
  title: "Web/Security/TwoFactorModalHeader",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px] rounded-lg border border-default bg-default p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TwoFactorModalHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnableTwoFactor: Story = {
  args: {
    title: "Enable Two-Factor Authentication",
    description: "Add an extra layer of security to your account by enabling two-factor authentication.",
  },
};

export const ConfirmPassword: Story = {
  args: {
    title: "Confirm Password",
    description: "Please enter your current password to continue with two-factor authentication setup.",
  },
};

export const ScanQRCode: Story = {
  args: {
    title: "Scan QR Code",
    description: "Use your authenticator app to scan the QR code or enter the secret key manually.",
  },
};

export const EnterCode: Story = {
  args: {
    title: "Enter Verification Code",
    description: "Enter the 6-digit code from your authenticator app to verify setup.",
  },
};

export const DisableTwoFactor: Story = {
  args: {
    title: "Disable Two-Factor Authentication",
    description: "We recommend keeping two-factor authentication enabled for maximum security.",
  },
};

export const SuccessMessage: Story = {
  args: {
    title: "Two-Factor Authentication Enabled",
    description: "Your account is now protected with an additional layer of security.",
  },
};

export const LongDescription: Story = {
  args: {
    title: "Security Verification Required",
    description:
      "For your security, we require additional verification before making changes to your account. Please enter your password and the verification code from your authenticator app.",
  },
};
