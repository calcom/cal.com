/// <reference types="react" />
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
export type Host = {
    isFixed: boolean;
    userId: number;
    priority: number;
    weight: number;
    weightAdjustment: number;
};
export type CustomInputParsed = typeof customInputSchema._output;
export type EventTypeSetupProps = RouterOutputs["viewer"]["eventTypes"]["get"];
export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];
export declare const EventType: (props: EventTypeSetupProps & {
    allActiveWorkflows?: Workflow[];
}) => JSX.Element;
//# sourceMappingURL=EventType.d.ts.map