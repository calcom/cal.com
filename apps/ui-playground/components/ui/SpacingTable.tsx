"use client";

import React from "react";
import { Toaster } from "react-hot-toast";

interface SpacingToken {
  name: string;
  value: string;
  pixels: string;
}

interface SpacingTableProps {
  tokens: SpacingToken[];
}

export const SpacingTable: React.FC<SpacingTableProps> = ({ tokens }) => {
  return (
    <>
      <Toaster position="bottom-right" />
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {tokens.map((token, index) => (
            <div
              key={index}
              className="border-subtle bg-default group relative overflow-hidden rounded-lg border">
              <div className="flex items-center gap-4 p-4">
                <div className="w-[100px] space-y-1">
                  <p className="text-emphasis text-sm font-medium">
                    {token.name === "px" ? "px" : `${token.name} (${token.pixels})`}
                  </p>
                </div>
                <div className="bg-subtle relative h-8 rounded">
                  <div
                    className="absolute left-0 top-1/2 h-2 -translate-y-1/2 bg-red-500"
                    style={{ width: token.pixels }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
