"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import type { IconName } from "@calcom/ui";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownItem,
  DropdownMenuLabel,
} from "@calcom/ui/components/dropdown";

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

export const ButtonTriggerExample: React.FC = () => (
  <RenderComponentWithSnippet>
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
  </RenderComponentWithSnippet>
);
