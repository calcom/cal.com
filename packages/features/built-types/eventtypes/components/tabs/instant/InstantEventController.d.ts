/// <reference types="react" />
import type { EventTypeSetup } from "@calcom/features/eventtypes/lib/types";
type InstantEventControllerProps = {
    eventType: EventTypeSetup;
    paymentEnabled: boolean;
    isTeamEvent: boolean;
};
export default function InstantEventController({ eventType, paymentEnabled, isTeamEvent, }: InstantEventControllerProps): JSX.Element;
export {};
//# sourceMappingURL=InstantEventController.d.ts.map