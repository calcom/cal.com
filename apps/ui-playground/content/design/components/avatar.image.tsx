"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Avatar } from "@calcom/ui/components/avatar";

const sampleImage = "https://cal.com/stakeholder/peer.jpg";

export const ImageExample: React.FC = () => (
  <RenderComponentWithSnippet>
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
  </RenderComponentWithSnippet>
);
