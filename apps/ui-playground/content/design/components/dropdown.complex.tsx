"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@calcom/ui/components/dropdown";

export const ComplexExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="flex flex-wrap items-center gap-8">
      {/* Example 1: Complex Menu Structure */}
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
        <span className="text-subtle text-xs">Complex Menu</span>
      </div>

      {/* Example 2: Avatar with Icons */}
      <div className="flex flex-col items-center gap-2">
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
        <span className="text-subtle text-xs">With Icons</span>
      </div>

      {/* Example 3: Simple Actions */}
      <div className="flex flex-col items-center gap-2">
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button variant="icon" color="secondary" StartIcon="calendar" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownItem>Rename</DropdownItem>
            <DropdownItem>Duplicate</DropdownItem>
            <DropdownItem>Move</DropdownItem>
            <DropdownItem color="destructive">Delete</DropdownItem>
          </DropdownMenuContent>
        </Dropdown>
        <span className="text-subtle text-xs">Simple Actions</span>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
