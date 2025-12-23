import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "../button";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "./Dropdown";

const meta = {
  component: Dropdown,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="secondary" EndIcon="chevron-down">
          Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <DropdownItem StartIcon="user">Profile</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="settings">Settings</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="calendar">Calendar</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownItem StartIcon="log-out" color="destructive">
            Sign out
          </DropdownItem>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </Dropdown>
  ),
};

export const WithLabels: Story = {
  render: () => (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="secondary" EndIcon="chevron-down">
          My Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem>
          <DropdownItem StartIcon="user">Profile</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="credit-card">Billing</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="settings">Settings</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Team</DropdownMenuLabel>
        <DropdownMenuItem>
          <DropdownItem StartIcon="users">Members</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="plus">Invite</DropdownItem>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </Dropdown>
  ),
};

export const WithCheckboxItems: Story = {
  render: function CheckboxDropdown() {
    const [showEmail, setShowEmail] = useState(true);
    const [showPhone, setShowPhone] = useState(false);
    const [showLocation, setShowLocation] = useState(true);

    return (
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button color="secondary" EndIcon="chevron-down">
            Display Options
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Show fields</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={showEmail} onCheckedChange={setShowEmail}>
            Email address
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={showPhone} onCheckedChange={setShowPhone}>
            Phone number
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={showLocation} onCheckedChange={setShowLocation}>
            Location
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </Dropdown>
    );
  },
};

export const ActionsMenu: Story = {
  render: () => (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="minimal" StartIcon="ellipsis" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <DropdownItem StartIcon="pencil">Edit</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="copy">Duplicate</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="link">Copy link</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownItem StartIcon="archive">Archive</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="trash" color="destructive">
            Delete
          </DropdownItem>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </Dropdown>
  ),
};

export const WithKeyboardShortcuts: Story = {
  render: () => (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="secondary" EndIcon="chevron-down">
          Edit
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <DropdownItem StartIcon="scissors">Cut</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="copy">Copy</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="clipboard">Paste</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownItem StartIcon="undo">Undo</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="redo">Redo</DropdownItem>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </Dropdown>
  ),
};

export const UserMenu: Story = {
  render: () => (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 hover:bg-subtle">
          <div className="h-8 w-8 rounded-full bg-brand-default flex items-center justify-center text-white text-sm font-medium">
            JD
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">John Doe</p>
          <p className="text-xs text-subtle">john@example.com</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownItem StartIcon="user">Your Profile</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="settings">Settings</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DropdownItem StartIcon="help-circle">Help & Support</DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownItem StartIcon="log-out" color="destructive">
            Sign out
          </DropdownItem>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </Dropdown>
  ),
};
