import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CustomRequest } from "../../handleCancelBooking";
declare function cancelAttendeeSeat(req: CustomRequest, dataForWebhooks: {
    webhooks: {
        id: string;
        subscriberUrl: string;
        payloadTemplate: string | null;
        appId: string | null;
        secret: string | null;
    }[];
    evt: CalendarEvent;
    eventTypeInfo: EventTypeInfo;
}, eventTypeMetadata: EventTypeMetadata): Promise<{
    success: boolean;
} | undefined>;
export default cancelAttendeeSeat;
//# sourceMappingURL=cancelAttendeeSeat.d.ts.map