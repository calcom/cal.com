"use client";

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

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function DropdownDemo() {
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
    <DemoSection title="Dropdown">
      {/* Button Trigger */}
      <DemoSubSection id="dropdown-button" title="Button Trigger">
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
                <Button variant="icon" StartIcon="calendar" />
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
      </DemoSubSection>

      {/* Avatar Trigger */}
      <DemoSubSection id="dropdown-avatar" title="Avatar Trigger">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Dropdown>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer">
                  <Avatar size="sm" imageSrc="https://cal.com/stakeholder/peer.jpg" alt="Avatar" />
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
      </DemoSubSection>

      {/* More Examples */}
      <DemoSubSection id="dropdown-examples" title="More Examples">
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
              <DropdownItem StartIcon="user">My account</DropdownItem>
              <DropdownItem StartIcon="map">Plan</DropdownItem>
              <DropdownItem StartIcon="credit-card">Billing</DropdownItem>
              <DropdownItem StartIcon="link">Integrations</DropdownItem>
              <DropdownItem StartIcon="upload">Module</DropdownItem>
              <DropdownMenuSeparator />
              <DropdownItem className="text-error" StartIcon="log-out">
                Log out
              </DropdownItem>
            </DropdownMenuContent>
          </Dropdown>

          <Dropdown>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer">
                <Button variant="icon" color="secondary" StartIcon="calendar" />
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
      </DemoSubSection>
    </DemoSection>
  );
}
