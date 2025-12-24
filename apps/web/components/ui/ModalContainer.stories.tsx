import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";

import ModalContainer from "./ModalContainer";

const meta = {
  component: ModalContainer,
  title: "Web/UI/ModalContainer",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ModalContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-screen w-full">
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <ModalContainer isOpen={isOpen} onExit={() => setIsOpen(false)}>
          <div className="p-6">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Modal Title</h2>
            <p className="text-default mb-4">
              This is the modal content. You can put any content here.
            </p>
            <div className="flex justify-end gap-2">
              <Button color="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </div>
          </div>
        </ModalContainer>
      </div>
    );
  },
};

export const Wide: Story = {
  render: function WideStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-screen w-full">
        <Button onClick={() => setIsOpen(true)}>Open Wide Modal</Button>
        <ModalContainer isOpen={isOpen} onExit={() => setIsOpen(false)} wide>
          <div className="p-6">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Wide Modal</h2>
            <p className="text-default mb-4">
              This is a wide modal that can contain more content side by side.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-subtle rounded-md p-4">
                <h3 className="font-medium">Left Column</h3>
                <p className="text-subtle text-sm">Some content here</p>
              </div>
              <div className="bg-subtle rounded-md p-4">
                <h3 className="font-medium">Right Column</h3>
                <p className="text-subtle text-sm">Some content here</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button color="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </div>
          </div>
        </ModalContainer>
      </div>
    );
  },
};

export const Scrollable: Story = {
  render: function ScrollableStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-screen w-full">
        <Button onClick={() => setIsOpen(true)}>Open Scrollable Modal</Button>
        <ModalContainer isOpen={isOpen} onExit={() => setIsOpen(false)} scroll>
          <div className="p-6 max-h-96">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Scrollable Content</h2>
            {Array.from({ length: 20 }).map((_, i) => (
              <p key={i} className="text-default mb-2">
                This is paragraph {i + 1}. The modal content is scrollable when it exceeds the container height.
              </p>
            ))}
            <div className="flex justify-end gap-2 mt-4 sticky bottom-0 bg-default py-2">
              <Button color="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </div>
          </div>
        </ModalContainer>
      </div>
    );
  },
};

export const NoPadding: Story = {
  render: function NoPaddingStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-screen w-full">
        <Button onClick={() => setIsOpen(true)}>Open No Padding Modal</Button>
        <ModalContainer isOpen={isOpen} onExit={() => setIsOpen(false)} noPadding>
          <div className="bg-emphasis p-8 text-center">
            <h2 className="text-emphasis mb-2 text-lg font-semibold">Full Width Header</h2>
            <p className="text-subtle">This modal has no padding for custom layouts</p>
          </div>
          <div className="p-6">
            <p className="text-default mb-4">Content with custom padding applied manually.</p>
            <div className="flex justify-end gap-2">
              <Button color="secondary" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </ModalContainer>
      </div>
    );
  },
};

export const FormModal: Story = {
  render: function FormModalStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-screen w-full">
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <ModalContainer isOpen={isOpen} onExit={() => setIsOpen(false)}>
          <form className="p-6">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Edit Profile</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-default block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="border-default bg-default w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-default block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="border-default bg-default w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-default block text-sm font-medium mb-1">Bio</label>
                <textarea
                  className="border-default bg-default w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Tell us about yourself"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" color="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </ModalContainer>
      </div>
    );
  },
};

export const ConfirmationModal: Story = {
  render: function ConfirmationModalStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-screen w-full">
        <Button onClick={() => setIsOpen(true)}>Open Confirmation</Button>
        <ModalContainer isOpen={isOpen} onExit={() => setIsOpen(false)}>
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-emphasis mb-2 text-lg font-semibold">Delete Event Type?</h2>
            <p className="text-subtle mb-6 text-sm">
              This action cannot be undone. All associated bookings will be cancelled.
            </p>
            <div className="flex justify-center gap-2">
              <Button color="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button color="destructive" onClick={() => setIsOpen(false)}>
                Delete
              </Button>
            </div>
          </div>
        </ModalContainer>
      </div>
    );
  },
};
