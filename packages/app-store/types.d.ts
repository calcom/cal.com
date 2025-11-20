import type { ConnectedApps } from "_utils/getConnectedApps";
import type React from "react";
import type { z } from "zod";

import type { EventTypeFormMetadataSchema } from "@calcom/prisma/zod-utils";
import type { ButtonProps } from "@calcom/ui/components/button";

export type IntegrationOAuthCallbackState = {
  returnTo?: string;
  onErrorReturnTo: string;
  fromApp: boolean;
  installGoogleVideo?: boolean;
  teamId?: number;
  defaultInstall?: boolean;
};

export type CredentialOwner = {
  name: string | null;
  avatar?: string | null;
  teamId?: number;
  credentialId?: number;
  readOnly?: boolean;
};

export type AppCardApp = ConnectedApps[number] & {
  credentialOwner?: CredentialOwner;
};

export type EventTypeAppCardApp = AppCardApp & {
  credentialIds?: number[];
};

type AppScript = { attrs?: Record<string, string> } & { src?: string; content?: string };

export type Tag = {
  scripts: AppScript[];
  pushEventScript?: AppScript;
};

export interface InstallAppButtonProps {
  render: (
    renderProps: ButtonProps & {
      /** Tells that the default render component should be used */
      useDefaultComponent?: boolean;
      isPending?: boolean;
    }
  ) => JSX.Element;
  onChanged?: () => unknown;
  disableInstall?: boolean;
}
export type EventTypeAppCardComponentProps = {
  // Limit what data should be accessible to apps
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    | "id"
    | "title"
    | "description"
    | "teamId"
    | "length"
    | "recurringEvent"
    | "seatsPerTimeSlot"
    | "team"
    | "schedulingType"
  > & {
    URL: string;
  };
  app: EventTypeAppCardApp;
  onAppInstallSuccess: () => void;
  disabled?: boolean;
  LockedIcon?: JSX.Element | false;
  eventTypeFormMetadata?: z.infer<typeof EventTypeFormMetadataSchema>;
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
