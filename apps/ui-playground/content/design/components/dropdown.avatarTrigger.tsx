"use client";

import { Avatar } from "@calcom/ui/components/avatar";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { RenderComponentWithSnippet } from "@/app/components/render";

export const AvatarTriggerExample: React.FC = () => (
  <RenderComponentWithSnippet>
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
  </RenderComponentWithSnippet>
);
