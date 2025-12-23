import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "../button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger, DialogClose } from "./Dialog";

const meta = {
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent
        title="Dialog Title"
        description="This is a description of the dialog that provides context."
        type="creation"
        enableOverflow>
        <p className="text-subtle text-sm">
          This is the main content area of the dialog. You can put forms, information, or any other content here.
        </p>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Confirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button color="destructive">Delete Item</Button>
      </DialogTrigger>
      <DialogContent
        type="confirmation"
        title="Delete this item?"
        description="This action cannot be undone. This will permanently delete this item from your account."
        Icon="trash"
        enableOverflow>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button color="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Event</Button>
      </DialogTrigger>
      <DialogContent
        title="Create New Event"
        description="Fill out the details for your new event type."
        enableOverflow>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Event Name</label>
            <input
              type="text"
              className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="30 Minute Meeting"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Duration</label>
            <select className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>60 minutes</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              placeholder="A quick chat to discuss..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button>Create Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button color="secondary">Default Size</Button>
        </DialogTrigger>
        <DialogContent title="Default Size Dialog" size="default" enableOverflow>
          <p className="text-subtle text-sm">This is the default size dialog (sm:max-w-140).</p>
          <DialogFooter>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button color="secondary">Medium</Button>
        </DialogTrigger>
        <DialogContent title="Medium Dialog" size="md" enableOverflow>
          <p className="text-subtle text-sm">This is a medium size dialog (sm:max-w-3xl).</p>
          <DialogFooter>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button color="secondary">Large</Button>
        </DialogTrigger>
        <DialogContent title="Large Dialog" size="lg" enableOverflow>
          <p className="text-subtle text-sm">This is a large size dialog (sm:max-w-280).</p>
          <DialogFooter>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button color="secondary">Extra Large</Button>
        </DialogTrigger>
        <DialogContent title="Extra Large Dialog" size="xl" enableOverflow>
          <p className="text-subtle text-sm">This is an extra large dialog (sm:max-w-360).</p>
          <DialogFooter>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledDialog() {
    const [open, setOpen] = useState(false);

    return (
      <div className="space-y-4">
        <p className="text-sm">Dialog is {open ? "open" : "closed"}</p>
        <Button onClick={() => setOpen(true)}>Open Controlled Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            title="Controlled Dialog"
            description="This dialog is controlled by React state."
            enableOverflow>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};

export const PreventClose: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open (Cannot Click Outside)</Button>
      </DialogTrigger>
      <DialogContent
        title="Important Action"
        description="This dialog cannot be closed by clicking outside."
        preventCloseOnOutsideClick
        enableOverflow>
        <p className="text-subtle text-sm">You must use the buttons below to close this dialog.</p>
        <DialogFooter>
          <DialogClose>I understand</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
