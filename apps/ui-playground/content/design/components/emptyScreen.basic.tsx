"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { EmptyScreen } from "@calcom/ui/components/empty-screen";

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
