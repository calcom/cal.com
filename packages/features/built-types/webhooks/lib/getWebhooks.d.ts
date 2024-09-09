import type { PrismaClient } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
export type GetSubscriberOptions = {
    userId?: number | null;
    eventTypeId?: number | null;
    triggerEvent: WebhookTriggerEvents;
    teamId?: number | number[] | null;
    orgId?: number | null;
    oAuthClientId?: string | null;
};
declare const getWebhooks: (options: GetSubscriberOptions, prisma?: PrismaClient) => Promise<{
    id: string;
    secret: string | null;
    appId: string | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
}[]>;
export default getWebhooks;
//# sourceMappingURL=getWebhooks.d.ts.map