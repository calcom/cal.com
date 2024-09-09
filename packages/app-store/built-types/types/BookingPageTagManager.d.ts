/// <reference types="react" />
import { getEventTypeAppData } from "@calcom/app-store/_utils/getEventTypeAppData";
export declare function handleEvent(event: {
    detail: Record<string, unknown> & {
        type: string;
    };
}): boolean;
export default function BookingPageTagManager({ eventType, }: {
    eventType: Parameters<typeof getEventTypeAppData>[0];
}): JSX.Element;
//# sourceMappingURL=BookingPageTagManager.d.ts.map