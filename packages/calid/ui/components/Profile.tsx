"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@calid/features/ui/components/dropdown-menu";
import { useState } from "react";

import { Icon } from "@calcom/ui/components/icon";

// adjust path based on your structure

const Profile = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHelpOptions, setShowHelpOptions] = useState(false);

  const handleHelpClick = (action: string) => {
    switch (action) {
      case "docs":
        window.open("https://docs.cal.id", "_blank");
        break;
      case "contact":
        window.location.href = "mailto:support@cal.id";
        break;
    }
  };

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(isOpen) => {
        setMenuOpen(isOpen);
        if (!isOpen) {
          setShowHelpOptions(false);
        }
      }}>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center space-x-3 rounded-lg transition-colors">
          <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-full">
            <span className="text-primary-foreground text-xs font-medium">SY</span>
          </div>
          <span className="text-foreground text-sm font-medium">Sanskar Yadav</span>
          <Icon
            name="chevron-down"
            className={`ml-auto h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-48 bg-white">
        <DropdownMenuItem onClick={() => (window.location.href = "/settings/profile")}>
          <Icon name="user" className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (window.location.href = "/settings/out-of-office")}>
          <Icon name="moon" className="mr-2 h-4 w-4" />
          Out of Office
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open("https://roadmap.onehash.ai/", "_blank")}>
          <Icon name="map-pin" className="mr-2 h-4 w-4" />
          Roadmap
        </DropdownMenuItem>
        <div
          onClick={(e) => {
            e.stopPropagation(); // <-- Prevent menu from closing
            setShowHelpOptions((prev) => !prev);
          }}
          className="hover:bg-muted flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm">
          <Icon name="circle-help" className="mr-2 h-4 w-4" />
          Help & Support
          <Icon
            name="chevron-down"
            className={`ml-auto h-4 w-4 transition-transform ${showHelpOptions ? "rotate-180" : ""}`}
          />
        </div>
        {showHelpOptions && (
          <>
            <DropdownMenuItem onClick={() => handleHelpClick("docs")}>
              <Icon name="file" className="mr-2 h-4 w-4" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleHelpClick("contact")}>
              <Icon name="mail" className="mr-2 h-4 w-4" />
              Contact Us
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => (window.location.href = "/settings")}>
          <Icon name="settings" className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="">
          <Icon name="log-out" className=" mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { Profile };
