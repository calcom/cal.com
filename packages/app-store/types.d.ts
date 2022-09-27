import React from "react";

import { inferQueryOutput } from "@calcom/trpc/react";
import { ButtonBaseProps } from "@calcom/ui/Button";
import { ButtonBaseProps as v2ButtonBaseProps } from "@calcom/ui/v2/core/Button";

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

export type EventTypeAppCardComponent = React.FC<{
  eventType: any;
  app: inferQueryOutput<"viewer.apps">[number];
}>;
