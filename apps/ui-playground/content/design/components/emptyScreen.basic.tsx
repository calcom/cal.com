"use client";

import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { RenderComponentWithSnippet } from "@/app/components/render";

export const BasicExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <EmptyScreen
      Icon="calendar"
      headline="No upcoming meetings"
      description="Create a meeting to get started"
      buttonText="Create Meeting"
      buttonOnClick={() => alert("Create Meeting clicked")}
    />
  </RenderComponentWithSnippet>
);
