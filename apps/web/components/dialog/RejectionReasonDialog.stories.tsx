import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { RejectionReasonDialog } from "./RejectionReasonDialog";

const meta: Meta<typeof RejectionReasonDialog> = {
  title: "Components/Dialog/RejectionReasonDialog",
  component: RejectionReasonDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-w-[400px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RejectionReasonDialog>;

export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <RejectionReasonDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    onConfirm: fn(),
    isPending: false,
  },
};

export const WithPendingState: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <RejectionReasonDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    onConfirm: fn(),
    isPending: true,
  },
};

export const Closed: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button onClick={() => setIsOpen(true)} className="rounded bg-blue-500 px-4 py-2 text-white">
          Open Dialog
        </button>
        <RejectionReasonDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />
      </>
    );
  },
  args: {
    onConfirm: fn(),
    isPending: false,
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleConfirm = (reason: string) => {
      console.log("Rejection reason:", reason);
      args.onConfirm?.(reason);
      setIsOpen(false);
    };
    return (
      <>
        <button onClick={() => setIsOpen(true)} className="rounded bg-blue-500 px-4 py-2 text-white">
          Open Rejection Dialog
        </button>
        <RejectionReasonDialog
          {...args}
          isOpenDialog={isOpen}
          setIsOpenDialog={setIsOpen}
          onConfirm={handleConfirm}
        />
      </>
    );
  },
  args: {
    onConfirm: fn(),
    isPending: false,
  },
};
