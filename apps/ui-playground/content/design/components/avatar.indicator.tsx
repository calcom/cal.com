"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Avatar } from "@calcom/ui/components/avatar";

const sampleImage = "https://cal.com/stakeholder/peer.jpg";

export const IndicatorExample: React.FC = () => (
  <RenderComponentWithSnippet>
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
  </RenderComponentWithSnippet>
);
