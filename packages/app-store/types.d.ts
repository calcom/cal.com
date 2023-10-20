import type React from "react";
import type { z } from "zod";

import type { RouterOutputs } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
  installGoogleVideo?: boolean;
  teamId?: number;
  returnToOnboarding?: boolean;
};

export type CredentialOwner = {
  name: string | null;
  avatar?: string | null;
  teamId?: number;
  credentialId?: number;
  readOnly?: boolean;
};

export type EventTypeAppCardApp = RouterOutputs["viewer"]["integrations"]["items"][number] & {
  credentialOwner?: CredentialOwner;
  credentialIds?: number[];
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
      isLoading?: boolean;
    }
  ) => JSX.Element;
  onChanged?: () => unknown;
  disableInstall?: boolean;
}
export type EventTypeAppCardComponentProps = {
  // Limit what data should be accessible to apps
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    "id" | "title" | "description" | "teamId" | "length" | "recurringEvent" | "seatsPerTimeSlot" | "team"
  > & {
    URL: string;
  };
  app: EventTypeAppCardApp;
  disabled?: boolean;
  LockedIcon?: JSX.Element | false;
};

export type EventTypeAppSettingsComponentProps = {
  // Limit what data should be accessible to apps\
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    "id" | "title" | "description" | "teamId" | "length" | "recurringEvent" | "seatsPerTimeSlot" | "team"
  > & {
    URL: string;
  };
  getAppData: GetAppData;
  setAppData: SetAppData;
  disabled?: boolean;
  slug: string;
};

export type EventTypeAppCardComponent = React.FC<EventTypeAppCardComponentProps>;

export type EventTypeAppSettingsComponent = React.FC<EventTypeAppSettingsComponentProps>;

export type EventTypeModel = z.infer<typeof EventTypeModel>;
