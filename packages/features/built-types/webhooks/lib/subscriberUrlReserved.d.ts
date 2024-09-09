import type { Webhook } from "@calcom/prisma/client";
interface Params {
    subscriberUrl: string;
    id?: string;
    webhooks?: Webhook[];
    teamId?: number;
    userId?: number;
    eventTypeId?: number;
    platform?: boolean;
}
export declare const subscriberUrlReserved: ({ subscriberUrl, id, webhooks, teamId, userId, eventTypeId, platform, }: Params) => boolean;
export {};
//# sourceMappingURL=subscriberUrlReserved.d.ts.map