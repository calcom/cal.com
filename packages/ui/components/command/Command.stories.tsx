import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "../button";
import { Icon } from "../icon";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./Command";

const meta = {
  component: Command,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="border-subtle w-[350px] rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <Icon name="calendar" className="mr-2 h-4 w-4" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <Icon name="search" className="mr-2 h-4 w-4" />
            <span>Search</span>
          </CommandItem>
          <CommandItem>
            <Icon name="zap" className="mr-2 h-4 w-4" />
            <span>Quick Actions</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <Icon name="user" className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="credit-card" className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="settings" className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const WithDialog: Story = {
  render: function DialogStory() {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>
          Open Command Palette
          <span className="text-muted ml-2 text-xs">⌘K</span>
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="plus" className="mr-2 h-4 w-4" />
                <span>Create Event Type</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="calendar" className="mr-2 h-4 w-4" />
                <span>View Calendar</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="users" className="mr-2 h-4 w-4" />
                <span>Manage Team</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="layout-dashboard" className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
                <CommandShortcut>⌘D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="book-open" className="mr-2 h-4 w-4" />
                <span>Bookings</span>
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="settings" className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <CommandShortcut>⌘,</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  },
};

export const SearchOnly: Story = {
  render: () => (
    <Command className="border-subtle w-[350px] rounded-lg border shadow-md">
      <CommandInput placeholder="Search event types..." />
      <CommandList>
        <CommandEmpty>No event types found.</CommandEmpty>
        <CommandGroup>
          <CommandItem>
            <Icon name="video" className="mr-2 h-4 w-4" />
            <span>30 Minute Meeting</span>
          </CommandItem>
          <CommandItem>
            <Icon name="video" className="mr-2 h-4 w-4" />
            <span>60 Minute Meeting</span>
          </CommandItem>
          <CommandItem>
            <Icon name="phone" className="mr-2 h-4 w-4" />
            <span>Discovery Call</span>
          </CommandItem>
          <CommandItem>
            <Icon name="users" className="mr-2 h-4 w-4" />
            <span>Team Meeting</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const WithShortcuts: Story = {
  render: () => (
    <Command className="border-subtle w-[350px] rounded-lg border shadow-md">
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem>
            <Icon name="copy" className="mr-2 h-4 w-4" />
            <span>Copy</span>
            <CommandShortcut>⌘C</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="clipboard" className="mr-2 h-4 w-4" />
            <span>Paste</span>
            <CommandShortcut>⌘V</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="trash" className="mr-2 h-4 w-4" />
            <span>Delete</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Edit">
          <CommandItem>
            <Icon name="rotate-ccw" className="mr-2 h-4 w-4" />
            <span>Undo</span>
            <CommandShortcut>⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="rotate-cw" className="mr-2 h-4 w-4" />
            <span>Redo</span>
            <CommandShortcut>⇧⌘Z</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const MultipleGroups: Story = {
  render: () => (
    <Command className="border-subtle w-[350px] rounded-lg border shadow-md">
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Event Types">
          <CommandItem>30 Minute Meeting</CommandItem>
          <CommandItem>60 Minute Meeting</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Team Members">
          <CommandItem>John Doe</CommandItem>
          <CommandItem>Jane Smith</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Integrations">
          <CommandItem>Google Calendar</CommandItem>
          <CommandItem>Zoom</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
