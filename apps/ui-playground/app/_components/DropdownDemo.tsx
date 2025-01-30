"use client";

import { useState } from "react";

import type { IconName } from "@calcom/ui";
import { Avatar } from "@calcom/ui";
import { Button } from "@calcom/ui";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@calcom/ui/dropdown";

export default function DropdownDemo() {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { label: "View", icon: "eye", kbd: "V" },
    { label: "Edit", icon: "edit", kbd: "E" },
    { label: "Share", icon: "share", kbd: "⌘S" },
    { label: "Delete", icon: "trash", destructive: true, kbd: "⌘⌫" },
  ] as {
    label: string;
    icon: IconName;
    destructive?: boolean;
    kbd?: string;
  }[];

  return (
    <div className="border-subtle bg-default rounded-lg border p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-emphasis flex w-full items-center justify-between rounded-md py-2 text-lg font-semibold">
        <span>Dropdown</span>
        <span className="text-subtle">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="space-y-8 pt-4">
          {/* Button Trigger */}
          <section id="dropdown-button">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Button Trigger</h2>
            <div className="flex flex-wrap items-center gap-8">
              {/* Default Button */}
              <div className="flex flex-col items-center gap-2">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button>Menu</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {menuItems.map((item) => (
                      <DropdownItem color={item.destructive ? "destructive" : "secondary"} key={item.label}>
                        {item.label}
                      </DropdownItem>
                    ))}
                  </DropdownMenuContent>
                </Dropdown>
                <span className="text-subtle text-xs">Default</span>
              </div>

              {/* Button with Icon */}
              <div className="flex flex-col items-center gap-2">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button>More Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    {menuItems.map((item) => (
                      <DropdownItem key={item.label} color={item.destructive ? "destructive" : undefined}>
                        {item.label}
                      </DropdownItem>
                    ))}
                  </DropdownMenuContent>
                </Dropdown>
                <span className="text-subtle text-xs">With Icon</span>
              </div>

              {/* Icon Button */}
              <div className="flex flex-col items-center gap-2">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button variant="icon" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {menuItems.map((item) => (
                      <DropdownItem key={item.label} color={item.destructive ? "destructive" : undefined}>
                        {item.label}
                      </DropdownItem>
                    ))}
                  </DropdownMenuContent>
                </Dropdown>
                <span className="text-subtle text-xs">Icon Only</span>
              </div>
            </div>
          </section>

          {/* Avatar Trigger */}
          <section id="dropdown-avatar">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Avatar Trigger</h2>
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer">
                      <Avatar
                        size="sm"
                        imageSrc="https://cal.com/stakeholder/peer.jpg"
                        alt="Avatar"
                        className="h-8 w-8"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Profile</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownItem>View Profile</DropdownItem>
                    <DropdownItem>Settings</DropdownItem>
                    <DropdownMenuSeparator />
                    <DropdownItem className="text-error">Sign out</DropdownItem>
                  </DropdownMenuContent>
                </Dropdown>
                <span className="text-subtle text-xs">Avatar Menu</span>
              </div>
            </div>
          </section>

          <section id="dropdown-examples">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Dropdown Examples</h2>
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button color="secondary">Open</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>My account</DropdownMenuLabel>
                    <DropdownItem>Profile</DropdownItem>
                    <DropdownItem>Billing</DropdownItem>
                    <DropdownItem>Settings</DropdownItem>
                    <DropdownItem>Keyboard Shortcuts</DropdownItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Team</DropdownMenuLabel>
                    <DropdownItem>Invite users</DropdownItem>
                    <DropdownItem>New team</DropdownItem>
                    <DropdownMenuSeparator />
                    <DropdownItem>Github</DropdownItem>
                    <DropdownItem>Support</DropdownItem>
                    <DropdownItem>API</DropdownItem>
                  </DropdownMenuContent>
                </Dropdown>
              </div>
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer">
                    <Avatar size="md" imageSrc="https://cal.com/stakeholder/peer.jpg" alt="Avatar" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>peer@cal.com</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownItem>My account</DropdownItem>
                  <DropdownItem>Plan</DropdownItem>
                  <DropdownItem>Billing</DropdownItem>
                  <DropdownItem>Integrations</DropdownItem>
                  <DropdownItem>Module</DropdownItem>
                  <DropdownMenuSeparator />
                  <DropdownItem className="text-error">Log out</DropdownItem>
                </DropdownMenuContent>
              </Dropdown>

              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer">
                    <Button variant="icon" color="secondary" StartIcon="menu" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownItem>Rename</DropdownItem>
                  <DropdownItem>Duplicate</DropdownItem>
                  <DropdownItem>Move</DropdownItem>
                  <DropdownItem color="destructive">Delete</DropdownItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
