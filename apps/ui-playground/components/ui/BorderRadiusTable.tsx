"use client";

import React from "react";
import { Toaster } from "react-hot-toast";

import { showToast } from "@calcom/ui/components/toast";

interface BorderRadiusToken {
  name: string;
  value: string;
  className: string;
}

interface BorderRadiusTableProps {
  tokens: BorderRadiusToken[];
}

const tokens: BorderRadiusToken[] = [
  { name: "None", value: "0px", className: "rounded-none" },
  { name: "Small", value: "0.125rem", className: "rounded-sm" },
  { name: "Default", value: "0.25rem", className: "rounded" },
  { name: "Medium", value: "0.375rem", className: "rounded-md" },
  { name: "Large", value: "0.5rem", className: "rounded-lg" },
  { name: "XLarge", value: "0.75rem", className: "rounded-xl" },
  { name: "2XLarge", value: "1rem", className: "rounded-2xl" },
  { name: "3XLarge", value: "1.5rem", className: "rounded-3xl" },
  { name: "Full", value: "9999px", className: "rounded-full" },
];

export const BorderRadiusTable: React.FC<BorderRadiusTableProps> = () => {
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.map((token) => (
          <div
            key={token.name}
            onClick={() => handleCopy(token.className)}
            className="border-subtle bg-default hover:bg-subtle group relative cursor-pointer overflow-hidden rounded-lg border p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emphasis text-sm font-medium">{token.name}</p>
                  <p className="text-subtle mt-1 text-xs">{token.className}</p>
                </div>
                <p className="text-subtle text-sm">{token.value}</p>
              </div>
              <div className={`bg-emphasis h-16 w-full ${token.className}`} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
