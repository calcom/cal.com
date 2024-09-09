/// <reference types="react" />
import type { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
export type EventType = Pick<EventTypeSetupProps, "eventType">["eventType"] & EventTypeAppCardComponentProps["eventType"];
export declare const EventAppsTab: ({ eventType }: {
    eventType: EventType;
}) => JSX.Element;
//# sourceMappingURL=EventAppsTab.d.ts.map