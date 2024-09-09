/// <reference types="react" />
import type z from "zod";
import type { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { EventTypeAppCardComponentProps, CredentialOwner } from "../types";
export declare const EventTypeAppCard: (props: {
    app: RouterOutputs["viewer"]["integrations"]["items"][number] & {
        credentialOwner?: CredentialOwner;
    };
    eventType: EventTypeAppCardComponentProps["eventType"];
    getAppData: GetAppData;
    setAppData: SetAppData;
    LockedIcon?: false | JSX.Element | undefined;
    eventTypeFormMetadata: z.infer<typeof EventTypeMetaDataSchema>;
    disabled?: boolean | undefined;
}) => JSX.Element;
//# sourceMappingURL=EventTypeAppCardInterface.d.ts.map