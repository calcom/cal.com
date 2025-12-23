import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Button } from "../button";
import { Dialog, DialogTrigger } from "./Dialog";
import { ConfirmationDialogContent } from "./ConfirmationDialogContent";

const meta = {
  component: ConfirmationDialogContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ConfirmationDialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="destructive">Delete Item</Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        title="Delete Event Type"
        variety="danger"
        onConfirm={fn()}
        confirmBtnText="Delete">
        <p className="mt-4">
          Are you sure you want to delete this event type? This action cannot be undone.
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  ),
};

export const Warning: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="secondary">Archive</Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        title="Archive Event Type"
        variety="warning"
        onConfirm={fn()}
        confirmBtnText="Archive">
        <p className="mt-4">
          This will archive the event type. You can restore it later from the archived section.
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  ),
};

export const Success: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Publish</Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        title="Publish Changes"
        variety="success"
        onConfirm={fn()}
        confirmBtnText="Publish">
        <p className="mt-4">
          Your changes are ready to be published. This will make them visible to all users.
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  ),
};

export const Loading: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="destructive">Delete</Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        title="Deleting..."
        variety="danger"
        isPending={true}
        loadingText="Deleting..."
        onConfirm={fn()}>
        <p className="mt-4">Please wait while we process your request.</p>
      </ConfirmationDialogContent>
    </Dialog>
  ),
};

export const CustomButtons: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Custom Action</Button>
      </DialogTrigger>
      <ConfirmationDialogContent
        title="Custom Confirmation"
        confirmBtnText="Yes, proceed"
        cancelBtnText="No, go back"
        onConfirm={fn()}>
        <p className="mt-4">This is a custom confirmation dialog with custom button text.</p>
      </ConfirmationDialogContent>
    </Dialog>
  ),
};
