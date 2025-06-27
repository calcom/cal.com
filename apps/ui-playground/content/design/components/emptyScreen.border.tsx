"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export const BorderExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-8">
      {/* Without Border */}
      <div>
        <h4 className="text-emphasis mb-4 text-sm font-medium">Without Border</h4>
        <EmptyScreen
          Icon="grid-3x3"
          headline="No apps installed"
          description="Browse available apps in the marketplace"
          buttonText="Browse Apps"
          buttonOnClick={() => alert("Browse Apps clicked")}
          border={false}
        />
      </div>

      {/* With Solid Border */}
      <div>
        <h4 className="text-emphasis mb-4 text-sm font-medium">With Solid Border</h4>
        <EmptyScreen
          Icon="mail"
          headline="No messages"
          description="Your inbox is empty"
          buttonText="Compose"
          buttonOnClick={() => alert("Compose clicked")}
          dashedBorder={false}
        />
      </div>
    </div>
  </RenderComponentWithSnippet>
);
