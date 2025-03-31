"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export const CustomIconExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <EmptyScreen
      Icon="user"
      iconClassName="text-emphasis h-12 w-12"
      headline="No team members"
      description="Add team members to collaborate"
      buttonText="Add Members"
      buttonOnClick={() => alert("Add Members clicked")}
    />
  </RenderComponentWithSnippet>
);
