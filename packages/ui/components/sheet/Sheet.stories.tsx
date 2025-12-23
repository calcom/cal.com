import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "../button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";

const meta = {
  component: Sheet,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>This is a description of what this sheet contains.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p className="text-subtle text-sm">
            This is the main content area of the sheet. You can put any content here including forms,
            lists, or detailed information.
          </p>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button color="minimal">Cancel</Button>
          </SheetClose>
          <Button>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Edit Profile</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>Update your personal information and preferences.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm"
                defaultValue="John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm"
                defaultValue="john@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bio</label>
              <textarea
                className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                defaultValue="Product designer passionate about user experience."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <select className="border-default bg-default text-default mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option>America/New_York</option>
                <option>America/Los_Angeles</option>
                <option>Europe/London</option>
                <option>Asia/Tokyo</option>
              </select>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button color="minimal">Cancel</Button>
          </SheetClose>
          <Button>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const WithoutCloseButton: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader showCloseButton={false}>
          <SheetTitle>No Close Button</SheetTitle>
          <SheetDescription>This header does not show the close button.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p className="text-subtle text-sm">Use the footer buttons to close this sheet.</p>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button color="minimal">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const HideOverlay: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open Without Overlay</Button>
      </SheetTrigger>
      <SheetContent hideOverlay>
        <SheetHeader>
          <SheetTitle>No Overlay</SheetTitle>
          <SheetDescription>This sheet appears without a backdrop overlay.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p className="text-subtle text-sm">
            You can still interact with content behind this sheet.
          </p>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>View Details</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Event Details</SheetTitle>
          <SheetDescription>Complete information about this event type.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-6">
            <section>
              <h3 className="text-emphasis font-semibold mb-2">Description</h3>
              <p className="text-subtle text-sm">
                A 30-minute introductory call to discuss your project requirements and how we can
                help. We&apos;ll cover the basics and answer any questions you might have about our
                services.
              </p>
            </section>
            <section>
              <h3 className="text-emphasis font-semibold mb-2">Duration</h3>
              <p className="text-subtle text-sm">30 minutes</p>
            </section>
            <section>
              <h3 className="text-emphasis font-semibold mb-2">Location</h3>
              <p className="text-subtle text-sm">Google Meet (link will be provided upon booking)</p>
            </section>
            <section>
              <h3 className="text-emphasis font-semibold mb-2">Availability</h3>
              <ul className="text-subtle text-sm space-y-1">
                <li>Monday - Friday: 9:00 AM - 5:00 PM</li>
                <li>Saturday: 10:00 AM - 2:00 PM</li>
                <li>Sunday: Closed</li>
              </ul>
            </section>
            <section>
              <h3 className="text-emphasis font-semibold mb-2">Additional Information</h3>
              <p className="text-subtle text-sm">
                Please come prepared with any questions or materials you&apos;d like to discuss. A
                calendar invite with the meeting link will be sent to your email address after
                booking.
              </p>
            </section>
            <section>
              <h3 className="text-emphasis font-semibold mb-2">Cancellation Policy</h3>
              <p className="text-subtle text-sm">
                You can cancel or reschedule up to 24 hours before the scheduled time. Late
                cancellations may result in a fee.
              </p>
            </section>
          </div>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button color="minimal">Close</Button>
          </SheetClose>
          <Button>Book Now</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const Controlled: Story = {
  render: function ControlledSheet() {
    const [open, setOpen] = useState(false);

    return (
      <div className="space-y-4">
        <p className="text-sm">Sheet is {open ? "open" : "closed"}</p>
        <Button onClick={() => setOpen(true)}>Open Controlled Sheet</Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Controlled Sheet</SheetTitle>
              <SheetDescription>This sheet is controlled by React state.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <p className="text-subtle text-sm">
                You can control the open state programmatically.
              </p>
            </SheetBody>
            <SheetFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    );
  },
};

export const SettingsPanel: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button color="secondary" StartIcon="settings">
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Event Settings</SheetTitle>
          <SheetDescription>Configure how this event type behaves.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require confirmation</p>
                <p className="text-subtle text-xs">Bookings need to be manually confirmed</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable buffer time</p>
                <p className="text-subtle text-xs">Add time before and after meetings</p>
              </div>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide from public page</p>
                <p className="text-subtle text-xs">Only accessible via direct link</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Limit future bookings</p>
                <p className="text-subtle text-xs">Set a maximum date range</p>
              </div>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button color="minimal">Cancel</Button>
          </SheetClose>
          <Button>Save Settings</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
