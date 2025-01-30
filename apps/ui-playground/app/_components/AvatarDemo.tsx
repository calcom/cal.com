"use client";

import { Avatar } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function AvatarDemo() {
  const sizes = ["xs", "xsm", "sm", "md", "mdLg", "lg", "xl"] as const;
  const sampleImage = "https://cal.com/stakeholder/peer.jpg";

  return (
    <DemoSection title="Avatar">
      {/* Size variations */}
      <DemoSubSection id="avatar-sizes" title="Size Variations">
        <div className="flex items-center gap-4">
          {sizes.map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Avatar size={size} alt={`${size} avatar`} imageSrc={sampleImage} />
              <span className="text-subtle text-xs">{size}</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* With and without image */}
      <DemoSubSection id="avatar-images" title="With/Without Image">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Avatar size="md" alt="With image" imageSrc={sampleImage} />
            <span className="text-subtle text-xs">With Image</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Avatar size="md" alt="Without image" imageSrc="https://cal.com/avatar.svg" />
            <span className="text-subtle text-xs">Without Image</span>
          </div>
        </div>
      </DemoSubSection>

      {/* With tooltip */}
      <DemoSubSection id="avatar-tooltip" title="With Tooltip">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <Avatar size="md" alt="With tooltip" imageSrc={sampleImage} title="Hover me!" />
            <span className="text-subtle text-xs">Hover to see tooltip</span>
          </div>
        </div>
      </DemoSubSection>

      {/* With link */}
      <DemoSubSection id="avatar-link" title="With Link">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <Avatar size="md" alt="With link" imageSrc={sampleImage} href="https://cal.com" />
            <span className="text-subtle text-xs">Clickable</span>
          </div>
        </div>
      </DemoSubSection>

      {/* With indicator */}
      <DemoSubSection id="avatar-indicator" title="With Indicator">
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
            <span className="text-subtle text-xs">With Status Indicator</span>
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
