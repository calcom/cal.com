import type React from "react";
import type { z } from "zod";

import type { _EventTypeModel } from "@calcom/prisma/zod";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
  installGoogleVideo?: boolean;
};

type AppScript = { attrs?: Record<string, string> } & { src?: string; content?: string };

export type Tag = {
  scripts: AppScript[];
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
