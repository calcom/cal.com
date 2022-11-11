import React from "react";
import { z } from "zod";

import { _EventTypeModel } from "@calcom/prisma/zod";
import { RouterOutputs } from "@calcom/trpc/react";
import { ButtonBaseProps } from "@calcom/ui/Button";
import { ButtonBaseProps as v2ButtonBaseProps } from "@calcom/ui/components/button";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

export interface InstallAppButtonProps {
  render: (
    renderProps:
      | Omit<ButtonBaseProps, "color" | "size"> & {
          /** Tells that the default render component should be used */
          useDefaultComponent?: boolean;
          color?: ButtonBaseProps["color"] & v2ButtonBaseProps["color"];
          size?: ButtonBaseProps["size"] & v2ButtonBaseProps["size"];
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
