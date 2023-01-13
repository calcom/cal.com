import React from "react";
import { z } from "zod";

import { _EventTypeModel } from "@calcom/prisma/zod";
import { RouterOutputs } from "@calcom/trpc/react";
import { ButtonProps } from "@calcom/ui";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
  installGoogleVideo?: boolean;
};

export interface InstallAppButtonProps {
  render: (
    renderProps: ButtonProps & {
      /** Tells that the default render component should be used */
      useDefaultComponent?: boolean;
    }
  ) => JSX.Element;
  onChanged?: () => unknown;
}
export type EventTypeAppCardComponentProps = {
  // Limit what data should be accessible to apps
  eventType: Pick<
    z.infer<typeof _EventTypeModel>,
    "id" | "title" | "description" | "teamId" | "length" | "recurringEvent"
  > & {
    URL: string;
  };
  app: RouterOutputs["viewer"]["apps"][number];
};
export type EventTypeAppCardComponent = React.FC<EventTypeAppCardComponentProps>;
