"use client";

import React from "react";
import { Toaster } from "react-hot-toast";

import { showToast } from "@calcom/ui/components/toast";

interface TypographyStyle {
  name: string;
  className: string;
  specs: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    weight: string;
  };
  category?: string;
}

interface TypographySection {
  title: string;
  description?: string;
  styles: TypographyStyle[];
}

interface TypographyTableProps {
  sections: TypographySection[];
}

interface CopyMenuProps {
  style: TypographyStyle;
  onCopy: (format: string) => void;
}

const CopyMenu: React.FC<CopyMenuProps> = ({ style, onCopy }) => {
  return (
    <div className="absolute inset-2 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
      <div className="bg-default space-y-1 rounded-md p-2 shadow-lg">
        <button
          onClick={() => onCopy(style.className)}
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy Tailwind Class
        </button>
        <button
          onClick={() =>
            onCopy(`font-family: ${style.specs.fontFamily};
font-size: ${style.specs.fontSize}px;
line-height: ${style.specs.lineHeight};
font-weight: ${style.specs.weight};`)
          }
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy CSS
        </button>
      </div>
    </div>
  );
};

export const TypographyTable: React.FC<TypographyTableProps> = ({ sections }) => {
  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Copied to clipboard`, "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      showToast("Failed to copy", "error");
    }
  };

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="space-y-12">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-6">
            <div>
              <h3 className="text-emphasis text-2xl font-semibold">{section.title}</h3>
              {section.description && <p className="text-subtle mt-2 text-base">{section.description}</p>}
            </div>
            <div className="grid gap-6">
              {section.styles.map((style, styleIndex) => (
                <div
                  key={styleIndex}
                  className="border-subtle bg-default group relative overflow-hidden rounded-lg border p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-4">
                      <div>
                        <p className="text-emphasis text-sm font-medium">{style.name}</p>
                        <p className="text-subtle mt-1 text-xs">{style.className}</p>
                      </div>
                      <div className={style.className}>The quick brown fox jumps over the lazy dog</div>
                    </div>
                    <div className="text-subtle space-y-2 text-sm">
                      <p>Font: {style.specs.fontFamily}</p>
                      <p>Size: {style.specs.fontSize}px</p>
                      <p>Line Height: {style.specs.lineHeight}</p>
                      <p>Weight: {style.specs.weight}</p>
                    </div>
                  </div>
                  <CopyMenu style={style} onCopy={handleCopy} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
