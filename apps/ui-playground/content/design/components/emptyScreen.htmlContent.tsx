"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export const HtmlContentExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <EmptyScreen
      Icon="info"
      headline={
        <span className="text-emphasis">
          Custom Headline with <strong>HTML</strong>
        </span>
      }
      description={
        <div className="text-subtle space-y-2">
          <p>This is a custom description with multiple paragraphs.</p>
          <p>
            You can include <em>any HTML content</em> here.
          </p>
        </div>
      }
      buttonText="Learn More"
      buttonOnClick={() => alert("Learn More clicked")}
    />
  </RenderComponentWithSnippet>
);
