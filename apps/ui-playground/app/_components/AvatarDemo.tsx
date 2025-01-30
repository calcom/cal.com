"use client";

import { useState } from "react";

import { Avatar } from "@calcom/ui";

export default function AvatarDemo() {
  const [isOpen, setIsOpen] = useState(true);
  const sizes = ["xs", "xsm", "sm", "md", "mdLg", "lg", "xl"] as const;
  const sampleImage = "https://app.cal.com/api/avatar/e9f012f2-8516-4012-b967-6fe1844a7b40.png";

  return (
    <div className="border-subtle bg-default rounded-lg border p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md py-2 text-lg font-semibold hover:text-gray-600">
        <span>Avatar</span>
        <span className="text-subtle">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="space-y-8 pt-4">
          {/* Size variations */}
          <section id="avatar-sizes">
            <h2 className="mb-4 text-lg font-semibold">Size Variations</h2>
            <div className="flex items-center gap-4">
              {sizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Avatar size={size} alt={`${size} avatar`} imageSrc={sampleImage} />
                  <span className="text-xs text-gray-500">{size}</span>
                </div>
              ))}
            </div>
          </section>

          {/* With and without image */}
          <section id="avatar-images">
            <h2 className="mb-4 text-lg font-semibold">With/Without Image</h2>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Avatar size="md" alt="With image" imageSrc={sampleImage} />
                <span className="text-xs text-gray-500">With Image</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar size="md" alt="Without image" imageSrc="https://cal.com/avatar.svg" />
                <span className="text-xs text-gray-500">Without Image</span>
              </div>
            </div>
          </section>

          {/* With tooltip */}
          <section id="avatar-tooltip">
            <h2 className="mb-4 text-lg font-semibold">With Tooltip</h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Avatar size="md" alt="With tooltip" imageSrc={sampleImage} title="Hover me!" />
                <span className="text-xs text-gray-500">Hover to see tooltip</span>
              </div>
            </div>
          </section>

          {/* With link */}
          <section id="avatar-link">
            <h2 className="mb-4 text-lg font-semibold">With Link</h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Avatar size="md" alt="With link" imageSrc={sampleImage} href="https://cal.com" />
                <span className="text-xs text-gray-500">Clickable</span>
              </div>
            </div>
          </section>

          {/* With indicator */}
          <section id="avatar-indicator">
            <h2 className="mb-4 text-lg font-semibold">With Indicator</h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Avatar
                  size="md"
                  alt="With indicator"
                  imageSrc={sampleImage}
                  indicator={
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                  }
                />
                <span className="text-xs text-gray-500">With Status Indicator</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
