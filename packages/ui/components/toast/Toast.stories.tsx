import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toaster } from "sonner";

import { Button } from "../button";
import { showToast, SuccessToast, ErrorToast, WarningToast } from "./showToast";

const meta = {
  title: "Components/Toast",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => (
    <Button onClick={() => showToast("Your changes have been saved", "success")}>Show Success Toast</Button>
  ),
};

export const Error: Story = {
  render: () => (
    <Button onClick={() => showToast("Something went wrong. Please try again.", "error")} color="destructive">
      Show Error Toast
    </Button>
  ),
};

export const Warning: Story = {
  render: () => (
    <Button onClick={() => showToast("Your session is about to expire", "warning")} color="secondary">
      Show Warning Toast
    </Button>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button onClick={() => showToast("Booking confirmed!", "success")} color="primary">
        Success
      </Button>
      <Button onClick={() => showToast("Failed to save changes", "error")} color="destructive">
        Error
      </Button>
      <Button onClick={() => showToast("Calendar sync pending", "warning")} color="secondary">
        Warning
      </Button>
    </div>
  ),
};

export const StaticSuccess: Story = {
  render: () => (
    <div className="w-[350px]">
      <SuccessToast message="Booking confirmed successfully!" toastId="demo" onClose={() => {}} />
    </div>
  ),
};

export const StaticError: Story = {
  render: () => (
    <div className="w-[350px]">
      <ErrorToast message="Failed to connect calendar" toastId="demo" onClose={() => {}} />
    </div>
  ),
};

export const StaticWarning: Story = {
  render: () => (
    <div className="w-[350px]">
      <WarningToast message="You have unsaved changes" toastId="demo" onClose={() => {}} />
    </div>
  ),
};

export const ToastMessages: Story = {
  render: () => (
    <div className="space-y-3">
      <SuccessToast message="Event type created" toastId="1" onClose={() => {}} />
      <SuccessToast message="Availability updated" toastId="2" onClose={() => {}} />
      <ErrorToast message="Could not delete event type" toastId="3" onClose={() => {}} />
      <WarningToast message="This action cannot be undone" toastId="4" onClose={() => {}} />
    </div>
  ),
};
