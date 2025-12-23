import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

const meta = {
  component: Popover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <h4 className="font-medium">Popover Title</h4>
          <p className="text-subtle text-sm">
            This is a popover with some content inside.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignStart: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Align Start</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="text-sm">Aligned to the start of the trigger.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Align End</Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <p className="text-sm">Aligned to the end of the trigger.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary">Edit Name</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              type="text"
              className="border-default bg-default w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter your name"
              defaultValue="John Doe"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button color="minimal" size="sm">Cancel</Button>
            <Button size="sm">Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const InfoPopover: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-subtle hover:text-emphasis">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="text-sm">
          This setting controls how your availability is displayed to guests booking appointments.
        </p>
      </PopoverContent>
    </Popover>
  ),
};

export const FilterPopover: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary" StartIcon="filter">
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Filter Bookings</h4>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select className="border-default bg-default w-full rounded-md border px-3 py-2 text-sm">
              <option>All statuses</option>
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Type</label>
            <select className="border-default bg-default w-full rounded-md border px-3 py-2 text-sm">
              <option>All event types</option>
              <option>30 Minute Meeting</option>
              <option>60 Minute Meeting</option>
              <option>Discovery Call</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button color="minimal" size="sm">Clear</Button>
            <Button size="sm">Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const SettingsPopover: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="icon" color="minimal" StartIcon="settings" />
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-1">
          <button className="hover:bg-subtle w-full rounded-md px-2 py-1.5 text-left text-sm">
            Edit settings
          </button>
          <button className="hover:bg-subtle w-full rounded-md px-2 py-1.5 text-left text-sm">
            Duplicate
          </button>
          <button className="hover:bg-subtle w-full rounded-md px-2 py-1.5 text-left text-sm">
            Export
          </button>
          <hr className="border-subtle my-1" />
          <button className="hover:bg-subtle text-error w-full rounded-md px-2 py-1.5 text-left text-sm">
            Delete
          </button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
