import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { type WebhookPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
export declare function handleWebhookTrigger(args: {
    subscriberOptions: GetSubscriberOptions;
    eventTrigger: string;
    webhookData: WebhookPayloadType;
}): Promise<void>;
//# sourceMappingURL=handleWebhookTrigger.d.ts.map