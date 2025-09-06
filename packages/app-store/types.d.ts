import type React from "react";
import type { z } from "zod";

import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { ButtonProps } from "@calcom/ui/components/button";

import type { GetAppData, SetAppData } from "./EventTypeAppContext";

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

/**
 * Domain-specific app type derived from the actual business logic return type
 * This ensures we have all the properties that the backend actually returns
 */
export type AppCardApp = ConnectedApps[number];

/**
 * For event type app cards, we use the same type since it includes all necessary properties
 */
export type EventTypeAppCardApp = AppCardApp;

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
/**
 * Domain-specific EventType interface for apps - independent of Prisma models
 */
export type AppEventType = {
  id: number;
  title: string;
  description?: string;
  teamId?: number;
  length: number;
  recurringEvent?: any; // Keep as any since this is JSON
  seatsPerTimeSlot?: number;
  team?: {
    id: number;
    name?: string;
  };
  schedulingType?: string;
  URL: string;
};

export type EventTypeAppCardComponentProps = {
  // Limit what data should be accessible to apps
  eventType: AppEventType;
  app: EventTypeAppCardApp;
  disabled?: boolean;
  LockedIcon?: JSX.Element | false;
  eventTypeFormMetadata?: z.infer<typeof EventTypeMetaDataSchema>;
};

export type EventTypeAppSettingsComponentProps = {
  // Limit what data should be accessible to apps
  eventType: AppEventType;
  getAppData: GetAppData;
  setAppData: SetAppData;
  disabled?: boolean;
  slug: string;
};

export type EventTypeAppCardComponent = React.FC<EventTypeAppCardComponentProps>;

export type EventTypeAppSettingsComponent = React.FC<EventTypeAppSettingsComponentProps>;
