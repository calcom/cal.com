"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Avatar } from "@calcom/ui/components/avatar";

const sampleImage = "https://cal.com/stakeholder/peer.jpg";

export const LinkExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar size="md" alt="With link" imageSrc={sampleImage} href="https://cal.com" />
        <span className="text-subtle text-xs">Clickable</span>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
