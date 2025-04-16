"use client";

import { getColorFormats, copyToClipboard } from "@/lib/colorUtils";
import React from "react";
import { Toaster } from "react-hot-toast";

import { showToast } from "@calcom/ui/components/toast";

interface ColorSwatch {
  name: string;
  value: string;
  className: string;
}

interface ColorSection {
  title: string;
  description?: string;
  colors: ColorSwatch[];
}

interface TypeTableProps {
  sections: ColorSection[];
}

interface CopyMenuProps {
  color: string;
  className: string;
  onCopy: (format: string) => void;
}

const CopyMenu: React.FC<CopyMenuProps> = ({ color, className, onCopy }) => {
  const formats = getColorFormats(color, className);
  if (!formats) return null;

  return (
    <div className="absolute inset-2 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
      <div className="bg-default space-y-1 rounded-md p-2 shadow-lg">
        <button
          onClick={() => onCopy(formats.hex)}
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy as HEX
        </button>
        <button
          onClick={() => onCopy(formats.rgb)}
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy as RGB
        </button>
        <button
          onClick={() => onCopy(formats.hsl)}
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy as HSL
        </button>
        <button
          onClick={() => onCopy(formats.tailwind)}
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy Tailwind Class
        </button>
      </div>
    </div>
  );
};

export const TypeTable: React.FC<TypeTableProps> = ({ sections }) => {
  const handleCopy = async (colorValue: string) => {
    try {
      await copyToClipboard(colorValue);
      showToast(`Copied ${colorValue}`, "success");
    } catch (error) {
      console.error("Failed to copy color:", error);
      showToast("Failed to copy color", "error");
    }
  };

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="space-y-8">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            <div>
              <h3 className="text-emphasis text-lg font-semibold">{section.title}</h3>
              {section.description && <p className="text-subtle text-sm">{section.description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {section.colors.map((color, colorIndex) => (
                <div key={colorIndex} className="border-subtle bg-default overflow-hidden rounded-lg border">
                  <div className="group relative">
                    <div className={`h-36 w-full ${color.className}`} title={color.value} />
                    <CopyMenu color={color.value} className={color.className} onCopy={handleCopy} />
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="text-emphasis text-sm font-medium">{color.name}</p>
                    <p className="text-subtle text-xs">{color.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
