import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { AddGuestsDialog } from "./AddGuestsDialog";

const meta = {
  title: "Components/Dialog/AddGuestsDialog",
  component: AddGuestsDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen w-screen flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddGuestsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle state
const AddGuestsDialogWithState = (args: { isOpenDialog: boolean; bookingId: number }) => {
  const [isOpenDialog, setIsOpenDialog] = useState(args.isOpenDialog);

  return <AddGuestsDialog isOpenDialog={isOpenDialog} setIsOpenDialog={setIsOpenDialog} bookingId={args.bookingId} />;
};

/**
 * Default state of the AddGuestsDialog component.
 * The dialog is open and ready for adding guests to a booking.
 */
export const Default: Story = {
  render: (args) => <AddGuestsDialogWithState {...args} />,
  args: {
    isOpenDialog: true,
    bookingId: 123,
  },
};

/**
 * Dialog in a closed state.
 * Click the trigger or set isOpenDialog to true to open it.
 */
export const Closed: Story = {
  render: (args) => {
    const [isOpenDialog, setIsOpenDialog] = useState(false);

    return (
      <div>
        <button
          onClick={() => setIsOpenDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Add Guests Dialog
        </button>
        <AddGuestsDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          bookingId={args.bookingId || 123}
        />
      </div>
    );
  },
  args: {
    bookingId: 123,
  },
};

/**
 * Dialog with a different booking ID.
 * Shows the dialog configured for a different booking.
 */
export const DifferentBooking: Story = {
  render: (args) => <AddGuestsDialogWithState {...args} />,
  args: {
    isOpenDialog: true,
    bookingId: 456,
  },
};

/**
 * Interactive example with controlled state.
 * Demonstrates full interaction flow with state management.
 */
export const Interactive: Story = {
  render: () => {
    const [isOpenDialog, setIsOpenDialog] = useState(false);
    const [bookingId] = useState(789);

    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Booking ID: {bookingId}</p>
          <button
            onClick={() => setIsOpenDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Guests to Booking
          </button>
        </div>
        <AddGuestsDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          bookingId={bookingId}
        />
      </div>
    );
  },
};
