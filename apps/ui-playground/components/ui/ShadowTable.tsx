"use client";

import React from "react";
import { Toaster } from "react-hot-toast";

import { showToast } from "@calcom/ui/components/toast";

interface ShadowToken {
  name: string;
  className: string;
  description: string;
}

interface ShadowTableProps {
  tokens: ShadowToken[];
}

const tokens: ShadowToken[] = [
  {
    name: "Dropdown",
    className: "shadow-dropdown",
    description: "Used for dropdown menus and popovers",
  },
  {
    name: "Solid Gray Rested",
    className: "shadow-solid-gray-rested",
    description: "Default state for solid gray buttons",
  },
  {
    name: "Solid Gray Hover",
    className: "shadow-solid-gray-hover",
    description: "Hover state for solid gray buttons",
  },
  {
    name: "Solid Gray Active",
    className: "shadow-solid-gray-active",
    description: "Active/pressed state for solid gray buttons",
  },
  {
    name: "Outline Gray Rested",
    className: "shadow-outline-gray-rested",
    description: "Default state for outline gray buttons",
  },
  {
    name: "Outline Gray Hover",
    className: "shadow-outline-gray-hover",
    description: "Hover state for outline gray buttons",
  },
  {
    name: "Outline Gray Active",
    className: "shadow-outline-gray-active",
    description: "Active/pressed state for outline gray buttons",
  },
  {
    name: "Outline Red Rested",
    className: "shadow-outline-red-rested",
    description: "Default state for outline red buttons",
  },
  {
    name: "Outline Red Hover",
    className: "shadow-outline-red-hover",
    description: "Hover state for outline red buttons",
  },
  {
    name: "Outline Red Active",
    className: "shadow-outline-red-active",
    description: "Active/pressed state for outline red buttons",
  },
  {
    name: "Elevation Low",
    className: "shadow-elevation-low",
    description: "Subtle elevation for UI elements",
  },
  {
    name: "Button Solid Brand Default",
    className: "shadow-button-solid-brand-default",
    description: "Default state for solid brand buttons",
  },
  {
    name: "Button Solid Brand Hover",
    className: "shadow-button-solid-brand-hover",
    description: "Hover state for solid brand buttons",
  },
  {
    name: "Button Solid Brand Active",
    className: "shadow-button-solid-brand-active",
    description: "Active/pressed state for solid brand buttons",
  },
];

export const ShadowTable: React.FC<ShadowTableProps> = () => {
  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Copied ${value}`, "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      showToast("Failed to copy", "error");
    }
  };

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tokens.map((token) => (
          <div
            key={token.name}
            onClick={() => handleCopy(token.className)}
            className="group relative cursor-pointer">
            <div
              className={`border-subtle bg-default hover:bg-subtle relative overflow-hidden rounded-lg border p-4 transition-colors ${token.className}`}>
              <div className="space-y-2">
                <div>
                  <p className="text-emphasis text-sm font-medium">{token.name}</p>
                  <p className="text-subtle mt-1 text-xs">{token.className}</p>
                </div>
                <p className="text-subtle text-sm">{token.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
