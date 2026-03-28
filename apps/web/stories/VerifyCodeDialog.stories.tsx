import React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { expect, fn, userEvent, within } from "storybook/test";

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
  decorators: [
    (Story) => {
      document.documentElement.classList.add("dark");
      return (
        <div className="bg-default text-default min-h-screen p-8">
          <Story />
        </div>
      );
    },
  ],
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
  decorators: [
    (Story) => {
      document.documentElement.classList.add("dark");
      return (
        <div className="bg-default text-default min-h-screen p-8">
          <Story />
        </div>
      );
    },
  ],
};

export const Loading: Story = {
  args: {
    isPending: true,
  },
};

export const ClickSubmit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitButton = canvas.getByRole("button", { name: "Submit" });
    await userEvent.click(submitButton);
    await expect(meta.args.verifyCodeWithSessionRequired).toHaveBeenCalledOnce();
  },
};

export const SessionNotRequired: Story = {
  args: {
    isUserSessionRequiredToVerify: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
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
