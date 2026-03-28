import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { expect, fn, userEvent } from "storybook/test";

import { VerifyCodeDialog } from "~/bookings/components/VerifyCodeDialog.tsx";

const meta = {
  title: "Bookings/VerifyCodeDialog",
  component: VerifyCodeDialog,
  args: {
    isOpenDialog: true,
    setIsOpenDialog: fn(),
    email: "user@example.com",
    isUserSessionRequiredToVerify: true,
    verifyCodeWithSessionNotRequired: fn(),
    verifyCodeWithSessionRequired: fn(),
    resetErrors: fn(),
    isPending: false,
    setIsPending: fn(),
    error: "",
  },
  decorators: [
    (Story) => (
      <div className="bg-default text-default min-h-screen p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VerifyCodeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkMode: Story = {
  globals: { theme: "dark" },
};

export const WithError: Story = {
  args: {
    error: "Invalid code. Please try again.",
  },
};

export const WithErrorDarkMode: Story = {
  args: {
    error: "Invalid code. Please try again.",
  },
  globals: { theme: "dark" },
};

export const Loading: Story = {
  args: {
    isPending: true,
  },
};

export const ClickSubmit: Story = {
  play: async ({ canvas }) => {
    const submitButton = canvas.getByRole("button", { name: "Submit" });
    await userEvent.click(submitButton);
    await expect(meta.args.verifyCodeWithSessionRequired).toHaveBeenCalledOnce();
  },
};

export const SessionNotRequired: Story = {
  args: {
    isUserSessionRequiredToVerify: false,
  },
  play: async ({ canvas }) => {
    const submitButton = canvas.getByRole("button", { name: "Submit" });
    await userEvent.click(submitButton);
    await expect(meta.args.verifyCodeWithSessionNotRequired).toHaveBeenCalledOnce();
  },
};

export const Closed: Story = {
  args: {
    isOpenDialog: false,
  },
};
