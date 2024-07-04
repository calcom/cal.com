import type { z } from "zod";

import type { EventTypeFormMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";

export type EventTypeAppCardApp = RouterOutputs["viewer"]["integrations"]["items"][number] & {
  credentialOwner?: CredentialOwner;
  credentialIds?: number[];
};

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

export type EventTypeApps = NonNullable<NonNullable<z.infer<typeof EventTypeMetaDataSchema>>["apps"]>;

export type EventTypeAppsList = keyof EventTypeApps;
