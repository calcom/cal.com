"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Avatar } from "@calcom/ui/components/avatar";

const sampleImage = "https://cal.com/stakeholder/peer.jpg";

export const TooltipExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar size="md" alt="With tooltip" imageSrc={sampleImage} title="Hover me!" />
        <span className="text-subtle text-xs">Hover to see tooltip</span>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
