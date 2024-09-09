/// <reference types="react" />
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
type WebhookProps = {
    id: string;
    userId: number | null;
    teamId: number | null;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: WebhookTriggerEvents[];
    secret: string | null;
    platform: boolean;
};
export declare function EditWebhookView({ webhook }: {
    webhook?: WebhookProps;
}): JSX.Element;
export default EditWebhookView;
//# sourceMappingURL=webhook-edit-view.d.ts.map